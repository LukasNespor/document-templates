import JSZip from "jszip";

export interface DocumentFile {
  filename: string;
  buffer: Buffer;
}

/**
 * Create a ZIP file containing multiple Word documents
 *
 * @param documents - Array of documents with filenames and buffers
 * @returns Buffer containing the ZIP file
 */
export async function createZipFile(
  documents: DocumentFile[]
): Promise<Buffer> {
  const zip = new JSZip();

  // Add each document to the ZIP
  documents.forEach((doc) => {
    const docxFilename = doc.filename.endsWith(".docx")
      ? doc.filename
      : `${doc.filename}.docx`;

    zip.file(docxFilename, doc.buffer);
  });

  // Generate ZIP file
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6, // Balance between speed and size
    },
  });

  return zipBuffer;
}
