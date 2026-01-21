import { browser } from 'k6/browser';
import {aaft_create_result, aaft_get_client_data} from './includes/global.js';

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
/*
function log(result, code, message) {
	result.logs.push({ code: code, message: message });
	console.log(`[${code}] ${message}`);
}
*/

export default async function () {

	// Get settings provided by the A+A Feature Tests plugin
	let s = aaft_get_client_data();

	const settings = {
		// Required
		test_id:         s.test_id         ?? null,
		step_id:         s.step_id         ?? null,
		step_class_name: s.step_class_name ?? null,
		callback:        s.callback        ?? null,
		script:          s.script          ?? null,

		// Test-Specific
		target_url:      s.target_url      ?? null,
		expected_text:   s.expected_text   ?? null,
	};

	// Prepare the result to be returned back to the A+A Feature Tests plugin
	const result = aaft_create_result( settings );

	// Start browser interaction
	const page = await browser.newPage();

	try {

		// Go to the contact form page URL
		try {
			result.addLog('info', `Navigating to ${settings.target_url}`);
			await page.goto(settings.target_url, { waitUntil: 'networkidle' });
		} catch {
			throw new Error(`Failed to navigate to ${settings.target_url}`);
		}

		// Wait until the form elements are available
		try {
			await page.locator('#input_1_1').waitFor({ timeout: 5000 });
			await page.locator('#input_1_3').waitFor({ timeout: 5000 });
			await page.locator('#input_1_4').waitFor({ timeout: 5000 });
			result.addLog('info', 'All form fields found');
		} catch {
			throw new Error('One or more form fields not found on the page');
		}

		// Fill out the form fields
		try {
			await page.locator('#input_1_1').fill('Test User');
			await page.locator('#input_1_3').fill('test@example.com');
			await page.locator('#input_1_4').fill('Hello');
			result.addLog('info', 'Form filled');
		} catch {
			throw new Error('Failed to fill out the form fields');
		}

		// Submit the form
		let outcome;

		try {
			await page.locator('#gform_submit_button_1').click();
			result.addLog('info', 'Submit button clicked');

			// Wait for confirmation, or capture validation error
			outcome = await Promise.race([
				page.waitForSelector('.gform_confirmation_message', { timeout: 10000 })
					.then(() => 'confirmation'),

				page.waitForSelector('.gform_validation_errors', { timeout: 10000 })
					.then(() => 'validation_error'),
			]);
		} catch {
			throw new Error('Form submission failed or no response received (Confirmation message and validation error were not found)');
		}

		// Handle the outcome
		let ok = false;

		switch( outcome ) {
			case 'validation_error':
				result.setStatus('failed');
				const errorsText = await page.locator('.gform_validation_errors').innerText();
				result.addLog('validation_error', 'A validation error occurred: ' + errorsText);
				break;

			case 'confirmation':
				result.addLog('info', 'Form submitted successfully');

				// Check for expected confirmation text
				const text = await page.locator('body').innerText();
				ok = text.includes( settings.expected_text );

				// Record the assertion result
				result.addAssertion( ok, 'Expected confirmation text found' );

				// Log whether the expected text was found
				if ( ok ) {
					result.addLog('info', `Expected text found in gform confirmation`);
				}else{
					result.addLog('error', `Expected was NOT found in the gform confirmation`);
				}

				// Mark step as failed if assertion did not pass
				if ( ! ok ) result.setStatus('failed');
				break;

			default:
				result.setStatus('failed');
				result.addLog('error', 'Unknown outcome after form submission: ' + outcome);
				break;
		}

	} catch (e) {

		// Handle any errors during the test execution
		result.setStatus('failed');

		result.addLog('error', e.message ?? 'An undefined error was thrown');

	} finally {

		// Close the browser page
		await page.close();

	}

	// Send results back to A+A Feature Tests plugin via callback URL
	result.complete();

}
