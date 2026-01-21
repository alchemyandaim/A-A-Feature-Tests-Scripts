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
 * Creates a result object for tracking test step results and sending them to a callback URL.
 * @param settings
 * @returns {{
 *     getStatus(): string,
 *     setStatus: setStatus,
 *     addAssertion( passed, name ): void,
 *     addLog( code, message ): void,
 *     complete( {payload?: {}, headers?: {}} ): void
 * }}
 */
export function aaft_create_result(settings) {

	// ─────────────────────────────
	// Private state (NOT exposed)
	// ─────────────────────────────
	let data = {
		// Identification
		test_id: settings.test_id,
		step_id: settings.step_id,
		step_class_name: settings.step_class_name,

		// Result data
		status: 'passed',
		assertions: [],
		logs: [],

		// GitHub data (from workflow .yml file)
		github: {
			run_id:     __ENV.AAFT_GITHUB_RUN_ID   || '',
			run_url:    __ENV.AAFT_GITHUB_RUN_URL  || '',
			workflow:   __ENV.AAFT_GITHUB_WORKFLOW || '',
			repository: __ENV.AAFT_GITHUB_REPO     || '',
		},
	};

	const callbackUrl = settings.callback;

	const allowedStatuses = [
		'pending',
		'running',
		'passed',
		'failed',
		'skipped',
	];

	// ─────────────────────────────
	// Private helpers
	// ─────────────────────────────
	function log(code, message) {
		data.logs.push({ code, message });
		console.log(`[${code}] ${message}`);
	}

	function fail(reason) {
		setStatus('failed');
		log('error', reason);
	}

	function setStatus(status) {
		if (!allowedStatuses.includes(status)) {
			fail( `Invalid result status "${status}". Allowed: ${allowedStatuses.join(', ')}` );
			return;
		}
		data.status = status;
	}

	// ─────────────────────────────
	// Public API (returned object)
	// ─────────────────────────────
	return {

		/* ---------- getters ---------- */
		getStatus() {
			return data.status;
		},

		/* ---------- mutators ---------- */
		setStatus,

		addAssertion(passed, name) {
			data.assertions.push({ passed, name });
			if (!passed) {
				setStatus('failed');
			}
		},

		addLog(code, message) {
			log(code, message);
		},

		/* ---------- lifecycle ---------- */
		complete({ payload = {}, headers = {}} = {}) {
			if ( ! callbackUrl ) {
				fail('No callback URL provided');
				return;
			}

			const token = aaft_strip_quotes(
				(__ENV.AAFT_SECRET_TOKEN ?? '').trim()
			);

			// Merge extra payload data
			const finalData = {
				...data,
				...payload,
			};

			// Build callback URL with optional query params
			let url = callbackUrl;

			// @todo: Consider allowing query params in future. If so, add "query={}" parameter to complete()
			/*
			const queryString = Object.keys(query).length
				? '?' + Object.entries(query)
				.map(([k, v]) =>
					`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
				)
				.join('&')
				: '';

			url += queryString;
			*/

			log( 'debug', `Final result data: ${JSON.stringify(finalData)}` );

			log('info', 'Sending results to callback');
			log('debug', `Callback URL: ${url}`);

			try {
				const res = http.post(
					url,
					JSON.stringify(finalData),
					{
						headers: {
							'Content-Type': 'application/json',
							'X-AAFT-Token': token,
							...headers,
						},
					}
				);

				log( res.status === 200 ? 'info' : 'warning', `Callback response ${res.status}` );
			} catch {
				fail('Callback request threw an exception');
			}
		}

	};
}
