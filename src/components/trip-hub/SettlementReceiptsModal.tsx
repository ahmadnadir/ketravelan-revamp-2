import { useState } from "react";
import { ArrowRight, ArrowLeft, Download, ZoomIn, ZoomOut, CheckCircle2, ChevronDown, ChevronUp, Receipt, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCategoryById } from "@/lib/expenseCategories";

interface ReceiptData {
  expenseId: string;
  expenseTitle: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  payerNote?: string;
  uploadedAt?: string;
  category: string;
}

interface SettlementReceiptsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromUser: { id: string; name: string; imageUrl?: string };
  toUser: { id: string; name: string; imageUrl?: string };
  totalAmount: number;
  receipts: ReceiptData[];
  onMarkAllPaid: () => void;
  onBack?: () => void;
}

export function SettlementReceiptsModal({
  open,
  onOpenChange,
  fromUser,
  toUser,
  totalAmount,
  receipts,
  onMarkAllPaid,
  onBack,
}: SettlementReceiptsModalProps) {
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = (receiptUrl: string, expenseTitle: string) => {
    const link = document.createElement("a");
    link.href = receiptUrl;
    link.download = `receipt-${expenseTitle.replace(/\s+/g, "-").toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (expenseId: string) => {
    if (expandedReceipt === expenseId) {
      setExpandedReceipt(null);
      setZoom(1);
    } else {
      setExpandedReceipt(expenseId);
      setZoom(1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const handleConfirmPayment = () => {
    onMarkAllPaid();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none p-4 pb-4 border-b border-border/50 relative">
          {/* Back button (if secondary modal) */}
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute top-4 left-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {/* Custom Close Button */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {/* From → To Visual */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {/* From User (Payer) */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border">
                {fromUser.imageUrl ? (
                  <img src={fromUser.imageUrl} alt={fromUser.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {fromUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{fromUser.name}</span>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* To User (Receiver) */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-primary/50">
                {toUser.imageUrl ? (
                  <img src={toUser.imageUrl} alt={toUser.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-semibold text-muted-foreground">
                    {toUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{toUser.name}</span>
            </div>
          </div>

          {/* Title and Amount */}
          <DialogTitle className="text-center mt-3">
            <span className="text-muted-foreground text-sm font-normal">Payment Receipts to Verify</span>
            <span className="block text-2xl font-bold text-foreground mt-0.5">
              RM {totalAmount.toLocaleString()}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Body - Receipts List */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide p-4 space-y-3">
          {receipts.length > 0 ? (
            receipts.map((receipt) => {
              const isExpanded = expandedReceipt === receipt.expenseId;
              const categoryData = getCategoryById(receipt.category);
              
              return (
                <Card key={receipt.expenseId} className="overflow-hidden border-border/50">
                  {/* Receipt Header - Always visible */}
                  <button
                    className="w-full p-3 flex items-start gap-3 text-left hover:bg-secondary/30 transition-colors"
                    onClick={() => toggleExpand(receipt.expenseId)}
                  >
                    {/* Thumbnail */}
                    <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0 relative">
                      {receipt.receiptUrl ? (
                        <>
                          <img 
                            src={receipt.receiptUrl} 
                            alt={`Receipt for ${receipt.expenseTitle}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center px-1">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[10px] leading-tight text-muted-foreground mt-1">No receipt</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate flex items-center gap-1.5">
                            <span>{categoryData.emoji}</span>
                            {receipt.expenseTitle}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(receipt.date)}
                          </p>
                          {receipt.payerNote && (
                            <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                              "{receipt.payerNote}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="font-semibold text-foreground text-sm">
                            RM {receipt.amount.toFixed(2)}
                          </p>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Pending
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Receipt View */}
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-secondary/20">
                        {/* Receipt Image */}
                        <div className="p-4">
                          {receipt.receiptUrl ? (
                            <>
                              <div className="rounded-xl bg-secondary/30 overflow-hidden">
                                <div 
                                  className="flex items-center justify-center min-h-[200px] p-4"
                                  style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                                >
                                  <img
                                    src={receipt.receiptUrl}
                                    alt={`Receipt for ${receipt.expenseTitle}`}
                                    className="max-w-full h-auto rounded-xl shadow-lg max-h-[300px]"
                                  />
                                </div>
                              </div>
                              
                              {/* Zoom Controls */}
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleZoomOut();
                                    }}
                                    disabled={zoom <= 0.5}
                                  >
                                    <ZoomOut className="h-4 w-4" />
                                  </Button>
                                  <span className="text-xs text-muted-foreground min-w-[3rem] text-center font-medium">
                                    {Math.round(zoom * 100)}%
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleZoomIn();
                                    }}
                                    disabled={zoom >= 3}
                                  >
                                    <ZoomIn className="h-4 w-4" />
                                  </Button>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(receipt.receiptUrl, receipt.expenseTitle);
                                  }}
                                  className="gap-2 h-8 rounded-lg px-3"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-xl bg-secondary/30 p-6 text-center">
                              <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No receipt submitted yet</p>
                            </div>
                          )}

                        {/* Payer Note (full if expanded) */}
                        {receipt.payerNote && (
                          <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                            <p className="text-xs text-muted-foreground font-medium mb-1">Note from {fromUser.name}:</p>
                            <p className="text-sm text-foreground italic">"{receipt.payerNote}"</p>
                          </div>
                        )}

                        {/* Upload timestamp */}
                        {receipt.uploadedAt && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Uploaded on {formatDate(receipt.uploadedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <Card className="p-6 text-center border-border/50">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No receipts submitted yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fromUser.name} hasn't uploaded any payment proofs
              </p>
            </Card>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex-none p-4 pt-3 border-t border-border/50 space-y-3">
          {/* Summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{receipts.length} receipt{receipts.length !== 1 ? 's' : ''} submitted</span>
            <span className="font-bold text-foreground text-lg">RM {totalAmount.toLocaleString()}</span>
          </div>

          {/* Action Buttons */}
          {receipts.length > 0 && (
            <Button 
              className="w-full h-11 text-sm bg-foreground text-background hover:bg-foreground/90"
              onClick={handleConfirmPayment}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Payment Received
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
