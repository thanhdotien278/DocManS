import { Injectable } from "@nestjs/common";
import { Client } from "minio";
import { Readable } from "node:stream";

export type PutObjectInput = {
  objectKey: string;
  content: Buffer;
  mimeType: string;
  sizeBytes: number;
};

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<void>;
  getObject(objectKey: string): Promise<Readable | Buffer>;
  deleteObject?(objectKey: string): Promise<void>;
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for MinIO file storage.`);
  }
  return value;
}

function readBooleanEnv(name: string) {
  return ["1", "true", "yes"].includes((process.env[name] ?? "").trim().toLowerCase());
}

@Injectable()
export class MinioObjectStorageService implements ObjectStorage {
  private client?: Client;
  private bucketReady = false;

  async putObject(input: PutObjectInput) {
    const bucketName = await this.ensureBucket();
    await this.getClient().putObject(bucketName, input.objectKey, input.content, input.sizeBytes, {
      "Content-Type": input.mimeType
    });
  }

  async getObject(objectKey: string) {
    return this.getClient().getObject(this.getBucketName(), objectKey);
  }

  async deleteObject(objectKey: string) {
    await this.getClient().removeObject(this.getBucketName(), objectKey);
  }

  private getBucketName() {
    return readRequiredEnv("MINIO_BUCKET_NAME");
  }

  private getClient() {
    this.client ??= new Client({
      endPoint: readRequiredEnv("MINIO_ENDPOINT"),
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: readBooleanEnv("MINIO_USE_SSL"),
      accessKey: readRequiredEnv("MINIO_ACCESS_KEY"),
      secretKey: readRequiredEnv("MINIO_SECRET_KEY"),
      region: process.env.MINIO_REGION?.trim() || undefined
    });

    return this.client;
  }

  private async ensureBucket() {
    const bucketName = this.getBucketName();
    if (this.bucketReady) {
      return bucketName;
    }

    const client = this.getClient();
    const exists = await client.bucketExists(bucketName);
    if (!exists) {
      await client.makeBucket(bucketName, process.env.MINIO_REGION?.trim() || "us-east-1");
    }
    this.bucketReady = true;
    return bucketName;
  }
}
