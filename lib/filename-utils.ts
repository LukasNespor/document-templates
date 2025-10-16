/**
 * Normalizes a filename by removing accents and replacing special characters
 * @param filename - The filename to normalize
 * @returns Normalized filename safe for file systems
 */
export function normalizeFilename(filename: string): string {
  // Remove accents using NFD normalization and removing combining diacritical marks
  const normalized = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Replace any remaining non-alphanumeric characters (except dots, hyphens, and spaces) with underscores
  const safe = normalized.replace(/[^a-zA-Z0-9.\-\s]/g, "_");

  // Replace multiple underscores or spaces with a single underscore
  return safe.replace(/[_\s]+/g, "_");
}
