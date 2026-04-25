/**
 * @typedef {Object} BucketClient
 * @property {(args: { bucketName: string, fileName: string, expiresIn?: number, contentType?: string }) => Promise<[Error|null, string|null]>} upload - Create a signed URL for uploading
 * @property {(args: { bucketName: string, fileName: string, expiresIn?: number }) => Promise<[Error|null, string|null]>} download - Create a signed URL for downloading
 * @property {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, boolean|null]>} delete - Delete a file from the bucket
 * @property {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, boolean|null]>} exists - Check if a file exists in the bucket
 * @property {(args: { bucketName: string, fileName: string, newFileName: string }) => Promise<[Error|null, boolean|null]>} move - Move a file to a new location
 * @property {(args: { bucketName: string, fileName: string }) => Promise<[Error|null, Object|null]>} metadata - Get file metadata (size, contentType, created_at, dimensions)
 * @property {() => string} getStorageUrl - Get the public base URL for the storage provider
 */

export {}
