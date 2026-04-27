import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  title: string;
  message: string;
  showNotes?: boolean;
  notesLabel?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  showNotes = false,
  notesLabel = 'Reason for revision (optional)',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false
}) => {
  const [notes, setNotes] = useState('');

  // Reset notes when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(showNotes ? notes : undefined);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{message}</p>

          {showNotes && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{notesLabel}</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter your reason for revising this request..."
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
