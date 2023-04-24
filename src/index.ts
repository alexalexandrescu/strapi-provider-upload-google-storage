import {GetSignedUrlConfig, Storage} from '@google-cloud/storage';
import * as stream from 'stream';
import { Readable } from 'stream';

interface ProviderOptions {
  bucketName: string;
  serviceAccount?: string;
  baseUrl: string;
  sizeLimit?: number;
}

interface File {
  name: string;
  buffer?: Buffer;
  stream?: Readable;
}

export function init(providerOptions: ProviderOptions) {
  const storage = new Storage(providerOptions.serviceAccount ? { keyFilename: providerOptions.serviceAccount } : {});

  const bucket = storage.bucket(providerOptions.bucketName);

  return {
    async upload(file: File) {
      if (!file.buffer) {
        throw new Error('File buffer is not provided.');
      }

      const blob = bucket.file(file.name);
      const blobStream = blob.createWriteStream();

      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      try {
        await new Promise((resolve, reject) => {
          bufferStream
            .pipe(blobStream)
            .on('error', (error) => reject(error))
            .on('finish', () => {
              console.log(`${file.name} uploaded to ${providerOptions.bucketName}`);
              resolve(null);
            });
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    },

    async uploadStream(file: File) {
      if (!file.stream) {
        throw new Error('File stream is not provided.');
      }

      const blob = bucket.file(file.name);
      const blobStream = blob.createWriteStream();

      try {
        await new Promise((resolve, reject) => {
          file.stream
            .pipe(blobStream)
            .on('error', (error) => reject(error))
            .on('finish', () => {
              console.log(`${file.name} uploaded to ${providerOptions.bucketName}`);
              resolve(null);
            });
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    },

    async delete(file: File) {
      const blob = bucket.file(file.name);
      const deleteOptions = {
        ifGenerationMatch: 0,
      };

      try {
        await blob.delete(deleteOptions);
        console.log(`gs://${providerOptions.bucketName}/${file.name} deleted`);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    },

    checkFileSize(file: File, { sizeLimit }: { sizeLimit: number }) {
      if (providerOptions.sizeLimit && file.buffer) {
        if (file.buffer.byteLength > providerOptions.sizeLimit) {
          throw new Error(`File size exceeds the limit of ${providerOptions.sizeLimit} bytes.`);
        }
      }
    },

    async getSignedUrl(file: File) {
      const blob = bucket.file(file.name);
      const options: GetSignedUrlConfig = {
        version: 'v2',
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60, // one hour
      };

      try {
        const [url] = await blob.getSignedUrl(options);
        return { url };
      } catch (error) {
        console.error('Error generating signed URL:', error);
      }
    },

    isPrivate() {
      return true;
    },
  };
}
