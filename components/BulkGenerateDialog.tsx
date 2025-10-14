"use client";

import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Download, AlertTriangle } from "lucide-react";
import Papa from "papaparse";
import { Template } from "@/types";

interface BulkGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
}

interface CsvPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export default function BulkGenerateDialog({
  isOpen,
  onClose,
  template,
}: BulkGenerateDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError("");
    setValidationErrors([]);
    setValidationWarnings([]);

    try {
      const content = await file.text();

      // Parse CSV to show preview
      const result = Papa.parse<string[]>(content, {
        delimiter: ";",
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        setError("Nepodařilo se načíst CSV soubor. Zkontrolujte formát.");
        setCsvPreview(null);
        return;
      }

      const headers = result.data[0] || [];
      const dataRows = result.data.slice(1);

      setCsvPreview({
        headers,
        rows: dataRows.slice(0, 5), // Show first 5 rows
        totalRows: dataRows.length,
      });

      // Validate CSV structure
      validateCsvStructure(headers);
    } catch (err) {
      setError("Nepodařilo se přečíst CSV soubor");
      setCsvPreview(null);
    }
  };

  const validateCsvStructure = (headers: string[]) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (headers.length === 0) {
      errors.push("CSV soubor nemá záhlaví");
      setValidationErrors(errors);
      return;
    }

    // First column is filename column
    const filenameColumn = headers[0];
    const csvMergeFields = headers.slice(1);

    // Filter out "dnes" from required fields
    const requiredFields = template.mergeFields.filter(
      (field) => field.toLowerCase() !== "dnes"
    );

    // Check for missing fields
    const missingFields = requiredFields.filter(
      (field) => !csvMergeFields.includes(field)
    );

    if (missingFields.length > 0) {
      errors.push(
        `V CSV chybí povinná pole: ${missingFields.join(", ")}`
      );
    }

    // Check for extra columns
    const extraColumns = csvMergeFields.filter(
      (col) => !template.mergeFields.includes(col)
    );

    if (extraColumns.length > 0) {
      warnings.push(
        `CSV obsahuje sloupce, které nejsou v šabloně (budou ignorovány): ${extraColumns.join(", ")}`
      );
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("templateId", template.id);
      formData.append("csvFile", selectedFile);

      const response = await fetch("/api/templates/bulk-generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate documents"
        );
      }

      // Check for warnings in headers
      const warningsHeader = response.headers.get("X-Generation-Warnings");
      if (warningsHeader) {
        const warningData = JSON.parse(warningsHeader);
        console.warn("Generation warnings:", warningData);
        // You could show these warnings to the user if desired
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let downloadFileName = "generated_documents.zip";

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          downloadFileName = filenameMatch[1];
        }
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close dialog on success
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se vygenerovat dokumenty");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCsvPreview(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setError("");
    onClose();
  };

  const isValid = selectedFile && validationErrors.length === 0 && csvPreview;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 10000 }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Hromadné generování z CSV
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Šablona: {template.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Formát CSV:</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div>Oddělení středníkem (;)</div>
              <div>První sloupec: Název souboru</div>
              <div>Další sloupce: {template.mergeFields.join(", ")}</div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nahrát CSV soubor
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Klikněte pro výběr CSV souboru
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    nebo přetáhněte soubor sem
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="ml-4 text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                  >
                    Změnit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">
                    Chyby validace:
                  </h4>
                  <div className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, i) => (
                      <div key={i}>{error}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    Upozornění:
                  </h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    {validationWarnings.map((warning, i) => (
                      <div key={i}>{warning}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CSV Preview */}
          {csvPreview && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Náhled CSV ({csvPreview.totalRows} řádků)
                </h3>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {csvPreview.headers.map((header, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-left font-semibold text-gray-700"
                        >
                          {header}
                          {i === 0 && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">
                              (Název souboru)
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-4 py-2 text-gray-900"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvPreview.totalRows > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Zobrazeno prvních 5 řádků z {csvPreview.totalRows}
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zrušit
          </button>
          <button
            onClick={handleGenerate}
            disabled={!isValid || isGenerating}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generuji...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Vygenerovat dokumenty
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
