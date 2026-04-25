import { tryit } from 'radash'
import { imageSize } from 'image-size'
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const IMAGE_BYTES_RANGE = 'bytes=0-65535'

const streamToBuffer = async (stream) => {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
}

const getDimensions = async (s3, { bucketName, fileName }) => {
  const response = await s3.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Range: IMAGE_BYTES_RANGE,
  }))

  if (!response.Body) {
    return {}
  }

  const buffer = await streamToBuffer(response.Body)
  return imageSize(buffer)
}

/**
 * Create an S3 compatible Bucket client
 * @param {import('@aws-sdk/client-s3').S3Client} s3 - S3 compatible client
 * @param {string} [storageUrl=''] - Base URL used for reverse-proxy replacement
 * @returns {import('./types.js').BucketClient}
 */
export const createS3BucketClient = (s3, storageUrl = '') => {
  return {
    upload: upload(s3),
    download: download(s3),
    delete: deleteFile(s3),
    exists: exists(s3),
    move: moveFile(s3),
    metadata: metadata(s3),
    getStorageUrl: getStorageUrl(storageUrl),
  }
}

const getStorageUrl = (storageUrl) => () => storageUrl

/**
 * Create a signed URL for uploading to an S3 compatible bucket
 * @param {import('@aws-sdk/client-s3').S3Client} s3 - S3 client
 * @return {(args: { bucketName: string, fileName: string, expiresIn?: number, contentType?: string }) => Promise<[Error|null, string|null]>}
 */
const upload = (s3) => async ({ bucketName, fileName, expiresIn = 3600, contentType = 'application/octet-stream' }) => {
  const [error, url] = await tryit(async () => {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: contentType,
    })
    return await getSignedUrl(s3, command, { expiresIn })
  })()
  return [error, url]
}

/**
 * Create a signed URL for downloading from an S3 compatible bucket
 * @param {import('@aws-sdk/client-s3').S3Client} s3 - S3 client
 * @return {(args: { bucketName: string, fileName: string, expiresIn?: number }) => Promise<[Error|null, string|null]>}
 */
const download = (s3) => async ({ bucketName, fileName, expiresIn = 3600 }) => {
  const [error, url] = await tryit(async () => {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    })
    return await getSignedUrl(s3, command, { expiresIn })
  })()
  return [error, url]
}

/**
 * Delete a file from an S3 compatible bucket
 * @param {import('@aws-sdk/client-s3').S3Client} s3 - S3 client
 * @return {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, boolean|null]>}
 */
const deleteFile = (s3) => async ({ bucketName, fileName }) => {
  const [error, success] = await tryit(async () => {
    await s3.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    }))
    return true
  })()
  return [error, success]
}

/**
 * Check if a file exists in an S3 compatible bucket
 * @param {import('@aws-sdk/client-s3').S3Client} s3 - S3 client
 * @return {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, boolean|null]>}
 */
const exists = (s3) => async ({ bucketName, fileName }) => {
  const [error, fileExists] = await tryit(async () => {
    await s3.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    }))
    return true
  })()

  if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound' || error?.name === 'NoSuchKey') {
    return [null, false]
  }

  return [error, fileExists]
}

/**
 * Move a file to a new location in an S3 compatible bucket
 * @param {import('@aws-sdk/client-s3').S3Client} s3 - S3 client
 * @return {(args: { bucketName: string, fileName: string, newFileName: string }) => Promise<[Error|null, boolean|null]>}
 */
const moveFile = (s3) => async ({ bucketName, fileName, newFileName }) => {
  const [error, moved] = await tryit(async () => {
    await s3.send(new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${fileName}`,
      Key: newFileName,
    }))

    await s3.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    }))

    return true
  })()
  return [error, moved]
}

/**
 * Get metadata of a file from an S3 compatible bucket
 * @param {import('@aws-sdk/client-s3').S3Client} s3 - S3 client
 * @return {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, Object|null]>}
 */
const metadata = (s3) => async ({ bucketName, fileName }) => {
  const [error, data] = await tryit(async () => {
    const response = await s3.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    }))

    const meta = {
      size: Number(response.ContentLength || 0),
      contentType: response.ContentType || '',
      created_at: response.LastModified,
    }

    let dimensions = {}
    if (meta.contentType && meta.contentType.startsWith('image/')) {
      try {
        dimensions = await getDimensions(s3, { bucketName, fileName })
      } catch {
        // image-size failed — skip dimensions
      }
    }

    return { ...meta, ...dimensions }
  })()
  return [error, data]
}
