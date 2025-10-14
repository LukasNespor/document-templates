"use client";

import { FileText, Upload, HelpCircle } from "lucide-react";

interface TopBarProps {
  onAddTemplate: () => void;
  onHelp: () => void;
  onHome: () => void;
}

export default function TopBar({ onAddTemplate, onHelp, onHome }: TopBarProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg z-50"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Šablony dokumentů</h1>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onAddTemplate}
            className="bg-white text-blue-600 px-5 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-all hover:shadow-lg flex items-center gap-2 shadow-md"
          >
            <Upload className="w-5 h-5" />
            <span>Přidat šablonu</span>
          </button>

          <button
            onClick={onHelp}
            className="bg-blue-800/50 px-4 py-2.5 rounded-lg font-medium hover:bg-blue-800 transition-all flex items-center gap-2 backdrop-blur-sm"
            title="Nápověda"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Nápověda</span>
          </button>
        </div>
      </div>
    </div>
  );
}
