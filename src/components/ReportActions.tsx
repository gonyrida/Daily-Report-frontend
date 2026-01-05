import {
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileType,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReportActionsProps {
  onPreview: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onExportDocs: () => void;
  onExportAll: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onExportReference?: () => void;
  isPreviewing?: boolean;
  isExporting?: boolean;
  isSubmitting?: boolean;
}

const ReportActions = ({
  onPreview,
  onExportPDF,
  onExportExcel,
  onExportReference,
  onExportDocs,
  onExportAll,
  onClear,
  onSubmit,
  isPreviewing,
  isExporting,
  isSubmitting,
}: ReportActionsProps) => {
  return (
    <div className="flex items-center justify-between py-6 border-t border-border mt-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="w-4 h-4" />
        <span>All fields marked with * are required</span>
      </div>

      <div className="flex items-center gap-3">
        {/* DISABLED: Clear button - commented out to disable
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="min-w-[120px]">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to clear?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action will clear all the data in the form. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClear}>Clear</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        */}

        {/* DISABLED: Preview button - commented out to disable
        <Button
          variant="outline"
          onClick={onPreview}
          disabled={isPreviewing}
          className="min-w-[120px]"
        >
          <Eye className="w-4 h-4 mr-2" />
          {isPreviewing ? "Loading..." : "Preview"}
        </Button>
        */}

      

        {/* DISABLED: Submit button - commented out to disable
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="min-w-[120px] bg-green-600 hover:bg-green-700"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
        */}
      </div>
    </div>
  );
};

export default ReportActions;
