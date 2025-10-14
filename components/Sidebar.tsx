"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Menu, Folder, FolderOpen, FileText, ChevronRight, Inbox, GripVertical, ChevronsDown, ChevronsUp, Search, X, ChevronLeft } from "lucide-react";
import { Template, TemplateGroup } from "@/types";

interface SidebarProps {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onWidthChange?: (width: number) => void;
}

export default function Sidebar({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  isOpen,
  onToggle,
  onWidthChange,
}: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(346); // 20% wider than 288px
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const collapsedWidth = 60;
  const defaultWidth = 346;

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(isCollapsed ? collapsedWidth : sidebarWidth);
    }
  }, [sidebarWidth, isCollapsed, onWidthChange]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Group templates by group name (with search filtering)
  const groupedTemplates = useMemo(() => {
    // Filter templates by search query
    const filteredTemplates = templates.filter((template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, Template[]> = {};

    filteredTemplates.forEach((template) => {
      const groupName = template.group || "Nezařazeno";
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(template);
    });

    return Object.entries(groups)
      .map(([name, templates]): TemplateGroup => ({
        name,
        templates: templates.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        // "Nezařazeno" always comes first
        if (a.name === "Nezařazeno") return -1;
        if (b.name === "Nezařazeno") return 1;
        // Sort other groups alphabetically
        return a.name.localeCompare(b.name);
      });
  }, [templates, searchQuery]);

  // Auto-expand all groups when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allGroups = new Set(groupedTemplates.map(g => g.name));
      setExpandedGroups(allGroups);
    }
  }, [searchQuery, groupedTemplates]);

  // Auto-expand group containing the selected template
  useEffect(() => {
    if (selectedTemplateId) {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
      if (selectedTemplate) {
        const groupName = selectedTemplate.group || "Nezařazeno";
        setExpandedGroups(prev => new Set(prev).add(groupName));
      }
    }
  }, [selectedTemplateId, templates]);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const areAllExpanded = useMemo(() => {
    if (groupedTemplates.length === 0) return false;
    return groupedTemplates.every(g => expandedGroups.has(g.name));
  }, [groupedTemplates, expandedGroups]);

  const toggleAll = () => {
    if (areAllExpanded) {
      setExpandedGroups(new Set());
    } else {
      const allGroups = new Set(groupedTemplates.map(g => g.name));
      setExpandedGroups(allGroups);
    }
  };

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={onToggle}
        className="fixed top-20 left-4 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`sidebar-mobile sidebar-desktop fixed left-0 top-[73px] bottom-0 z-40 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 shadow-lg flex flex-col transition-all duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: isCollapsed ? `${collapsedWidth}px` : `${sidebarWidth}px`,
          minWidth: isCollapsed ? `${collapsedWidth}px` : "250px",
          maxWidth: isCollapsed ? `${collapsedWidth}px` : "600px",
          height: "calc(100vh - 73px)"
        }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5">
          {!isCollapsed && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-800">Moje šablony</h2>
                </div>
                {groupedTemplates.length > 0 && (
                  <button
                    onClick={toggleAll}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title={areAllExpanded ? "Sbalit vše" : "Rozbalit vše"}
                  >
                    {areAllExpanded ? (
                      <ChevronsUp className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronsDown className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {!isCollapsed ? (
            <>
              {/* Search input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hledat šablonu..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Vymazat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {groupedTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-gray-200 p-4 rounded-full mb-3">
                    {searchQuery ? (
                      <Search className="w-8 h-8 text-gray-400" />
                    ) : (
                      <Inbox className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  {searchQuery ? (
                    <>
                      <p className="text-gray-500 text-sm font-medium">Žádné výsledky</p>
                      <p className="text-gray-400 text-xs mt-1">Zkuste jiný hledaný výraz</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-sm font-medium">Zatím žádné šablony</p>
                      <p className="text-gray-400 text-xs mt-1">Nahrajte svou první šablonu</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedTemplates.map((group) => (
                    <div key={group.name} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(group.name)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedGroups.has(group.name) ? (
                            <FolderOpen className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Folder className="w-5 h-5 text-gray-600" />
                          )}
                          <span className="font-semibold text-gray-800 text-sm">
                            {group.name}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {group.templates.length}
                          </span>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedGroups.has(group.name) ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {/* Group items */}
                      {expandedGroups.has(group.name) && (
                        <div className="bg-gray-50 border-t border-gray-200">
                          {group.templates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => onSelectTemplate(template.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all ${
                                selectedTemplateId === template.id
                                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
                                  : "hover:bg-white text-gray-700 border-l-4 border-transparent"
                              }`}
                            >
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span className="text-sm truncate">{template.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Collapsed view - show only icons
            <div className="flex flex-col items-center gap-4 mt-4">
              {groupedTemplates.map((group) => (
                <div key={group.name}>
                  {group.templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => onSelectTemplate(template.id)}
                      className={`p-3 rounded-lg transition-all mb-2 ${
                        selectedTemplateId === template.id
                          ? "bg-blue-100"
                          : "hover:bg-gray-200"
                      }`}
                      title={template.name}
                    >
                      <FileText className={`w-5 h-5 ${
                        selectedTemplateId === template.id
                          ? "text-blue-700"
                          : "text-gray-600"
                      }`} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapse Toggle Button - Sticky at bottom */}
        <div className={`hidden lg:flex p-3 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 sticky bottom-0 ${
          isCollapsed ? "justify-center" : "justify-end"
        }`}>
          <button
            onClick={toggleCollapse}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md"
            title={isCollapsed ? "Rozbalit postranní panel" : "Sbalit postranní panel"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-white" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Resize handle - only show when not collapsed */}
        {!isCollapsed && (
          <div
            className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group"
            onMouseDown={handleMouseDown}
            style={{
              backgroundColor: isResizing ? "#3b82f6" : "transparent"
            }}
          >
            <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
