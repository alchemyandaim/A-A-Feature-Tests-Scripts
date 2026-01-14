import encoding from 'k6/encoding';

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
	if ( raw.startsWith('"') && raw.endsWith('"') ) {
		raw = raw.slice(1, -1);
	}

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