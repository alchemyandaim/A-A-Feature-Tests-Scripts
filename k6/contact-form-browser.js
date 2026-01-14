import { browser } from 'k6/browser';
import http from 'k6/http';

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
	cloud: {
		projectID: __ENV.K6_CLOUD_PROJECT_ID,
	},
	env: {
		AAFT_TEST_ID: __ENV.AAFT_TEST_ID,
		AAFT_STEP_ID: __ENV.AAFT_STEP_ID,
		AAFT_STEP_CLASS_NAME: __ENV.AAFT_STEP_CLASS_NAME,
		AAFT_CALLBACK: __ENV.AAFT_CALLBACK,
		AAFT_SECRET_TOKEN: __ENV.AAFT_SECRET_TOKEN,
		TARGET_URL: __ENV.TARGET_URL,
		EXPECTED_TEXT: __ENV.EXPECTED_TEXT,
	},
};

export default async function () {

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
