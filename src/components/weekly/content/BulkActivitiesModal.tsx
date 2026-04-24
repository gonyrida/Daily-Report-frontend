// src/components/weekly/content/BulkActivitiesModal.tsx
// Modal wrapper for bulk activities input

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BulkActivitiesInput from "./BulkActivitiesInput";
import { ActivityRow } from "@/types/activity.types";

interface BulkActivitiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (weeklyActivities: ActivityRow[], nextWeekPlan: ActivityRow[]) => void;
  context: "weekly" | "next";
}

export default function BulkActivitiesModal({ 
  open, 
  onOpenChange, 
  onImport,
  context 
}: BulkActivitiesModalProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleImport = (weeklyActivities: ActivityRow[], nextWeekPlan: ActivityRow[]) => {
    onImport(weeklyActivities, nextWeekPlan);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Bulk Activities Input - {context === "weekly" ? "Activities Of Work Done" : "Next Week Plan"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <BulkActivitiesInput 
          onImport={handleImport}
          onClose={handleClose}
          context={context}
        />
      </DialogContent>
    </Dialog>
  );
}
