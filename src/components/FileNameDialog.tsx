import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileNameDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
  defaultFileName: string;
  title?: string;
  description?: string;
}

const FileNameDialog: React.FC<FileNameDialogProps> = ({
  open,
  onClose,
  onConfirm,
  defaultFileName,
  title = "Enter File Name",
  description = "Please enter a name for your exported file.",
}) => {
  const [fileName, setFileName] = useState(defaultFileName);

  useEffect(() => {
    if (open) {
      setFileName(defaultFileName);
    }
  }, [open, defaultFileName]);

  const handleConfirm = () => {
    const finalFileName = fileName.trim() || defaultFileName;
    onConfirm(finalFileName);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="filename" className="text-right">
              File Name
            </Label>
            <Input
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="col-span-3"
              placeholder={defaultFileName}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileNameDialog;
