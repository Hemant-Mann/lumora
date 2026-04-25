/**
 * Utilities for converting MongoDB ObjectID hex strings to/from BYTEA (Buffer)
 * for PostgreSQL storage optimization.
 *
 * Usage:
 *
 *   // Before PG insert: convert hex string fields to Buffer
 *   toByteaFields(convObj, ['field1', 'field2', 'field3']);
 *
 *   // After PG read: convert Buffer fields back to hex strings
 *   fromByteaFields(row, ['field1', 'field2', 'field3']);
 */

/**
 * Convert a 24-char hex string to a 12-byte Buffer for BYTEA storage.
 * Returns null for invalid/missing input.
 * @param {any} val
 * @returns {Buffer|null}
 */
export const hexToBuffer = (val) => {
	if (Buffer.isBuffer(val)) return val;
	const str = typeof val === 'object' && val !== null ? String(val) : val;
	if (typeof str !== 'string' || str.length !== 24) return null;
	return Buffer.from(str, 'hex');
};

/**
 * Convert a Buffer (BYTEA) back to a 24-char hex string.
 * Returns the original value if not a Buffer.
 * @param {any} val
 * @returns {string|null}
 */
export const bufferToHex = (val) => {
	if (Buffer.isBuffer(val)) return val.toString('hex');
	if (typeof val === 'string') return val;
	return null;
};

/**
 * Convert hex string fields to Buffer in-place on an object (before PG insert).
 * Skips fields that are null/undefined.
 * @param {Object} obj
 * @param {string[]} fields
 * @returns {Object} the same object (mutated)
 */
export const toByteaFields = (obj, fields) => {
	for (const f of fields) {
		if (obj[f] != null) {
			obj[f] = hexToBuffer(obj[f]);
		}
	}
	return obj;
};

/**
 * Convert Buffer fields to hex strings in-place on an object (after PG read).
 * Skips fields that are null/undefined.
 * @param {Object} obj
 * @param {string[]} fields
 * @returns {Object} the same object (mutated)
 */
export const fromByteaFields = (obj, fields) => {
	if (!obj) return obj;
	for (const f of fields) {
		if (obj[f] != null) {
			obj[f] = bufferToHex(obj[f]);
		}
	}
	return obj;
};
