import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { MergeFieldValue } from "@/types";

export function extractMergeFields(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const fields = new Set<string>();

  // Helper function to extract merge fields from XML content
  const extractFromXml = (xml: string) => {
    // Match all <w:instrText> elements that contain MERGEFIELD
    // Pattern: <w:instrText...> MERGEFIELD  FieldName  \* MERGEFORMAT </w:instrText>
    const instrTextRegex = /<w:instrText[^>]*>(.*?)<\/w:instrText>/g;
    let match;

    while ((match = instrTextRegex.exec(xml)) !== null) {
      const instrText = match[1];

      // Check if this is a MERGEFIELD instruction
      if (instrText.includes("MERGEFIELD")) {
        // Extract field name from " MERGEFIELD  FieldName  \* MERGEFORMAT "
        const fieldName = getFieldNameFromMergeField(instrText);
        if (fieldName && !isSystemField(fieldName)) {
          fields.add(fieldName);
        }
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

// Helper function to check if a field is a system field that should be ignored
// Filters out Word system fields like PAGE, FORMCHECKBOX, etc.
function isSystemField(fieldName: string): boolean {
  const trimmedField = fieldName.trim().replace(/"/g, ""); // Remove quotes

  // System fields to ignore
  const systemFields = [
    "PAGE",
    "PAGE   \\* MERGEFORMAT",
    "FORMCHECKBOX",
  ];

  // Check exact matches (case sensitive for most)
  if (systemFields.includes(trimmedField)) {
    return true;
  }

  // Check case-insensitive matches for specific fields
  if (trimmedField.toLowerCase() === "dnes") {
    return true;
  }

  return false;
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Helper function to extract field name from MERGEFIELD instruction text
// Input: " MERGEFIELD  FieldName  \\* MERGEFORMAT " or variations
// Output: "FieldName"
function getFieldNameFromMergeField(mergeFieldText: string): string | null {
  // Remove leading/trailing whitespace
  const trimmed = mergeFieldText.trim();

  // Pattern: MERGEFIELD followed by field name, possibly followed by switches
  const match = trimmed.match(/MERGEFIELD\s+(\S+)/);
  if (match && match[1]) {
    const fieldName = match[1].trim().replace(/"/g, ""); // Remove quotes from field name
    return decodeHtmlEntities(fieldName); // Decode HTML entities like &amp; to &
  }

  return null;
}

export function generateDocument(
  templateBuffer: Buffer,
  mergeFields: MergeFieldValue[]
): Buffer {
  const zip = new PizZip(templateBuffer);

  // Create data object from merge fields
  const data: Record<string, string> = {};
  mergeFields.forEach((field) => {
    data[field.field] = field.value;
  });

  // Automatically populate "dnes" field with current date in Czech format (DD.MM.YYYY)
  data["dnes"] = getCurrentDateCzechFormat();

  // Replace MERGEFIELD codes in all XML parts
  const replaceMergeFieldsInXml = (xml: string): string => {
    // Replace each MERGEFIELD with its value
    Object.keys(data).forEach((fieldName) => {
      // Skip "dnes" as it will be handled separately with case-insensitive matching
      if (fieldName.toLowerCase() === "dnes") {
        return;
      }

      const value = data[fieldName];

      // Pattern to match MERGEFIELD complex field structure
      // This matches: <w:fldChar w:fldCharType="begin"/>...<w:instrText>MERGEFIELD fieldName</w:instrText>...<w:fldChar w:fldCharType="end"/>
      const fieldRegex = new RegExp(
        `<w:fldChar w:fldCharType="begin"[^>]*/>.*?<w:instrText[^>]*>\\s*MERGEFIELD\\s+${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</w:instrText>.*?<w:fldChar w:fldCharType="end"[^>]*/>`,
        'gs'
      );

      xml = xml.replace(fieldRegex, `<w:t>${escapeXml(value)}</w:t>`);
    });

    // Special handling for "dnes" field (case-insensitive: dnes or DNES)
    const dnesValue = data["dnes"];
    if (dnesValue) {
      const dnesRegex = new RegExp(
        `<w:fldChar w:fldCharType="begin"[^>]*/>.*?<w:instrText[^>]*>\\s*MERGEFIELD\\s+(?:dnes|DNES)[^<]*</w:instrText>.*?<w:fldChar w:fldCharType="end"[^>]*/>`,
        'gsi'
      );
      xml = xml.replace(dnesRegex, `<w:t>${escapeXml(dnesValue)}</w:t>`);
    }

    return xml;
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
