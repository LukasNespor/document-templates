import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { MergeFieldValue } from "@/types";

export function extractMergeFields(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const tags = doc.getFullText().match(/\{([^}]+)\}/g);
  if (!tags) return [];

  // Extract unique field names
  const fields = new Set<string>();
  tags.forEach((tag) => {
    const field = tag.replace(/[{}]/g, "");
    fields.add(field);
  });

  return Array.from(fields);
}

export function generateDocument(
  templateBuffer: Buffer,
  mergeFields: MergeFieldValue[]
): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Create data object from merge fields
  const data: Record<string, string> = {};
  mergeFields.forEach((field) => {
    data[field.field] = field.value;
  });

  doc.render(data);

  const buffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return buffer as Buffer;
}
