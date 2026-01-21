import React from "react";
import Section from "./Section";

export default function SectionList({ sections, onUpdate, onDelete }: any) {
  return (
    <div className="space-y-6 mb-8">
      {sections.map((section: any) => (
        <Section key={section.id} section={section} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}