import { browser } from 'k6/browser';
import http from 'k6/http';
import encoding from 'k6/encoding';

export const options = {
	scenarios: {
		ui: {
			executor: 'shared-iterations',
			iterations: 1,
			options: {
				browser: { type: 'chromium' },
			},
		},
	},
	/*
	cloud: {
		projectID: __ENV.K6_CLOUD_PROJECT_ID,
	}
	*/
};

export default async function () {

	console.log('- Debug env variables (All) -', JSON.stringify(__ENV));

	let provided_data = __ENV.AAFT_DATA ?? false;
	console.log('- Raw data -', provided_data);

	if ( provided_data ) {
		// provided_data is base64 encoded JSON string, decode it
		let decoded_data = '';
		try {

			// 1. Decode base64 to JSON string
			// Attempt 1 (failed): atob is not defined in Grafana k6, use encoding module instead
			// -- decoded_data = atob(provided_data);

			// Attempt 2: using k6 encoding module
			decoded_data = encoding.b64decode( provided_data, 'std', 's' );
			console.log('- Decoded data -', decoded_data);

			// 2. Parse JSON string to object
			let data_obj = JSON.parse(decoded_data);
			console.log('- Parsed data object -', data_obj);

			// Now you can access individual properties
			console.log('- TARGET_URL from data object -', data_obj.TARGET_URL ?? null);
			console.log('- EXPECTED_TEXT from data object -', data_obj.EXPECTED_TEXT ?? null);

		} catch (e) {
			console.log('- Error decoding or parsing data -', e.message);
		}
	}else {
		console.log('- Raw data was invalid -' );
	}

	/** @TODO: Why are these variables not available in the Environment tab in k6 Cloud UI?
	 *
	 * 🚨 time="2026-01-14T00:45:43Z" level=info msg="- Debug Environment Variables -
	 * {\"AAFT_CALLBACK\":null,\"AAFT_SECRET_TOKEN\":null,\"AAFT_STEP_CLASS_NAME\":null,\"AAFT_STEP_ID\":null,
	 *  \"AAFT_TEST_ID\":null,\"EXPECTED_TEXT\":null,\"TARGET_URL\":null}"
	 * */
	/*
	console.log('- Debug Environment Variables -', {
		AAFT_TEST_ID: __ENV.AAFT_TEST_ID,
		AAFT_STEP_ID: __ENV.AAFT_STEP_ID,
		AAFT_STEP_CLASS_NAME: __ENV.AAFT_STEP_CLASS_NAME,
		AAFT_CALLBACK: __ENV.AAFT_CALLBACK,
		AAFT_SECRET_TOKEN: __ENV.AAFT_SECRET_TOKEN,
		TARGET_URL: __ENV.TARGET_URL,
		EXPECTED_TEXT: __ENV.EXPECTED_TEXT,
	});
	*/

	const result = {
		test_id: __ENV.AAFT_TEST_ID,
		step_id: __ENV.AAFT_STEP_ID,
		step_class_name: __ENV.AAFT_STEP_CLASS_NAME,
		status: 'passed',
		assertions: [],
		logs: [],
	};

	const page = await browser.newPage();

	try {
		await page.goto( __ENV.TARGET_URL, { waitUntil: 'networkidle' });

		await page.locator('#input_1_1').fill('Test User');
		await page.locator('#input_1_3').fill('test@example.com');
		await page.locator('#input_1_4').fill('Hello');

		await Promise.all([
			page.waitForNavigation(),
			page.locator('#gform_submit_button_1').click(),
		]);

		const text = await page.locator('body').innerText();
		const ok = text.includes( __ENV.EXPECTED_TEXT );

		result.assertions.push({
			name: 'Expected confirmation text found',
			passed: ok,
		});

		if ( ! ok ) {
			result.status = 'failed';
		}

	} catch (e) {
		result.status = 'failed';
		result.logs.push({ level: 'error', message: e.message });
	} finally {
		await page.close();
	}

	http.post(
		__ENV.AAFT_CALLBACK,
		JSON.stringify(result),
		{
			headers: {
				'Content-Type': 'application/json',
				'X-AAFT-Token': __ENV.AAFT_SECRET_TOKEN,
			},
		}
	);
}
