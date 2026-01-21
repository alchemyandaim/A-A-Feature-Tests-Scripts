import encoding from 'k6/encoding';
import http from 'k6/http';

/**
 * Strips wrapping double quotes from a string, if present.
 *
 * @param str
 * @returns {*}
 */
export function aaft_strip_quotes( str ) {
	if ( str.startsWith('"') && str.endsWith('"') ) {
		return str.slice(1, -1);
	}
	return str;
}

/**
 * Returns an object containing parameters passed to the test via `client_payload.data`, which is a base64-encoded JSON string stored in the `AAFT_DATA` environment variable.
 *
 * @returns {*}
 */
export function aaft_get_client_data() {
	if ( !__ENV.AAFT_DATA ) {
		throw new Error('AAFT_DATA environment variable is missing');
	}

	let raw = __ENV.AAFT_DATA;

	// Remove wrapping quotes if present (otherwise will break decoding)
	raw = aaft_strip_quotes( raw );

	// Decode base64 to JSON string
	let decoded;
	try {
		decoded = encoding.b64decode(raw, 'std', 's');
	} catch ( e ) {
		throw new Error('Failed to base64 decode AAFT_DATA: ' + e.message);
	}

	// Parse JSON string to object
	let obj;
	try {
		obj = JSON.parse(decoded);
	} catch ( e ) {
		throw new Error('Failed to parse AAFT_DATA JSON: ' + e.message);
	}

	return obj;
}

/**
 * Get a result object template, which may be modified before being returned to the server
 *
 * @param settings
 * @returns {{
 *     data: {
 *        test_id: int,
 *        step_id: int,
 *        step_class_name: string,
 *        status: string,
 *        assertions: *[{passed, name}],
 *        logs: *[{code, message}],
 *     },
 *     _internal: {
 *         callback: string
 *     },
 *     set_status: (function(status): void),
 *     add_assertion: (function(name, passed): void),
 *     add_log: (function(code, message): void),
 *     get_callback_data: (function(): {test_id, step_id, step_class_name, status: string, assertions: *[], logs: *[]}),
 *     complete_test: (function( {} ): void)
 *  }}
 */
export function aaft_get_result_object( settings ) {
	return new function() {
		let result = this;

		// Data (returned in callback)
		result.data = {
			test_id: settings.test_id,
			step_id: settings.step_id,
			step_class_name: settings.step_class_name,
			status: 'passed',
			assertions: [],
			logs: [],
		};

		// Internal data
		result._internal = {
			callback: settings.callback,
		};

		// Functions
		result.set_status = function( status ) {
			// Check if the status is allowed. If not, log an error
			const allowed_statuses = [ 'pending', 'running', 'passed', 'failed', 'skipped' ];

			if ( ! allowed_statuses.includes( status ) ) {
				result.add_log('error', `Invalid result status set: "${status}". Allowed statuses are: ${allowed_statuses.join(', ')}`);
			}else{
				result.data.status = status;
			}
		};

		result.add_assertion = function( passed, name ) {
			result.data.assertions.push({ passed: passed, name: name });

			if ( ! passed ) {
				result.set_status('failed');
			}
		};

		result.add_log = function( code, message ) {
			result.data.logs.push({ code: code, message: message });
			console.log(`[${code}] ${message}`);
		};

		result.get_callback_data = function() {
			return result.data;
		};

		result.complete_test = function( additional_data = {} ) {
			// Validate callback URL
			let callback_url = result._internal.callback;

			if ( ! callback_url ) {
				result.add_log('error', 'No callback URL provided, cannot complete test');
				return;
			}else {
				result.add_log('info', `Sending results to callback URL`);
			}

			// Merge any additional data into the results
			if ( Object.keys( additional_data ).length > 0 ) {
				result.data = { ...result.data, ...additional_data };
			}

			// Get the secret token from environment variable
			const AAFT_SECRET_TOKEN = aaft_strip_quotes( __ENV.AAFT_SECRET_TOKEN ?? '' );

			let callback_data = JSON.stringify( result.get_callback_data() );

			let callback_args = {
				headers: {
					'Content-Type': 'application/json',
					'X-AAFT-Token': AAFT_SECRET_TOKEN,
				},
			};

			try {
				result.add_log('info', `Callback url: ${callback_url}`);
				result.add_log('info', `Callback data: ${callback_data}`);
				result.add_log('info', `Callback args: ${JSON.stringify(callback_args)}`);

				// Perform the callback HTTP POST request
				const response = http.post(
					callback_url,
					callback_data,
					callback_args
				);

				result.add_log(response.status === 200 ? 'info' : 'warning', `Callback response status code: ${response.status} and body: ${response.body}`);
			} catch {
				result.add_log('error', 'Failed to send results to callback URL');
			}
		};

		return result;
	}
}