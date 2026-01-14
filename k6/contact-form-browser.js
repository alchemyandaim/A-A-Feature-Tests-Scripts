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

// Log a message to the result logs
function log(result, code, message) {
	result.logs.push({ code: code, message: message });
	console.log(`[${code}] ${message}`);
}

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
		log(result, 'info', `Navigating to ${settings.target_url}`);
		await page.goto( settings.target_url, { waitUntil: 'networkidle' });

		// Wait until the form elements are available
		await page.locator('#input_1_1').waitFor({ timeout: 5000 });
		await page.locator('#input_1_3').waitFor({ timeout: 5000 });
		await page.locator('#input_1_4').waitFor({ timeout: 5000 });
		log(result, 'info', 'All form fields found');

		// Fill out the form fields
		await page.locator('#input_1_1').fill('Test User');
		await page.locator('#input_1_3').fill('test@example.com');
		await page.locator('#input_1_4').fill('Hello');
		log(result, 'info', 'Form filled');

		// Submit the form
		await page.locator('#gform_submit_button_1').click();
		log(result, 'info', 'Submit button clicked');

		// Wait for confirmation
		await page.waitForSelector('.gform_confirmation_message', { timeout: 10000 });
		log(result, 'info', 'Confirmation message appeared');

		/*
		await Promise.all([
			page.waitForNavigation(),
			page.locator('#gform_submit_button_1').click(),
		]);
		*/

		// Check for expected confirmation text
		const text = await page.locator('body').innerText();
		const ok = text.includes( settings.expected_text );

		// Record the assertion result
		result.assertions.push({
			name: 'Expected confirmation text found',
			passed: ok,
		});

		if ( ok ) {
			log(result, 'info', `Expected text found in gform confirmation`);
		}else{
			log(result, 'error', `Expected was NOT found in the gform confirmation`);
		}

		// Mark step as failed if assertion did not pass
		if ( ! ok ) result.status = 'failed';

	} catch (e) {

		// Handle any errors during the test execution
		result.status = 'failed';
		log(result, 'error', e.message);
		log(result, 'error (as json)', JSON.stringify(e));

	} finally {

		// Close the browser page
		await page.close();

	}

	// Send results back to A+A Feature Tests plugin via callback URL
	if ( settings.callback ) {
		log(result, 'info', `Sending results to callback URL ${settings.callback} with AAFT token: ${__ENV.AAFT_SECRET_TOKEN}`);

		const response = http.post(
			settings.callback,
			JSON.stringify(result),
			{
				headers: {
					'Content-Type': 'application/json',
					'X-AAFT-Token': __ENV.AAFT_SECRET_TOKEN,
				},
			}
		);

		log(result,
			response.status === 200 ? 'info' : 'error',
			`Callback response status code: ${response.status} and body: ${response.body}`);
	}
}
