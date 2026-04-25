import { Storage } from '@google-cloud/storage'
import { S3Client } from '@aws-sdk/client-s3'
import { createBucketClient } from './client.js'
import { createS3BucketClient } from './s3client.js'
import _ from 'lodash'

/** @type {Map<string, import('./types.js').BucketClient>} */
let defClientMap = new Map()

/** @type {Map<string, import('./types.js').BucketClient>} */
let defS3ClientMap = new Map()

/**
 * Create an S3 compatible client instance (internal)
 * @param {Object} opts
 * @param {string} opts.endpoint - S3/R2 endpoint URL
 * @param {string} opts.accessKeyId - Access key id
 * @param {string} opts.secretAccessKey - Secret access key
 * @param {string} opts.region - Bucket region
 * @returns {import('@aws-sdk/client-s3').S3Client}
 */
const makeS3Client = ({ endpoint, accessKeyId, secretAccessKey, region }) => {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('accessKeyId and secretAccessKey are required for S3 client')
  }
  if (!region) {
    throw new Error('region is required for S3 client')
  }

  const clientConfig = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  }

  if (endpoint) {
    clientConfig.endpoint = endpoint
    clientConfig.forcePathStyle = true
  }

  return new S3Client(clientConfig)
}

/**
 * Return a GCP Bucket client
 * @param {string} name - Connection name
 * @param {Object} opts
 * @param {string} [opts.keyFilename] - Path to GCP service account key file
 * @param {string} [opts.credentials] - GCP service account credentials JSON string
 * @param {string} [opts.projectId] - GCP project ID
 * @returns {import('./types.js').BucketClient}
 */
export const makeBucket = (name, opts = {}) => {
  if (_.isEmpty(name)) {
    throw new Error('Bucket connection name cannot be empty')
  }

  let client = defClientMap.get(name)
  if (client) {
    return client
  }

  const { keyFilename, credentials, projectId } = opts

  if (!keyFilename && !credentials) {
    throw new Error('keyFilename or credentials is required for GCP bucket client')
  }

  const storageOptions = {}
  if (keyFilename) {
    storageOptions.keyFilename = keyFilename
  } else if (credentials) {
    try {
      storageOptions.credentials = JSON.parse(credentials)
    } catch (e) {
      throw new Error('credentials must be valid JSON')
    }
  }

  if (projectId) {
    storageOptions.projectId = projectId
  }

  const storage = new Storage(storageOptions)
  client = createBucketClient(storage)
  defClientMap.set(name, client)
  return client
}

/**
 * Return an S3 compatible Bucket client (Cloudflare R2, MinIO, AWS S3)
 * @param {string} name - Connection name
 * @param {Object} opts
 * @param {string} opts.endpoint - S3/R2 endpoint URL
 * @param {string} opts.accessKeyId - Access key id
 * @param {string} opts.secretAccessKey - Secret access key
 * @param {string} opts.region - Bucket region
 * @param {string} [opts.publicBaseUrl] - Public/storage URL for reverse-proxy rewriting
 * @returns {import('./types.js').BucketClient}
 */
export const makeS3Bucket = (name, opts = {}) => {
  if (_.isEmpty(name)) {
    throw new Error('S3 bucket connection name cannot be empty')
  }

  let client = defS3ClientMap.get(name)
  if (client) {
    return client
  }

  const s3Client = makeS3Client(opts)
  client = createS3BucketClient(s3Client, opts.publicBaseUrl || '')
  defS3ClientMap.set(name, client)
  return client
}

/**
 * Disconnect and remove a GCP bucket client by name
 * @param {string} name - Connection name
 */
export const disconnectBucket = (name) => {
  defClientMap.delete(name)
}

/**
 * Disconnect and remove an S3 bucket client by name
 * @param {string} name - Connection name
 */
export const disconnectS3Bucket = (name) => {
  defS3ClientMap.delete(name)
}

export { createBucketClient, createS3BucketClient }
