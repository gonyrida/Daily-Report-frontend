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
}

export default function ReferenceSection({ sections, setSections, onExportReference, isExporting = false, tableTitle, setTableTitle }: Props) {
  const updateSection = (updated: any) => setSections(sections.map((s) => (s.id === updated.id ? updated : s)));

  const deleteSection = (id: string) => setSections(sections.filter((s) => s.id !== id));

  return (
    <div className="section-card p-6">
      <div className="mb-4">
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Table Title</label>
          <Input 
            placeholder="Enter table title (visual only)" 
            value={tableTitle || ""}
            onChange={(e) => setTableTitle?.(e.target.value)}
          />
        </div>

        <div className="border-t border-muted-foreground/20 mb-4" />

        <SectionList sections={sections} onUpdate={updateSection} onDelete={deleteSection} />
      </div>
    </div>
  );
}