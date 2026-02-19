import React, { useState } from "react";
import Slot from "@/components/reference/Slot";
import { Trash2 } from "lucide-react";
import { ConstructionIssueProps } from "@/types/constructionIssue.types";

const ConstructionIssue = ({
  issueNumber = 1,
  siteLocation = "",
  photoReference = "",
  problems = "",
  actionBy = "",
  onRemove,
}: ConstructionIssueProps) => {
  const [fields, setFields] = useState({
    siteLocation,
    photoReference,
    problems,
    actionBy,
  });
  const [slots, setSlots] = useState([
    { id: "construction-issue-photo", image: null, caption: "" },
  ]);

  const update = (key) => (e) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const onUpdateSlot = (updatedSlot) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === updatedSlot.id ? updatedSlot : slot)),
    );
  };

  const onDeleteSlot = (slotId) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, image: null, caption: "" } : slot,
      ),
    );
  };

  return (
    <div className="w-full bg-card border rounded-2xl border-muted-foreground/20 mb-4">
      {/* Issue Number Bar - Above Columns */}
      <div className="border-border p-3 bg-blue-500 dark:bg-blue-600 text-sm font-bold tracking-wide text-foreground">
        ISSUE NO. <span className="text-xl ml-2">{issueNumber}</span>
      </div>

      {/* Main Content - Left and Right Columns */}
      <div className="flex p-6">
        {/* Left Column - All Fields */}
        <div className="flex-1 border-r border-border flex flex-col">

          {/* Site Location */}
          <div className="border-border p-3 flex items-center gap-3">
            <label className="text-xs font-bold tracking-wide uppercase text-muted-foreground whitespace-nowrap">
              Site Location:
            </label>
            <input
              value={fields.siteLocation}
              onChange={update("siteLocation")}
              placeholder="Enter site location..."
              className="flex-1 bg-transparent border-0 border-input p-1 text-sm text-foreground outline-none dark:bg-card"
            />
          </div>

          {/* Problems / Descriptions */}
          <div className="border-border p-3 flex flex-col flex-1">

            <label className="block text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">
              Problems / Descriptions
            </label>
            <textarea
              value={fields.problems}
              onChange={update("problems")}
              placeholder="Describe the issue in detail..."
              className="w-full flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none dark:bg-card"

            />
          </div>

          {/* Action By */}
          <div className="border-border p-3 flex items-center gap-3">
            <label className="text-xs font-bold tracking-wide uppercase text-muted-foreground whitespace-nowrap">
              Action By:
            </label>
            <input
              value={fields.actionBy}
              onChange={update("actionBy")}
              placeholder="Responsible party..."
              className="flex-1 bg-transparent border-0 border-input p-1 text-sm text-foreground outline-none box-border transition-colors focus:border-primary dark:bg-card"
            />
          </div>
        </div>

        {/* Right Column - Photo Reference and Upload */}
        <div className="flex-1">
          {/* Photo Reference */}
          <div className="border-border p-3 flex items-center justify-center">
            <label className="block text-xs font-bold tracking-wide uppercase text-muted-foreground mb-2">
              Photo Reference
            </label>
          </div>

          {/* Photo Upload Slot */}
          <div className="p-3">
            <Slot
              slot={slots[0]}
              entryId={`construction-issue-${issueNumber}`}
              slotIndex={0}
              onUpdateSlot={onUpdateSlot}
              onDeleteSlot={onDeleteSlot}
              showCaption={false}
            />
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={onRemove}
          className="group relative px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-sm"
        >
          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
          <span>Remove Issue</span>
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
        </button>
      </div>
    </div>
  );
};

export default ConstructionIssue;
