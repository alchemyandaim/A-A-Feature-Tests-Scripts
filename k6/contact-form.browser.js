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
		await page.goto(__ENV.TARGET_URL, { waitUntil: 'networkidle' });

		await page.locator(__ENV.NAME_SELECTOR).fill('Test User');
		await page.locator(__ENV.EMAIL_SELECTOR).fill('test@example.com');
		await page.locator(__ENV.MESSAGE_SELECTOR).fill('Hello');

		await Promise.all([
			page.waitForNavigation(),
			page.locator(__ENV.SUBMIT_SELECTOR).click(),
		]);

		const text = await page.locator('body').innerText();
		const ok = text.includes(__ENV.EXPECTED_TEXT);

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
				'X-AAFT-Token': __ENV.AAFT_TOKEN,
			},
		}
	);
}
