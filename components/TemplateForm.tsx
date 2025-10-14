"use client";

import { useState, useEffect } from "react";
import { FileText, FolderOpen, StickyNote, Edit3, Wand2, AlertCircle, Loader2, Download, Edit2, Trash2 } from "lucide-react";
import { Template, MergeFieldValue } from "@/types";

interface TemplateFormProps {
  template: Template;
  onGenerate: (templateId: string, mergeFields: MergeFieldValue[]) => Promise<void>;
  onEditTemplate: (template: Template) => void;
  onDeleteTemplate: (template: Template) => void;
}

export default function TemplateForm({ template, onGenerate, onEditTemplate, onDeleteTemplate }: TemplateFormProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  // Initialize field values when template changes
  useEffect(() => {
    const initialValues: Record<string, string> = {};
    template.mergeFields.forEach((field) => {
      initialValues[field] = "";
    });
    setFieldValues(initialValues);
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

    // Convert to array of merge field values
    const mergeFields: MergeFieldValue[] = Object.entries(fieldValues).map(
      ([field, value]) => ({
        field,
        value,
      })
    );

    setIsGenerating(true);

    try {
      await onGenerate(template.id, mergeFields);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepodařilo se vygenerovat dokument"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
      {/* Template Header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4 mb-2">
              <h2 className="text-3xl font-bold text-gray-800">{template.name}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditTemplate(template)}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300 group"
                  title="Upravit šablonu"
                >
                  <Edit2 className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => onDeleteTemplate(template)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300 group"
                  title="Smazat šablonu"
                >
                  <Trash2 className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>
            {template.note && (
              <div className="flex items-start gap-2 text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">
                <StickyNote className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                <p className="text-sm">{template.note}</p>
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-medium text-gray-700">{template.group}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Edit3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">
              Vyplnit pole pro hromadnou korespondenci
            </h3>
            {template.mergeFields.length > 0 && (
              <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {template.mergeFields.length} {template.mergeFields.length === 1 ? 'pole' : 'polí'}
              </span>
            )}
          </div>

          {template.mergeFields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="bg-gray-200 p-4 rounded-full mb-3">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">
                V této šabloně nebyla nalezena žádná pole
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Přidejte pole jako {"{názevPole}"} do vašeho Word dokumentu
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {template.mergeFields.map((field) => (
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
          <button
            type="submit"
            disabled={isGenerating || template.mergeFields.length === 0}
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
