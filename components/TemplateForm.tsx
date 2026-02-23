"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, FolderOpen, StickyNote, Edit3, Wand2, AlertCircle, Loader2, Download, Edit2, Trash2, Upload, FileSpreadsheet } from "lucide-react";
import { Template, FieldValue } from "@/types";

const FIELD_MEMORY_KEY = "fieldMemory";

interface TemplateFormProps {
  template: Template;
  onGenerate: (templateId: string, fields: FieldValue[], fileName: string) => Promise<void>;
  onEditTemplate: (template: Template) => void;
  onDeleteTemplate: (template: Template) => void;
  onReuploadTemplate: (templateId: string, file: File) => Promise<void>;
  onHelp: () => void;
  onBulkGenerate?: () => void;
}

export default function TemplateForm({ template, onGenerate, onEditTemplate, onDeleteTemplate, onReuploadTemplate, onHelp, onBulkGenerate }: TemplateFormProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize field values when template changes, pre-filling from remembered values
  useEffect(() => {
    let remembered: Record<string, string> = {};
    try {
      const stored = sessionStorage.getItem(FIELD_MEMORY_KEY);
      if (stored) {
        remembered = JSON.parse(stored);
      }
    } catch {
      // Ignore parse or access errors
    }

    const initialValues: Record<string, string> = {};
    template.fields.forEach((field) => {
      initialValues[field] = remembered[field] || "";
    });
    setFieldValues(initialValues);
    setFileName("");
    setError("");
  }, [template]);

  const handleFieldChange = (field: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Convert to array of field values
    const fields: FieldValue[] = Object.entries(fieldValues).map(
      ([field, value]) => ({
        field,
        value,
      })
    );

    setIsGenerating(true);

    try {
      await onGenerate(template.id, fields, fileName);

      // Save non-empty field values to sessionStorage after successful generation
      try {
        let existing: Record<string, string> = {};
        const stored = sessionStorage.getItem(FIELD_MEMORY_KEY);
        if (stored) {
          existing = JSON.parse(stored);
        }
        for (const [field, value] of Object.entries(fieldValues)) {
          if (value.trim()) {
            existing[field] = value;
          }
        }
        sessionStorage.setItem(FIELD_MEMORY_KEY, JSON.stringify(existing));
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepodařilo se vygenerovat dokument"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReuploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".docx")) {
      setError("Prosím nahrajte platný soubor Word (.docx)");
      return;
    }

    setIsReuploading(true);
    setError("");

    try {
      await onReuploadTemplate(template.id, file);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepodařilo se znovu nahrát šablonu"
      );
    } finally {
      setIsReuploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const normalizeFilename = (filename: string): string => {
    // Remove accents using NFD normalization and removing combining diacritical marks
    const normalized = filename
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Replace any remaining non-alphanumeric characters (except dots, hyphens, and spaces) with underscores
    const safe = normalized.replace(/[^a-zA-Z0-9.\-\s]/g, "_");

    // Replace multiple underscores or spaces with a single underscore
    return safe.replace(/[_\s]+/g, "_");
  };

  const handleDownloadOriginal = async () => {
    try {
      const response = await fetch(`/api/templates/${template.id}/download`);
      if (!response.ok) {
        throw new Error("Stažení šablony selhalo");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${normalizeFilename(template.name)}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepodařilo se stáhnout šablonu"
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Template Header */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200 shadow-sm">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full opacity-5 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400 rounded-full opacity-5 blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative p-6">
          <div className="flex items-start gap-5">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-blue-400 rounded-2xl blur-md opacity-30"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <FileText className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title and Actions Row */}
              <div className={`flex items-start justify-between gap-4 ${template.note ? "mb-4" : ""}`}>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{template.name}</h2>
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-700" />
                      <p className="text-sm font-semibold text-blue-700">{template.group}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleDownloadOriginal}
                    className="px-3 py-2 bg-white hover:bg-purple-50 rounded-lg transition-all border border-gray-200 hover:border-purple-300 group shadow-sm hover:shadow flex items-center gap-2"
                    title="Stáhnout originál šablony"
                  >
                    <Download className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-purple-700 hidden sm:inline">Stáhnout originál</span>
                  </button>
                  <button
                    onClick={handleReuploadClick}
                    disabled={isReuploading}
                    className="px-3 py-2 bg-white hover:bg-green-50 rounded-lg transition-all border border-gray-200 hover:border-green-300 group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow flex items-center gap-2"
                    title="Znovu nahrát šablonu"
                  >
                    {isReuploading ? (
                      <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-sm font-medium text-green-700 hidden sm:inline">Znovu nahrát</span>
                  </button>
                  <button
                    onClick={() => onEditTemplate(template)}
                    className="px-3 py-2 bg-white hover:bg-blue-50 rounded-lg transition-all border border-gray-200 hover:border-blue-300 group shadow-sm hover:shadow flex items-center gap-2"
                    title="Upravit šablonu"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-blue-700 hidden sm:inline">Upravit</span>
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(template)}
                    className="px-3 py-2 bg-white hover:bg-red-50 rounded-lg transition-all border border-gray-200 hover:border-red-300 group shadow-sm hover:shadow flex items-center gap-2"
                    title="Smazat šablonu"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium text-red-700 hidden sm:inline">Smazat</span>
                  </button>
                </div>
              </div>

              {/* Note */}
              {template.note && (
                <div className="flex items-start gap-3 text-gray-700 bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-blue-100 shadow-sm">
                  <div className="bg-blue-100 p-1.5 rounded-lg flex-shrink-0">
                    <StickyNote className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{template.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Generate Button - Prominent at top */}
        {onBulkGenerate && template.fields.length > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 p-2.5 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Hromadné generování z CSV</h3>
                  <p className="text-sm text-gray-600">Vygenerujte více dokumentů najednou z CSV souboru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onBulkGenerate}
                disabled={isGenerating}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Nahrát CSV
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6 mb-8">
          {template.fields.length > 0 && (
            <>
              {/* Filename input */}
              <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
                <label
                  htmlFor="fileName"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  Název vygenerovaného dokumentu
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  placeholder="Zadejte název souboru"
                  disabled={isGenerating}
                  required
                />
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800">
                  Pole v šabloně
                </h3>
              </div>
            </>
          )}

          {template.fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="bg-gray-200 p-4 rounded-full mb-3">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">
                V této šabloně nebyla nalezena žádná pole
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Přidejte pole ve formátu {"{{"} název pole {"}}"} do vašeho Word dokumentu - viz{" "}
                <button
                  type="button"
                  onClick={onHelp}
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  Nápověda
                </button>
              </p>
              <p className="text-gray-400 text-sm mt-2 italic">
                Po změně polí v šabloně použijte tlačítko pro znovu nahrání
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {template.fields.map((field) => (
                <div key={field} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
                  <label
                    htmlFor={field}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                  >
                    <Wand2 className="w-4 h-4 text-blue-600" />
                    {field}
                  </label>
                  <input
                    type="text"
                    id={field}
                    value={fieldValues[field] || ""}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    placeholder={`Zadejte ${field}`}
                    disabled={isGenerating}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-6 border-t border-gray-200">
          {/* Generate Single Document Button */}
          <button
            type="submit"
            disabled={isGenerating || template.fields.length === 0 || !fileName.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generuji...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Vygenerovat dokument
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
