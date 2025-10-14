import { BlobServiceClient } from "@azure/storage-blob";

const containerName = "document-templates";

let blobServiceClient: BlobServiceClient;

export function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    // Read environment variables when the function is called, not at module load time
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

export async function ensureContainerExists(): Promise<void> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  try {
    await containerClient.createIfNotExists();
  } catch (error) {
    console.error("Failed to create blob container:", error);
    throw error;
  }
}

export async function uploadBlob(
  fileName: string,
  content: Buffer
): Promise<string> {
  await ensureContainerExists();

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  await blockBlobClient.uploadData(content, {
    blobHTTPHeaders: {
      blobContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  });

  return blockBlobClient.url;
}

export async function downloadBlob(fileName: string): Promise<Buffer> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  const downloadResponse = await blockBlobClient.download();
  const downloaded = await streamToBuffer(downloadResponse.readableStreamBody!);

  return downloaded;
}

export async function deleteBlob(fileName: string): Promise<void> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  await blockBlobClient.delete();
}

async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}
