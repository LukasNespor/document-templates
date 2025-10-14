"use client";

import { useState } from "react";
import { Upload, X, FileText, FolderOpen, StickyNote, AlertCircle, Loader2 } from "lucide-react";

interface UploadTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (formData: FormData) => Promise<void>;
}

export default function UploadTemplateDialog({
  isOpen,
  onClose,
  onUpload,
}: UploadTemplateDialogProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [group, setGroup] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !file) {
      setError("Zadejte název a vyberte soubor");
      return;
    }

    if (!file.name.endsWith(".docx")) {
      setError("Nahrajte prosím soubor .docx");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("note", note);
      formData.append("group", group || "Nezařazeno");
      formData.append("file", file);

      await onUpload(formData);

      // Reset form
      setName("");
      setNote("");
      setGroup("");
      setFile(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se nahrát šablonu");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setName("");
      setNote("");
      setGroup("");
      setFile(null);
      setError("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      style={{ zIndex: 10000 }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">
                Nahrát šablonu
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              {/* Name field */}
              <div>
                <label
                  htmlFor="name"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  Název šablony *
                  <span className="ml-auto text-xs text-gray-500 font-normal">
                    {name.length}/100
                  </span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="např. Faktura"
                  disabled={isUploading}
                  required
                />
              </div>

              {/* Group field */}
              <div>
                <label
                  htmlFor="group"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  Skupina
                  <span className="ml-auto text-xs text-gray-500 font-normal">
                    {group.length}/50
                  </span>
                </label>
                <input
                  type="text"
                  id="group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="např. Faktury"
                  disabled={isUploading}
                />
              </div>

              {/* Note field */}
              <div>
                <label
                  htmlFor="note"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <StickyNote className="w-4 h-4 text-blue-600" />
                  Poznámka
                  <span className="ml-auto text-xs text-gray-500 font-normal">
                    {note.length}/500
                  </span>
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Další poznámky k této šabloně"
                  rows={3}
                  disabled={isUploading}
                />
              </div>

              {/* File field */}
              <div>
                <label
                  htmlFor="file"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  Soubor Word šablony *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="file"
                    accept=".docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isUploading}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Podporovány jsou pouze soubory .docx
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isUploading || !name || !file}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Nahrávám...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Nahrát
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
