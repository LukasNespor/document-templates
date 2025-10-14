import Papa from "papaparse";

export interface CsvRow {
  filename: string;
  fields: Record<string, string>;
}

export interface ParsedCsvData {
  filenameColumn: string;
  mergeFieldColumns: string[];
  rows: CsvRow[];
}

export interface CsvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: ParsedCsvData;
}

/**
 * Parse a CSV file and validate it against template merge fields
 *
 * @param csvContent - The CSV file content as string
 * @param templateMergeFields - Array of merge field names from the template
 * @returns Validation result with parsed data or errors
 */
export function parseCsvFile(
  csvContent: string,
  templateMergeFields: string[]
): CsvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse CSV with Papa Parse
  const parseResult = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
    transformHeader: (header: string) => header.trim(),
  });

  // Check for parsing errors
  if (parseResult.errors.length > 0) {
    parseResult.errors.forEach((error) => {
      errors.push(`Chyba parsování CSV na řádku ${error.row}: ${error.message}`);
    });
  }

  // Check if we have data
  if (!parseResult.data || parseResult.data.length === 0) {
    errors.push("CSV soubor je prázdný nebo neobsahuje žádné platné řádky");
    return { isValid: false, errors, warnings };
  }

  // Get CSV headers (column names)
  const csvHeaders = parseResult.meta.fields || [];

  if (csvHeaders.length === 0) {
    errors.push("CSV soubor nemá záhlaví");
    return { isValid: false, errors, warnings };
  }

  // First column is always the filename column
  const filenameColumn = csvHeaders[0];
  const csvMergeFieldColumns = csvHeaders.slice(1);

  // Filter out "dnes" from required fields as it's auto-populated
  const requiredFields = templateMergeFields.filter(
    (field) => field.toLowerCase() !== "dnes"
  );

  // Check if all required merge fields are present in CSV
  const missingFields = requiredFields.filter(
    (field) => !csvMergeFieldColumns.includes(field)
  );

  if (missingFields.length > 0) {
    errors.push(
      `V CSV chybí povinná pole: ${missingFields.join(", ")}`
    );
  }

  // Check for extra columns that aren't in template (warning only)
  const extraColumns = csvMergeFieldColumns.filter(
    (col) => !templateMergeFields.includes(col)
  );

  if (extraColumns.length > 0) {
    warnings.push(
      `CSV obsahuje sloupce, které nejsou v šabloně (budou ignorovány): ${extraColumns.join(", ")}`
    );
  }

  // Return early if we have validation errors
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Process rows
  const rows: CsvRow[] = [];
  const seenFilenames = new Set<string>();
  const duplicateFilenames: string[] = [];

  parseResult.data.forEach((row, index) => {
    const filename = sanitizeFilename(row[filenameColumn] || "");

    // Check for empty filename
    if (!filename) {
      warnings.push(`Řádek ${index + 2}: Prázdný název souboru, řádek bude přeskočen`);
      return;
    }

    // Check for duplicate filenames
    if (seenFilenames.has(filename)) {
      duplicateFilenames.push(filename);
    }
    seenFilenames.add(filename);

    // Extract merge field values (excluding filename column)
    const fields: Record<string, string> = {};
    csvMergeFieldColumns.forEach((column) => {
      // Only include fields that are in the template
      if (templateMergeFields.includes(column)) {
        fields[column] = row[column] || "";
      }
    });

    rows.push({ filename, fields });
  });

  // Warn about duplicate filenames
  if (duplicateFilenames.length > 0) {
    warnings.push(
      `Nalezeny duplicitní názvy souborů (budou očíslovány): ${[...new Set(duplicateFilenames)].join(", ")}`
    );
  }

  // Check if we have any valid rows
  if (rows.length === 0) {
    errors.push("V CSV souboru nebyly nalezeny žádné platné řádky");
    return { isValid: false, errors, warnings };
  }

  // Check row limit
  const MAX_ROWS = 200;
  if (rows.length > MAX_ROWS) {
    errors.push(
      `CSV soubor má příliš mnoho řádků (${rows.length}). Maximum: ${MAX_ROWS}`
    );
    return { isValid: false, errors, warnings };
  }

  return {
    isValid: true,
    errors,
    warnings,
    data: {
      filenameColumn,
      mergeFieldColumns: csvMergeFieldColumns.filter((col) =>
        templateMergeFields.includes(col)
      ),
      rows,
    },
  };
}

/**
 * Sanitize filename by removing illegal characters
 * Allowed: letters, numbers, spaces, hyphens, underscores, dots, parentheses
 */
function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[/\\:*?"<>|]/g, "") // Remove illegal characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .substring(0, 200); // Limit length
}

/**
 * Handle duplicate filenames by appending a counter
 */
export function handleDuplicateFilenames(rows: CsvRow[]): CsvRow[] {
  const filenameCounts = new Map<string, number>();

  return rows.map((row) => {
    const originalFilename = row.filename;
    const count = filenameCounts.get(originalFilename) || 0;

    filenameCounts.set(originalFilename, count + 1);

    if (count > 0) {
      // Append counter to filename
      return {
        ...row,
        filename: `${originalFilename}_${count}`,
      };
    }

    return row;
  });
}
