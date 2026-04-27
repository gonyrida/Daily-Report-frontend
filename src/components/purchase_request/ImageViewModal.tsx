import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface ImageViewModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

const ImageViewModal = ({ open, onClose, imageUrl }: ImageViewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] h-[95vh] flex flex-col p-0 [&>button]:hidden">
        <div className="flex justify-end p-2">
          <DialogClose className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </DialogClose>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Image Preview"
              className="max-w-full max-h-full object-contain"
              width="85%"
              height="85%"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading image...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewModal;
