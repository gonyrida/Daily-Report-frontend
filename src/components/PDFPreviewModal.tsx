import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface PDFPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string | null;
}

const PDFPreviewModal = ({ open, onClose, pdfUrl }: PDFPreviewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] h-[95vh] flex flex-col p-0 [&>button]:hidden">
        <div className="flex justify-end p-2">
          <DialogClose className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </DialogClose>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading preview...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewModal;
