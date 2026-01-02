import React from "react";
import Section from "./Section";
import { PlusCircle, Folder } from "lucide-react";

export default function SectionList({ sections, onUpdate, onDelete, onAdd }: any) {
  return (
    <div className="space-y-6 mb-8">
      {sections.length > 0 ? (
        sections.map((section: any) => (
          <Section key={section.id} section={section} onUpdate={onUpdate} onDelete={onDelete} />
        ))
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Folder className="w-12 h-12 text-gray-300 mb-4 mx-auto" aria-hidden="true" />
          <p className="text-gray-600 mb-4">No sections yet. Add your first section to get started.</p>
          <button onClick={onAdd} aria-label="Add first section" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary/90 transition">
            <PlusCircle className="w-5 h-5 mr-1" aria-hidden="true" />
            Add Section
          </button>
        </div>
      )}
    </div>
  );
} 