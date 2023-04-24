"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const storage_1 = require("@google-cloud/storage");
const stream = __importStar(require("stream"));
function init(providerOptions) {
    const storage = new storage_1.Storage(providerOptions.serviceAccount ? { keyFilename: providerOptions.serviceAccount } : {});
    const bucket = storage.bucket(providerOptions.bucketName);
    return {
        async upload(file) {
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
            }
            catch (error) {
                console.error('Error uploading file:', error);
            }
        },
        async uploadStream(file) {
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
            }
            catch (error) {
                console.error('Error uploading file:', error);
            }
        },
        async delete(file) {
            const blob = bucket.file(file.name);
            const deleteOptions = {
                ifGenerationMatch: 0,
            };
            try {
                await blob.delete(deleteOptions);
                console.log(`gs://${providerOptions.bucketName}/${file.name} deleted`);
            }
            catch (error) {
                console.error('Error deleting file:', error);
            }
        },
        checkFileSize(file, { sizeLimit }) {
            if (providerOptions.sizeLimit && file.buffer) {
                if (file.buffer.byteLength > providerOptions.sizeLimit) {
                    throw new Error(`File size exceeds the limit of ${providerOptions.sizeLimit} bytes.`);
                }
            }
        },
        async getSignedUrl(file) {
            const blob = bucket.file(file.name);
            const options = {
                version: 'v2',
                action: 'read',
                expires: Date.now() + 1000 * 60 * 60, // one hour
            };
            try {
                const [url] = await blob.getSignedUrl(options);
                return { url };
            }
            catch (error) {
                console.error('Error generating signed URL:', error);
            }
        },
        isPrivate() {
            return true;
        },
    };
}
exports.init = init;
