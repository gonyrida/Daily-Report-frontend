import React from "react";
import SectionList from "./reference/SectionList";
import { createReferenceSection } from "@/utils/referenceHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, FileDown, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Props {
  sections: any[];
  setSections: (s: any[]) => void;
  onExportReference?: () => void;
  isExporting?: boolean;
  tableTitle?: string;
  setTableTitle?: (title: string) => void;
  hideTitle?: boolean;
  hideShadow?: boolean;
}

export default function ReferenceSection({ sections, setSections, onExportReference, isExporting = false, tableTitle, setTableTitle, hideTitle, hideShadow }: Props) {
  const updateSection = (updated: any) => setSections(sections.map((s) => (s.id === updated.id ? updated : s)));

  const deleteSection = (id: string) => setSections(sections.filter((s) => s.id !== id));

  return (
    <div className="section-card p-6">
      <div className="mb-4">
        {tableTitle !== undefined && setTableTitle && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">Table Title</label>
            <div className="relative">
              <Input 
                placeholder="Enter table title (visual only)" 
                value={tableTitle || ""}
                onChange={(e) => setTableTitle?.(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {tableTitle !== undefined && setTableTitle && (
          <div className="border-t border-muted-foreground/20 mb-4" />
        )}

        <SectionList sections={sections} onUpdate={updateSection} onDelete={deleteSection} hideTitle={hideTitle} hideShadow={hideShadow} />
      </div>
    </div>
  );
}