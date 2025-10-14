"use client";

import { X } from "lucide-react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      style={{ zIndex: 10000 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold">Nápověda</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6 mb-4">
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Jak začít
            </h3>
            <p className="text-gray-600 mb-4">
              Tato aplikace vám pomůže vytvářet Word dokumenty ze šablon
              s polem pro hromadnou korespondenci. Jak ji používat:
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              1. Nahrát šablonu
            </h4>
            <p className="text-gray-600 mb-4">
              Klikněte na tlačítko &quot;Přidat šablonu&quot; a nahrajte Word dokument (.docx),
              který obsahuje pole pro hromadnou korespondenci. Tato pole jsou zástupné symboly
              ve vašem dokumentu zapsané jako {"{názevPole}"}.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              2. Organizovat šablony
            </h4>
            <p className="text-gray-600 mb-4">
              Při nahrávání můžete šabloně přiřadit název, poznámku a skupinu.
              Skupiny pomáhají organizovat šablony v postranním panelu pro snadný
              přístup.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              3. Vyplnit pole pro hromadnou korespondenci
            </h4>
            <p className="text-gray-600 mb-4">
              Vyberte šablonu z postranního panelu. Aplikace zobrazí všechna
              pole nalezená v dokumentu. Vyplňte hodnoty pro každé pole.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              4. Generovat dokument
            </h4>
            <p className="text-gray-600 mb-4">
              Klikněte na tlačítko &quot;Vygenerovat&quot; a vytvořte nový Word dokument
              s vyplněnými poli. Dokument se stáhne do vašeho počítače.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">Tipy</h4>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>
                Používejte popisné názvy pro vaše pole (např. {"{jméno}"},{" "}
                {"{názevFirmy}"})
              </li>
              <li>
                Seskupujte související šablony dohromady pro lepší organizaci
              </li>
              <li>
                Přidejte poznámky k šablonám, abyste si pamatovali jejich účel
                nebo speciální instrukce
              </li>
            </ul>

            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg hover:shadow-xl"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
