/**
 * SQLite column type helpers.
 *
 * SQLite lacks native JSON and timestamp types, so we use `simple-json`
 * (JSON.stringify stored as TEXT) and `text` with DateTransformer.
 */

/**
 * Returns 'simple-json', the SQLite column type for JSON data.
 */
export const jsonColumnType = (): 'simple-json' => 'simple-json';

/**
 * Returns 'text', the SQLite column type for timestamps.
 * Use with DateTransformer for SQLite compatibility.
 */
export const dateColumnType = (): 'text' => 'text';
