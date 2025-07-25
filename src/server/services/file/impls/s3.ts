import urlJoin from 'url-join';

import { fileEnv } from '@/config/file';
import { S3 } from '@/server/modules/S3';

import { FileServiceImpl } from './type';

/**
 * 基于S3的文件服务实现
 */
export class S3StaticFileImpl implements FileServiceImpl {
  private readonly s3: S3;

  constructor() {
    this.s3 = new S3();
  }

  async deleteFile(key: string) {
    return this.s3.deleteFile(key);
  }

  async deleteFiles(keys: string[]) {
    return this.s3.deleteFiles(keys);
  }

  async getFileContent(key: string): Promise<string> {
    return this.s3.getFileContent(key);
  }

  async getFileByteArray(key: string): Promise<Uint8Array> {
    return this.s3.getFileByteArray(key);
  }

  async createPreSignedUrl(key: string): Promise<string> {
    return this.s3.createPreSignedUrl(key);
  }

  async createPreSignedUrlForPreview(key: string, expiresIn?: number): Promise<string> {
    return this.s3.createPreSignedUrlForPreview(key, expiresIn);
  }

  async uploadContent(path: string, content: string) {
    return this.s3.uploadContent(path, content);
  }

  async getFullFileUrl(url?: string | null, expiresIn?: number): Promise<string> {
    if (!url) return '';

    // If bucket is not set public read, the preview address needs to be regenerated each time
    if (!fileEnv.S3_SET_ACL) {
      return await this.createPreSignedUrlForPreview(url, expiresIn);
    }

    if (fileEnv.S3_ENABLE_PATH_STYLE) {
      return urlJoin(fileEnv.S3_PUBLIC_DOMAIN!, fileEnv.S3_BUCKET!, url);
    }

    return urlJoin(fileEnv.S3_PUBLIC_DOMAIN!, url);
  }

  getKeyFromFullUrl(url: string): string {
    try {
      const urlObject = new URL(url);
      const { pathname } = urlObject;

      let key: string;

      if (fileEnv.S3_ENABLE_PATH_STYLE) {
        if (!fileEnv.S3_BUCKET) {
          // In path-style, we need bucket name to extract key
          // but if not provided, we can only guess the key is the pathname
          return pathname.startsWith('/') ? pathname.slice(1) : pathname;
        }
        // For path-style URLs, the path is /<bucket>/<key>
        // We need to remove the leading slash and the bucket name.
        const bucketPrefix = `/${fileEnv.S3_BUCKET}/`;
        if (pathname.startsWith(bucketPrefix)) {
          key = pathname.slice(bucketPrefix.length);
        } else {
          // Fallback for unexpected path format
          key = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        }
      } else {
        // For virtual-hosted-style URLs, the path is /<key>
        // We just need to remove the leading slash.
        key = pathname.slice(1);
      }

      return key;
    } catch {
      // if url is not a valid URL, it may be a key itself
      return url;
    }
  }

  async uploadMedia(key: string, buffer: Buffer): Promise<{ key: string }> {
    await this.s3.uploadMedia(key, buffer);
    return { key };
  }
}
