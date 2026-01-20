import encoding from 'k6/encoding';

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
 * @returns {{test_id, step_id, step_class_name, status: string, assertions: *[], logs: *[]}}
 */
export function aaft_get_result_object( settings ) {
	return {
		test_id: settings.test_id,
		step_id: settings.step_id,
		step_class_name: settings.step_class_name,
		status: 'passed',
		assertions: [],
		logs: [],
	};
}