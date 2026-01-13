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
  onDelete?: () => void;
  onExportReference?: () => void;
  isPreviewing?: boolean;
  isExporting?: boolean;
  isSubmitting?: boolean;
  reportId?: string;
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
  onDelete,
  isPreviewing,
  isExporting,
  isSubmitting,
  reportId,
}: ReportActionsProps) => {
  return (
    <div className="flex items-center justify-center py-6 border-t border-border mt-6">
      <div className="text-sm text-muted-foreground text-center">
        Report actions are managed from the dashboard
      </div>
    </div>
  );
};

export default ReportActions;
