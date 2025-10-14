"use client";

import { useState, useEffect } from "react";
import { Edit2, X, FileText, FolderOpen, StickyNote, AlertCircle, Loader2 } from "lucide-react";
import { Template } from "@/types";

interface EditTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string, data: { name: string; note: string; group: string }) => Promise<void>;
  template: Template | null;
}

export default function EditTemplateDialog({
  isOpen,
  onClose,
  onEdit,
  template,
}: EditTemplateDialogProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [group, setGroup] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name);
      setNote(template.note);
      setGroup(template.group);
    }
  }, [template]);

  if (!isOpen || !template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name) {
      setError("Zadejte název");
      return;
    }

    setIsUpdating(true);

    try {
      await onEdit(template.id, { name, note, group: group || "Nezařazeno" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se aktualizovat šablonu");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
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
        <div className="flex-shrink-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Edit2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold">
                Upravit šablonu
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isUpdating}
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
                  htmlFor="edit-name"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <FileText className="w-4 h-4 text-green-600" />
                  Název šablony *
                  <span className="ml-auto text-xs text-gray-500 font-normal">
                    {name.length}/100
                  </span>
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="např. Odmítnutí přihlášky"
                  disabled={isUpdating}
                  required
                />
              </div>

              {/* Group field */}
              <div>
                <label
                  htmlFor="edit-group"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <FolderOpen className="w-4 h-4 text-green-600" />
                  Skupina
                  <span className="ml-auto text-xs text-gray-500 font-normal">
                    {group.length}/50
                  </span>
                </label>
                <input
                  type="text"
                  id="edit-group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="např. Přihlášky"
                  disabled={isUpdating}
                />
              </div>

              {/* Note field */}
              <div>
                <label
                  htmlFor="edit-note"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
                >
                  <StickyNote className="w-4 h-4 text-green-600" />
                  Poznámka
                  <span className="ml-auto text-xs text-gray-500 font-normal">
                    {note.length}/500
                  </span>
                </label>
                <textarea
                  id="edit-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  placeholder="Další poznámky k této šabloně"
                  rows={3}
                  disabled={isUpdating}
                />
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
              disabled={isUpdating}
              className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isUpdating || !name}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aktualizuji...
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Uložit změny
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
