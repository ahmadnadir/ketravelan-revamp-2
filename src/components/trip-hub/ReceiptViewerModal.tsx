import { X, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReceiptViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseTitle: string;
  receiptUrl?: string;
}

export function ReceiptViewerModal({
  open,
  onOpenChange,
  expenseTitle,
  receiptUrl,
}: ReceiptViewerModalProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    if (receiptUrl) {
      const link = document.createElement("a");
      link.href = receiptUrl;
      link.download = `receipt-${expenseTitle.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none p-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate">
              Receipt: {expenseTitle}
            </DialogTitle>
            <button 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide p-4">
          <div className="rounded-xl bg-secondary/30 min-h-[200px]">
            {receiptUrl ? (
              <div className="overflow-hidden">
                <div 
                  className="flex items-center justify-center min-h-[300px] p-4"
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                >
                  <img
                    src={receiptUrl}
                    alt={`Receipt for ${expenseTitle}`}
                    className="max-w-full h-auto rounded-xl shadow-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                <p className="text-sm">No receipt image available</p>
                <p className="text-xs mt-1">The receipt may have been uploaded as a file reference only</p>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer with Controls */}
        <div className="flex-none flex items-center justify-between p-4 border-t border-border/50">
          <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[4rem] text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {receiptUrl && (
            <Button
              variant="outline"
              onClick={handleDownload}
              className="gap-2 h-12 rounded-xl px-5"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
