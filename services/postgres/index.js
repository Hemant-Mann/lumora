import createPostgresClient from './client.js';
import _ from 'lodash';
import knex from 'knex';

/** @type {Map<string, import('knex').Knex>} */
let defConnMap = new Map();

/**
 * Get or create a Postgres connection (knex instance)
 * @param {string} name - Connection name
 * @param {Object} opts - Connection options
 * @param {string} opts.postgresUri - PostgreSQL connection URI
 * @returns {import('knex').Knex}
 */
export const getConn = (name, opts = {}) => {
	if (_.isEmpty(name)) {
		throw new Error('Postgres connection name cannot be empty');
	}
	
	let conn = defConnMap.get(name);
	if (!conn) {
		conn = knex({
			client: 'pg',
			connection: opts.postgresUri,
			pool: {
				min: 0,
				max: 20,
			},
			acquireConnectionTimeout: 10000,
			useNullAsDefault: true
		});
		defConnMap.set(name, conn);
	}
  	return conn;
}

/**
 * Create a Postgres client with the default connection
 * @param {string} name - Name of the connection
 * @param {import('./types').DatabaseConfig} opts - Database configuration
 * @returns {import('./types').PostgresClient}
 */
export const makePostgres = (name, opts = {}) => {
	const conn = getConn(name, opts);
	return createPostgresClient(conn)
}

/**
 * Disconnect from Postgres
 * @param {string} name - Name of the connection
 */
export const disconnectPostgres = async (name) => {
	const conn = defConnMap.get(name);
	
	if (conn) {
		await conn.destroy();
		defConnMap.delete(name);
	}
}
