/**
 * Abstract storage service.
 *
 * Implementations:
 *   - LocalStorage  — saves to disk under /uploads (default)
 *   - S3Storage     — uploads to S3 / Cloudflare R2 (set STORAGE_PROVIDER=s3)
 *
 * Strategy for large video files (up to 2GB):
 *   - multer always writes to disk first (avoiding OOM)
 *   - If S3 provider: stream the file from disk → S3, then delete the temp file
 *   - If local provider: file stays on disk (no extra step)
 *
 * Usage:
 *   import { storage } from './storage.js';
 *   await storage.saveUpload(diskPath, key, contentType);  // after multer
 *   await storage.delete(key);
 *   const url = await storage.getSignedUrl(key, { expiresIn: 3600 }); // null on local
 *   const result = await storage.getStream(key, rangeHeader); // local only
 */

import path from 'path';
import { unlink, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== LocalStorage =====

class LocalStorage {
  constructor(uploadsDir) {
    this.uploadsDir = uploadsDir;
  }

  /**
   * File was already written to disk by multer — nothing to do.
   * @param {string} diskPath - Absolute path multer wrote to (unused)
   * @param {string} key - Relative key (e.g. "recovery-videos/abc.mp4")
   */
  async saveUpload(_diskPath, _key, _contentType) {
    // No-op: multer diskStorage already saved the file in the right place
  }

  async delete(key) {
    const filePath = path.join(this.uploadsDir, key);
    await unlink(filePath).catch(() => {});
  }

  /** Local storage uses the /stream endpoint — no pre-signed URL. */
  async getSignedUrl(_key, _opts) {
    return null;
  }

  /**
   * Returns a readable stream with metadata for HTTP range requests.
   * @param {string} key - Relative key
   * @param {string|undefined} range - HTTP Range header value (e.g. "bytes=0-1023")
   */
  async getStream(key, range) {
    const filePath = path.join(this.uploadsDir, key);
    const fileStat = await stat(filePath);

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1;
      return {
        stream: createReadStream(filePath, { start, end }),
        start,
        end,
        size: fileStat.size,
        partial: true,
      };
    }

    return {
      stream: createReadStream(filePath),
      size: fileStat.size,
      partial: false,
    };
  }

  get type() {
    return 'local';
  }
}

// ===== S3Storage (also compatible with Cloudflare R2) =====

class S3Storage {
  constructor() {
    this.bucket = env.S3_BUCKET;
    this.region = env.S3_REGION || 'auto';
    this.endpoint = env.S3_ENDPOINT; // Required for R2 (e.g. https://<account>.r2.cloudflarestorage.com)
    this.publicUrl = env.S3_PUBLIC_URL; // Optional CDN base URL for public objects
    this._s3 = null;
  }

  async _client() {
    if (this._s3) return this._s3;
    const { S3Client } = await import('@aws-sdk/client-s3');
    this._s3 = new S3Client({
      region: this.region,
      ...(this.endpoint ? { endpoint: this.endpoint } : {}),
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
    return this._s3;
  }

  /**
   * Stream file from disk to S3 (avoids loading full file into memory),
   * then delete the temp local file.
   * @param {string} diskPath - Absolute path of file on disk
   * @param {string} key - S3 object key (e.g. "recovery-videos/abc.mp4")
   * @param {string} contentType - MIME type
   */
  async saveUpload(diskPath, key, contentType) {
    const s3 = await this._client();
    const { Upload } = await import('@aws-sdk/lib-storage');

    const fileStat = await stat(diskPath);
    const stream = createReadStream(diskPath);

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: contentType || 'application/octet-stream',
        ContentLength: fileStat.size,
      },
      queueSize: 4, // parallel parts
      partSize: 1024 * 1024 * 10, // 10MB parts
    });

    await upload.done();
    // Delete the temp local file after successful upload
    await unlink(diskPath).catch(() => {});
  }

  async delete(key) {
    const s3 = await this._client();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => {});
  }

  /**
   * Generate a pre-signed URL for temporary, secure access to private objects.
   * @param {string} key
   * @param {{ expiresIn?: number }} opts - expiresIn in seconds (default 3600 = 1 hour)
   */
  async getSignedUrl(key, opts = {}) {
    const s3 = await this._client();
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const expiresIn = opts.expiresIn || 3600;
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    });
  }

  /** S3 objects are accessed via pre-signed URLs, not server-side streams. */
  async getStream(_key, _range) {
    throw new Error('S3Storage: use getSignedUrl() for video streaming, not getStream().');
  }

  get type() {
    return 's3';
  }
}

// ===== Factory =====

function createStorage() {
  const provider = (env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 's3') {
    return new S3Storage();
  }
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  return new LocalStorage(uploadsDir);
}

export const storage = createStorage();
