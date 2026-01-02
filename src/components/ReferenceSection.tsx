import React from "react";
import SectionList from "./reference/SectionList";
import { createReferenceSection } from "@/utils/referenceHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image, PlusCircle, Image as ImageIcon, FileDown, FileText, FileSpreadsheet, FileType } from "lucide-react";
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
  const addSection = () => setSections([...sections, createReferenceSection()]);

  const updateSection = (updated: any) => setSections(sections.map((s) => (s.id === updated.id ? updated : s)));

  const deleteSection = (id: string) => setSections(sections.filter((s) => s.id !== id));

  return (
    <div className="section-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Image className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Reference</h2>
            <p className="text-sm text-muted-foreground">Reference images and captions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" className="min-w-[120px]">
              <Image className="w-4 h-4 mr-2" />
              Preview
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  disabled={isExporting || !onExportReference}
                  className="min-w-[140px] bg-primary hover:bg-primary/90">
                  <FileDown className="w-4 h-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportReference} disabled={isExporting || !onExportReference}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileType className="w-4 h-4 mr-2" />
                  Export Docs (Word)
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileDown className="w-4 h-4 mr-2" />
                  Download All (ZIP)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button onClick={addSection} className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2"><PlusCircle className="w-4 h-4" />Add Section</Button>
        </div>
      </div>

      <div className="mt-4">
        {/* Visual-only Table Title (UI placeholder only; no state/wiring) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Table Title</label>
          <Input 
            placeholder="Enter table title (visual only)" 
            value={tableTitle || ""}
            onChange={(e) => setTableTitle?.(e.target.value)}
          />
        </div>

        <div className="border-t border-muted-foreground/20 mb-4" />

        <SectionList sections={sections} onUpdate={updateSection} onDelete={deleteSection} onAdd={addSection} />
      </div>
    </div>
  );
}