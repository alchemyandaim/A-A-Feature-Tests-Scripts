import { browser } from 'k6/browser';
import http from 'k6/http';
import { aaft_get_client_data } from './includes/global.js';

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

	// Get settings provided by the A+A Feature Tests plugin
	let s = aaft_get_client_data();

	const settings = {
		test_id:         s.test_id         ?? null,
		step_id:         s.step_id         ?? null,
		step_class_name: s.step_class_name ?? null,
		callback:        s.callback        ?? null,
		script:          s.script          ?? null,
		target_url:      s.target_url      ?? null,
		expected_text:   s.expected_text   ?? null,
	};

	// Prepare the result to be returned back to the A+A Feature Tests plugin
	const result = {
		test_id: settings.test_id,
		step_id: settings.step_id,
		step_class_name: settings.step_class_name,
		status: 'passed',
		assertions: [],
		logs: [],
	};

	// Start browser interaction
	const page = await browser.newPage();

	try {
		// Go to the contact form page URL
		await page.goto( settings.target_url, { waitUntil: 'networkidle' });

		// Fill out and submit the contact form
		await page.locator('#input_1_1').fill('Test User');
		await page.locator('#input_1_3').fill('test@example.com');
		await page.locator('#input_1_4').fill('Hello');

		await Promise.all([
			page.waitForNavigation(),
			page.locator('#gform_submit_button_1').click(),
		]);

		// Check for expected confirmation text
		const text = await page.locator('body').innerText();
		const ok = text.includes( settings.expected_text );

		// Record the assertion result
		result.assertions.push({
			name: 'Expected confirmation text found',
			passed: ok,
		});

		// Mark step as failed if assertion did not pass
		if ( ! ok ) result.status = 'failed';

	} catch (e) {

		// Handle any errors during the test execution
		result.status = 'failed';
		result.logs.push({ level: 'error', message: e.message });

	} finally {

		// Close the browser page
		await page.close();

	}

	// Send results back to A+A Feature Tests plugin via callback URL
	if ( settings.callback ) {
		http.post( settings.callback, JSON.stringify(result), {
			headers: {
				'Content-Type': 'application/json',
				'X-AAFT-Token': __ENV.AAFT_SECRET_TOKEN,
			},
		});
	}
}
