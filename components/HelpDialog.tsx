"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      style={{ zIndex: 10000 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        style={{ maxWidth: "874px" }}
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
          <div className="prose max-w-none space-y-4">
            {/* Section 1: Jak začít */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("start")}
                className="w-full bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-150 p-5 flex items-center justify-between transition-colors"
              >
                <h3 className="text-xl font-bold text-gray-900">
                  Jak začít
                </h3>
                {openSection === "start" ? (
                  <ChevronUp className="w-6 h-6 text-purple-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-purple-600 flex-shrink-0" />
                )}
              </button>
              {openSection === "start" && (
                <div className="p-6 bg-white">
                  <p className="text-gray-600 mb-4">
                    Tato aplikace vám pomůže vytvářet Word dokumenty ze šablon. Můžete generovat jednotlivé dokumenty nebo hromadně z CSV souboru.
                  </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              1. Nahrát šablonu
            </h4>
            <p className="text-gray-600 mb-4">
              Klikněte na tlačítko &quot;Přidat šablonu&quot; a nahrajte Word dokument (.docx)
              s poli k doplnění. Při nahrávání přiřaďte šabloně název, poznámku a skupinu pro snadnou organizaci.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              2. Vybrat šablonu
            </h4>
            <p className="text-gray-600 mb-4">
              Vyberte šablonu z postranního panelu. Aplikace automaticky rozpozná všechna
              pole pro sloučení v dokumentu a zobrazí je.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              3a. Generovat jeden dokument
            </h4>
            <p className="text-gray-600 mb-4">
              Vyplňte hodnoty pro každé pole a zadejte název výsledného souboru.
              Klikněte na tlačítko &quot;Vygenerovat dokument&quot; a dokument se stáhne do vašeho počítače.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              3b. Hromadné generování z CSV
            </h4>
            <p className="text-gray-600 mb-4">
              Pro generování více dokumentů najednou klikněte na zelené tlačítko &quot;Nahrát CSV&quot; v horní části šablony.
              Nahrajte CSV soubor (oddělený středníky), kde první sloupec obsahuje názvy souborů a další sloupce odpovídají
              polím v šabloně. Stáhne se ZIP soubor se všemi vygenerovanými dokumenty.
            </p>

            <h4 className="font-semibold text-gray-800 mb-2">
              4. Správa šablon
            </h4>
            <p className="text-gray-600 mb-4">
              U každé šablony můžete upravit název, poznámku a skupinu (tlačítko Upravit),
              znovu nahrát soubor šablony (tlačítko Znovu nahrát), nebo šablonu smazat (tlačítko Smazat).
            </p>

                  <h4 className="font-semibold text-gray-800 mb-2">Tipy</h4>
                  <div className="text-gray-600 space-y-2">
                    <div>Používejte popisné názvy pro pole (např. {"{Jméno}"}, {"{Č.J.}"})</div>
                    <div>Seskupujte související šablony do skupin pro lepší přehlednost</div>
                    <div>Přidejte poznámky k šablonám pro zapamatování jejich účelu</div>
                    <div>Pro hromadné generování připravte CSV soubor s daty v Excelu</div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Jak vytvořit Word šablonu */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("template")}
                className="w-full bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 p-5 flex items-center justify-between transition-colors"
              >
                <h3 className="text-xl font-bold text-gray-900">
                  Jak vytvořit Word šablonu
                </h3>
                {openSection === "template" ? (
                  <ChevronUp className="w-6 h-6 text-blue-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-blue-600 flex-shrink-0" />
                )}
              </button>
              {openSection === "template" && (
                <div className="p-6 bg-white">
                  <p className="text-gray-600 mb-4">
                    Pro vytvoření Word šablony s poli k doplnění postupujte podle těchto kroků:
                  </p>

                  <div className="space-y-6 mb-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-2">1. Přidání pole</h5>
                <p className="text-gray-600 mb-3">
                  Na záložce <strong>Vložení</strong> najděte <strong>Rychlé části</strong> a pod tím <strong>Pole</strong>.
                </p>
                <img
                  src="/01-field-add.png"
                  alt="Vložení pole přes Rychlé části"
                  className="w-full rounded-lg border border-gray-300 shadow-sm"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-2">2. Nastavení MergeField</h5>
                <p className="text-gray-600 mb-3">
                  Otevře se dialogové okno, kde je potřeba najít <strong>MergeField</strong> a do pole <strong>Název pole</strong> napsat libovolné pojmenování pole.
                </p>
                <img
                  src="/02-field-dialog.png"
                  alt="Dialog pro nastavení MergeField"
                  className="w-full rounded-lg border border-gray-300 shadow-sm"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-2">3. Přidané pole</h5>
                <p className="text-gray-600 mb-3">
                  Nově přidané pole se zobrazí v místě kurzoru myši.
                </p>
                <img
                  src="/03-field-added.png"
                  alt="Přidané pole v dokumentu"
                  className="w-full rounded-lg border border-gray-300 shadow-sm"
                />
              </div>

              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <h5 className="font-semibold text-gray-800 mb-2">4. Uložení a nahrání</h5>
                <p className="text-gray-600">
                  Dokument uložte jako <strong>Word Document (*.docx)</strong> a nahrajte do systému.
                </p>
              </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Jak exportovat Excel do CSV */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection("csv")}
                className="w-full bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 p-5 flex items-center justify-between transition-colors"
              >
                <h3 className="text-xl font-bold text-gray-900">
                  Jak exportovat Excel do CSV pro hromadné generování
                </h3>
                {openSection === "csv" ? (
                  <ChevronUp className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-green-600 flex-shrink-0" />
                )}
              </button>
              {openSection === "csv" && (
                <div className="p-6 bg-white">
                  <p className="text-gray-600 mb-4">
                    Pro hromadné generování dokumentů z Excelu je potřeba soubor uložit jako CSV se středníkovým oddělovačem:
                  </p>

                  <div className="space-y-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-2">1. Otevřít Excel soubor</h5>
                <p className="text-gray-600">
                  Otevřete váš Excel soubor s daty. První sloupec bude použit jako název souboru, další sloupce musí odpovídat polím v šabloně.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-2">2. Uložit jako CSV</h5>
                <p className="text-gray-600 mb-2">
                  V menu <strong>Soubor</strong> → <strong>Uložit jako</strong> vyberte formát <strong>CSV (oddělené středníky) (*.csv)</strong> nebo <strong>CSV (Comma delimited) (*.csv)</strong>.
                </p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                <h5 className="font-semibold text-gray-800 mb-2">⚠️ Důležité: Kontrola oddělovače</h5>
                <p className="text-gray-600 mb-3">
                  Aplikace vyžaduje <strong>středníkový oddělovač (;)</strong>. Excel může v závislosti na regionálním nastavení použít čárku (,) nebo středník (;).
                </p>
                <p className="text-gray-600 mb-2">
                  <strong>Jak zkontrolovat:</strong>
                </p>
                <p className="text-gray-600 mb-2">
                  Otevřete uložený CSV soubor v textovém editoru (Poznámkový blok). Data by měla vypadat takto:
                </p>
                <div className="bg-white rounded p-2 font-mono text-sm text-gray-800 mt-2">
                  NAZEV;Č.J.;DLUŽNÍK<br />
                  dokument1;123;Jan Novák<br />
                  dokument2;456;Firma s.r.o.
                </div>
                <p className="text-gray-600 mt-3">
                  Pokud vidíte čárky místo středníků, použijte funkci Najít a nahradit (Ctrl+H) v textovém editoru a nahraďte všechny čárky středníky.
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <h5 className="font-semibold text-gray-800 mb-2">3. Nahrát do aplikace</h5>
                <p className="text-gray-600">
                  Vyberte šablonu, klikněte na tlačítko <strong>Nahrát CSV</strong> a nahrajte připravený CSV soubor. Aplikace automaticky vygeneruje Word dokument pro každý řádek.
                </p>
              </div>
                  </div>
                </div>
              )}
            </div>

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
