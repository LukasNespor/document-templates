"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Upload, Sparkles, TrendingUp, FileCheck, Hash, Calendar, Clock, Info } from "lucide-react";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import HelpDialog from "@/components/HelpDialog";
import UploadTemplateDialog from "@/components/UploadTemplateDialog";
import EditTemplateDialog from "@/components/EditTemplateDialog";
import BulkGenerateDialog from "@/components/BulkGenerateDialog";
import ProfileDialog from "@/components/ProfileDialog";
import UserManagementDialog from "@/components/UserManagementDialog";
import TemplateForm from "@/components/TemplateForm";
import { Template, FieldValue, Statistics } from "@/types";

export default function Home() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(346);
  const [isDesktop, setIsDesktop] = useState(false);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [salutation, setSalutation] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canBulkGenerate, setCanBulkGenerate] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  // Check if desktop on mount and resize
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Load templates and statistics on mount
  useEffect(() => {
    loadTemplates();
    loadStatistics();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (data.isLoggedIn && data.user) {
        setUsername(data.user.username);
        setSalutation(data.user.salutation || null);
        setIsAdmin(data.user.isAdmin || false);
        setCanBulkGenerate(data.user.canBulkGenerate || false);
        setUserId(data.user.userId || "");
      }
    } catch (error) {
      console.error("Failed to check session:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleProfileUpdate = (newUsername: string, newSalutation?: string) => {
    setUsername(newUsername);
    setSalutation(newSalutation || null);
  };

  // Load selected template details when selection changes
  // Reload statistics when returning to home (selectedTemplateId becomes null)
  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateDetails(selectedTemplateId);
    } else {
      setSelectedTemplate(null);
      // Reload statistics when viewing home page
      loadStatistics();
    }
  }, [selectedTemplateId]);

  // Reload statistics when window/tab regains focus
  useEffect(() => {
    const handleFocus = () => {
      // Only reload stats if we're on home page (no template selected)
      if (!selectedTemplateId) {
        loadStatistics();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedTemplateId]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch("/api/statistics");

      if (!response.ok) {
        console.error("Failed to load statistics:", response.statusText);
        // Set default statistics on error
        setStatistics({
          currentTemplateCount: 0,
          totalTemplatesCreated: 0,
          totalFilesGenerated: 0,
          totalFieldsFilled: 0,
          lastGenerationDate: null,
          savedTimeSeconds: 0,
        });
        return;
      }

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      // Set default statistics on error
      setStatistics({
        currentTemplateCount: 0,
        totalTemplatesCreated: 0,
        totalFilesGenerated: 0,
        totalFieldsFilled: 0,
        lastGenerationDate: null,
        savedTimeSeconds: 0,
      });
    }
  };

  const loadTemplateDetails = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();
      setSelectedTemplate(data.template);
    } catch (error) {
      console.error("Failed to load template details:", error);
    }
  };

  const handleUpload = async (formData: FormData) => {
    const response = await fetch("/api/templates/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Nahrání selhalo");
    }

    // Get the uploaded template data
    const data = await response.json();
    const uploadedTemplateId = data.template?.id;

    // Reload templates and statistics after upload
    await loadTemplates();
    loadStatistics();

    // Automatically select the newly uploaded template
    if (uploadedTemplateId) {
      setSelectedTemplateId(uploadedTemplateId);
    }
  };

  const handleGenerate = async (
    templateId: string,
    fields: FieldValue[],
    fileName: string
  ) => {
    const response = await fetch("/api/templates/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ templateId, fields, fileName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Generování selhalo");
    }

    // Get filename from Content-Disposition header or use provided fileName
    const contentDisposition = response.headers.get("Content-Disposition");
    let downloadFileName = `${fileName}.docx`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        downloadFileName = filenameMatch[1];
      }
    }

    // Download the generated file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Reload statistics after generation
    loadStatistics();
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (
    id: string,
    data: { name: string; note: string; group: string }
  ) => {
    const response = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Aktualizace selhala");
    }

    // Reload templates after update
    await loadTemplates();

    // Reload selected template if it was edited
    if (selectedTemplateId === id) {
      await loadTemplateDetails(id);
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Opravdu chcete smazat šablonu "${template.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Mazání selhalo");
      }

      // Clear selection if deleted template was selected
      if (selectedTemplateId === template.id) {
        setSelectedTemplateId(null);
      }

      // Reload templates and statistics after delete
      await loadTemplates();
      loadStatistics();
    } catch (error) {
      alert(`Chyba při mazání: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
    }
  };

  const handleReuploadTemplate = async (templateId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/templates/${templateId}/reupload`, {
      method: "PUT",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Znovu nahrání selhalo");
    }

    // Reload templates after reupload
    await loadTemplates();

    // Reload selected template to get updated merge fields
    if (selectedTemplateId === templateId) {
      await loadTemplateDetails(templateId);
    }
  };

  // Format saved time for display
  const formatSavedTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-[73px]">
      {/* Top Bar */}
      <TopBar
        onAddTemplate={() => setIsUploadOpen(true)}
        onHelp={() => setIsHelpOpen(true)}
        onHome={() => setSelectedTemplateId(null)}
        username={username || undefined}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onProfileClick={() => setIsProfileOpen(true)}
        onManageUsers={() => setIsUserManagementOpen(true)}
      />

      <div>
        {/* Sidebar */}
        <Sidebar
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onWidthChange={setSidebarWidth}
          onAddTemplate={() => setIsUploadOpen(true)}
        />

        {/* Main Content */}
        <main
          className="p-6 transition-all duration-200 lg:ml-[346px]"
          style={{ marginLeft: isDesktop && sidebarWidth !== 346 ? `${sidebarWidth}px` : undefined }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-2xl mb-4 shadow-lg">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
              <p className="text-gray-600 font-medium text-lg">Načítám šablony...</p>
            </div>
          ) : selectedTemplate ? (
            <TemplateForm
              template={selectedTemplate}
              onGenerate={handleGenerate}
              onEditTemplate={handleEditTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onReuploadTemplate={handleReuploadTemplate}
              onHelp={() => setIsHelpOpen(true)}
              onBulkGenerate={canBulkGenerate ? () => setIsBulkGenerateOpen(true) : undefined}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 rounded-full"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-3xl shadow-2xl">
                  <FileText className="w-16 h-16 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-3 flex items-center gap-3">
                {salutation ? `Vítejte, ${salutation}` : "Vítejte v Šablonách dokumentů"}
                <Sparkles className="w-7 h-7 text-yellow-500" />
              </h2>

              <p className="text-gray-600 text-base mb-6 text-center max-w-2xl leading-relaxed">
                {templates.length === 0
                  ? "Transformujte svůj pracovní postup s dokumenty! Nahrajte Word šablony s proměnnými a generujte přizpůsobené dokumenty během okamžiku."
                  : "Vyberte šablonu z postranního panelu, vyplňte pole a vygenerujte svůj přizpůsobený dokument."}
              </p>

              {templates.length === 0 && (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-base group mb-6"
                >
                  <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Nahrajte svou první šablonu
                </button>
              )}

              {/* Statistics Section */}
              {statistics && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 w-full max-w-4xl">
                  {/* Current Templates */}
                  <div className="bg-white rounded-xl p-4 shadow-md border border-blue-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{statistics.currentTemplateCount}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      Aktuální šablony
                      <div className="group relative inline-block">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-10">
                          Počet vašich aktuálních šablon
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Templates Created */}
                  <div className="bg-white rounded-xl p-4 shadow-md border border-green-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{statistics.totalTemplatesCreated}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      Vytvořené šablony
                      <div className="group relative inline-block">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-10">
                          Celkový počet vašich vytvořených šablon včetně smazaných
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Files Generated */}
                  <div className="bg-white rounded-xl p-4 shadow-md border border-purple-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <FileCheck className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{statistics.totalFilesGenerated}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      Vygenerované dokumenty
                      <div className="group relative inline-block">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-10">
                          Celkový počet vašich vygenerovaných dokumentů ze šablon
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fields Filled */}
                  <div className="bg-white rounded-xl p-4 shadow-md border border-orange-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Hash className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{statistics.totalFieldsFilled}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      Vyplněná pole
                      <div className="group relative inline-block">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-10">
                          Celkový počet vašich vyplněných polí napříč všemi dokumenty
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Saved Time */}
                  <div className="bg-white rounded-xl p-4 shadow-md border border-teal-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {formatSavedTime(statistics.savedTimeSeconds)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      Ušetřený čas
                      <div className="group relative inline-block">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-10">
                          Váš odhadovaný ušetřený čas použitím šablon. Počítáno jako: 30s za dokument (kopírování, otevření) + 20s za každé vyplněné pole
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Last Generation */}
                  <div className="bg-white rounded-xl p-4 shadow-md border border-pink-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {statistics.lastGenerationDate
                        ? new Date(statistics.lastGenerationDate).toLocaleDateString("cs-CZ")
                        : "Nikdy"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      Poslední generování
                      <div className="group relative inline-block">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-10">
                          Datum vašeho posledního vygenerování dokumentu
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Dialogs */}
      <HelpDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        canBulkGenerate={canBulkGenerate}
      />
      <UploadTemplateDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
      />
      <EditTemplateDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onEdit={handleEditSubmit}
        template={editingTemplate}
      />
      {selectedTemplate && (
        <BulkGenerateDialog
          isOpen={isBulkGenerateOpen}
          onClose={() => setIsBulkGenerateOpen(false)}
          onSuccess={() => loadStatistics()}
          template={selectedTemplate}
        />
      )}
      <ProfileDialog
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUsername={username || ""}
        currentSalutation={salutation || undefined}
        onProfileUpdate={handleProfileUpdate}
      />
      <UserManagementDialog
        isOpen={isUserManagementOpen}
        onClose={() => {
          setIsUserManagementOpen(false);
          // Reload session in case user edited their own profile
          checkSession();
        }}
        currentUserId={userId}
      />
    </div>
  );
}
