import { tryit } from 'radash'
import { imageSize } from 'image-size'

const GCS_URL = 'https://storage.googleapis.com/'

/**
 * Create a GCP Bucket client
 * @param {import('@google-cloud/storage').Storage} storage - Google Cloud Storage client
 * @returns {import('./types.js').BucketClient}
 */
export const createBucketClient = (storage) => {
  return {
    upload: upload(storage),
    download: download(storage),
    delete: deleteFile(storage),
    exists: exists(storage),
    move: moveFile(storage),
    metadata: metadata(storage),
    getStorageUrl: getStorageUrl,
  }
}

const getStorageUrl = () => GCS_URL

/**
 * Create a signed URL for uploading to GCP bucket
 * @param {import('@google-cloud/storage').Storage} storage - Google Cloud Storage client
 * @return {(args: { bucketName: string, fileName: string, expiresIn?: number, contentType?: string }) => Promise<[Error|null, string|null]>}
 */
const upload = (storage) => async ({ bucketName, fileName, expiresIn = 3600, contentType = 'application/octet-stream' }) => {
  const [error, url] = await tryit(async () => {
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + (expiresIn * 1000),
      contentType: contentType,
    })

    return signedUrl
  })()
  return [error, url]
}

const getDimensions = async (file) => {
  const stream = file.createReadStream({ start: 0, end: 65535 })

  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)
  const dimensions = imageSize(buffer)
  return dimensions
}

/**
 * Get metadata of a file from GCP bucket
 * @param {import('@google-cloud/storage').Storage} storage - Google Cloud Storage client
 * @return {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, Object|null]>}
 */
const metadata = (storage) => async ({ bucketName, fileName }) => {
  const [error, data] = await tryit(async () => {
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)
    const resp = await file.getMetadata()
    const gcsMetadata = {
      size: Number(resp[0].size),
      contentType: resp[0].contentType,
      created_at: resp[0].timeCreated,
    }

    let dimensions = {}
    if (gcsMetadata.contentType && gcsMetadata.contentType.startsWith('image/')) {
      try {
        dimensions = await getDimensions(file)
      } catch {
        // image-size failed — skip dimensions
      }
    }

    return { ...gcsMetadata, ...dimensions }
  })()
  return [error, data]
}

/**
 * Create a signed URL for downloading from GCP bucket
 * @param {import('@google-cloud/storage').Storage} storage - Google Cloud Storage client
 * @return {(args: { bucketName: string, fileName: string, expiresIn?: number }) => Promise<[Error|null, string|null]>}
 */
const download = (storage) => async ({ bucketName, fileName, expiresIn = 3600 }) => {
  const [error, url] = await tryit(async () => {
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + (expiresIn * 1000),
    })

    return signedUrl
  })()
  return [error, url]
}

/**
 * Delete a file from GCP bucket
 * @param {import('@google-cloud/storage').Storage} storage - Google Cloud Storage client
 * @return {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, boolean|null]>}
 */
const deleteFile = (storage) => async ({ bucketName, fileName }) => {
  const [error, success] = await tryit(async () => {
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)
    await file.delete()
    return true
  })()
  return [error, success]
}

/**
 * Check if a file exists in GCP bucket
 * @param {import('@google-cloud/storage').Storage} storage - Google Cloud Storage client
 * @return {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, boolean|null]>}
 */
const exists = (storage) => async ({ bucketName, fileName }) => {
  const [error, fileExists] = await tryit(async () => {
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)
    const [result] = await file.exists()
    return result
  })()
  return [error, fileExists]
}

/**
 * Move a file to a new location in GCP bucket
 * @param {import('@google-cloud/storage').Storage} storage - Google Cloud Storage client
 * @return {(args: { bucketName: string, fileName: string, newFileName: string }) => Promise<[Error|null, boolean|null]>}
 */
const moveFile = (storage) => async ({ bucketName, fileName, newFileName }) => {
  const [error, moved] = await tryit(async () => {
    const bucket = storage.bucket(bucketName)
    const file = bucket.file(fileName)
    await file.move(newFileName)
    return true
  })()
  return [error, moved]
}
