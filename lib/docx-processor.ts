import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { FieldValue } from "@/types";

export function extractMergeFields(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const fields = new Set<string>();

  // Helper function to extract {{field}} patterns from XML content
  // Word may split {{field}} across multiple <w:t> elements, so we need to extract
  // all text content first, then search for patterns
  const extractFromXml = (xml: string) => {
    // Extract all text content from <w:t> elements and join them
    // This handles cases where {{field}} is split across multiple text runs
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const textParts: string[] = [];
    let match;

    while ((match = textRegex.exec(xml)) !== null) {
      textParts.push(match[1]);
    }

    // Join all text and search for {{...}} patterns
    const fullText = textParts.join("");
    const fieldRegex = /\{\{([^}]+)\}\}/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(fullText)) !== null) {
      const fieldName = fieldMatch[1].trim();
      // Skip system fields (case-insensitive check for "dnes")
      if (fieldName.toLowerCase() !== "dnes") {
        fields.add(fieldName);
      }
    }
  };

  try {
    // Extract from main document
    const documentXml = zip.file("word/document.xml")?.asText();
    if (documentXml) {
      extractFromXml(documentXml);
    }

    // Extract from headers
    let headerIndex = 1;
    while (true) {
      const headerXml = zip.file(`word/header${headerIndex}.xml`)?.asText();
      if (!headerXml) break;
      extractFromXml(headerXml);
      headerIndex++;
    }

    // Extract from footers
    let footerIndex = 1;
    while (true) {
      const footerXml = zip.file(`word/footer${footerIndex}.xml`)?.asText();
      if (!footerXml) break;
      extractFromXml(footerXml);
      footerIndex++;
    }
  } catch (error) {
    console.error("Error extracting merge fields:", error);
  }

  return Array.from(fields);
}

export function generateDocument(
  templateBuffer: Buffer,
  fields: FieldValue[]
): Buffer {
  const zip = new PizZip(templateBuffer);

  // Create data object from fields (case-insensitive keys)
  const data: Record<string, string> = {};
  fields.forEach((field) => {
    data[field.field.toLowerCase()] = field.value;
  });

  // Automatically populate "dnes" field with current date in Czech format
  data["dnes"] = getCurrentDateCzechFormat();

  // Replace {{field}} patterns in all XML parts
  // Word may split {{field}} across multiple <w:t> elements, so we need special handling
  const replaceMergeFieldsInXml = (xml: string): string => {
    // Strategy: Find {{field}} patterns even when split across tags
    // Pattern matches: {{, then anything (including tags) until }}, using negative lookahead to prevent ReDoS
    // This avoids nested quantifiers that could cause exponential backtracking
    const splitFieldRegex = /\{\{((?:(?!\}\})[\s\S])*?)\}\}/g;

    let result = xml.replace(splitFieldRegex, (match, content) => {
      // Extract text content from Word XML <w:t> tags specifically
      // This is more secure than generic tag removal as it only extracts from known Word XML text elements
      const textParts: string[] = [];
      const textTagRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let tagMatch;

      while ((tagMatch = textTagRegex.exec(content)) !== null) {
        textParts.push(tagMatch[1]);
      }

      // If no <w:t> tags found, content might already be plain text
      const textContent = textParts.length > 0 ? textParts.join("") : content;

      // Sanitize field name: only allow alphanumeric, spaces, dots, hyphens, underscores
      // This prevents any potential injection while allowing common field name patterns
      const sanitizedFieldName = textContent.replace(/[^a-zA-Z0-9\s.\-_]/g, "").trim();
      const lowerFieldName = sanitizedFieldName.toLowerCase();

      // Look up the value (case-insensitive)
      const value = data[lowerFieldName];

      if (value !== undefined) {
        // Replace the entire match (including any internal XML tags) with just the value
        return escapeXml(value);
      }

      // If field not found, keep the original
      return match;
    });

    return result;
  };

  // Process document.xml
  const documentXml = zip.file("word/document.xml")?.asText();
  if (documentXml) {
    const updatedXml = replaceMergeFieldsInXml(documentXml);
    zip.file("word/document.xml", updatedXml);
  }

  // Process headers
  let headerIndex = 1;
  while (true) {
    const headerXml = zip.file(`word/header${headerIndex}.xml`)?.asText();
    if (!headerXml) break;
    const updatedXml = replaceMergeFieldsInXml(headerXml);
    zip.file(`word/header${headerIndex}.xml`, updatedXml);
    headerIndex++;
  }

  // Process footers
  let footerIndex = 1;
  while (true) {
    const footerXml = zip.file(`word/footer${footerIndex}.xml`)?.asText();
    if (!footerXml) break;
    const updatedXml = replaceMergeFieldsInXml(footerXml);
    zip.file(`word/footer${footerIndex}.xml`, updatedXml);
    footerIndex++;
  }

  const buffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return buffer as Buffer;
}

// Helper function to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Helper function to get current date in Czech format (d. MMMM yyyy)
// Example: "14. října 2025"
function getCurrentDateCzechFormat(): string {
  const now = new Date();
  const day = now.getDate(); // Day without leading zero
  const year = now.getFullYear();

  // Czech month names in genitive case (used with dates)
  const czechMonths = [
    "ledna",    // January
    "února",    // February
    "března",   // March
    "dubna",    // April
    "května",   // May
    "června",   // June
    "července", // July
    "srpna",    // August
    "září",     // September
    "října",    // October
    "listopadu",// November
    "prosince"  // December
  ];

  const month = czechMonths[now.getMonth()];

  return `${day}. ${month} ${year}`;
}
