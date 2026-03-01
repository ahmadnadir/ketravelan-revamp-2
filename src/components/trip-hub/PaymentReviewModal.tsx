import { useState } from "react";
import { Download, ZoomIn, ZoomOut, ImageIcon, CheckCircle, Bell, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ExpensePayment } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyCode, formatCurrencySpaced } from "@/lib/currencyUtils";

interface Member {
  id: string;
  name: string;
  imageUrl?: string;
}

interface PaymentReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  amount: number;
  payment: ExpensePayment | null;
  onConfirmReceived: () => void;
  onRemind?: (memberId: string) => void;
  expenseId?: string;
  isLoading?: boolean;
  currencyCode?: CurrencyCode;
}

export function PaymentReviewModal({
  open,
  onOpenChange,
  member,
  amount,
  payment,
  onConfirmReceived,
  onRemind,
  expenseId,
  isLoading = false,
  currencyCode = "MYR",
}: PaymentReviewModalProps) {
  const [zoom, setZoom] = useState(1);

  if (!member || !payment) return null;

  const isSettled = payment.status === "settled";
  const hasReceipt = !!payment.receiptUrl;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleDownload = () => {
    if (payment.receiptUrl) {
      const link = document.createElement("a");
      link.href = payment.receiptUrl;
      link.download = `payment-receipt-${member.name.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusBadge = () => (
    <StatusBadge status={payment.status === "settled" ? "settled" : "pending"} size="md" />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none p-4 pb-3 border-b border-border/50">
          <DialogTitle className="sr-only">Payment Review for {member.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Review payment details and proof of payment for {member.name}
          </DialogDescription>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.imageUrl} alt={member.name} />
                <AvatarFallback>{member.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{member.name}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrencySpaced(Number(amount.toFixed(2)), currencyCode)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <button 
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide p-4 space-y-4">
          {/* Settled Banner */}
          {isSettled && (
            <Card className="p-4 bg-stat-green/10 border-stat-green/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-stat-green" />
                <div>
                  <p className="font-medium text-foreground">Payment Settled</p>
                  <p className="text-sm text-muted-foreground">This payment has been confirmed.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Proof of Payment Section */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Proof of Payment</h3>
            
            {hasReceipt ? (
              <Card className="overflow-hidden border-border/50">
                {/* Zoom Controls */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-secondary/30">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomOut}
                      className="h-7 w-7"
                      disabled={zoom <= 0.5}
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-10 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleZoomIn}
                      className="h-7 w-7"
                      disabled={zoom >= 3}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>

                {/* Receipt Image */}
                <div className="max-h-[280px] overflow-auto scrollbar-hide">
                  <div
                    className="flex items-center justify-center p-2"
                    style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
                  >
                    <img
                      src={payment.receiptUrl}
                      alt="Payment receipt"
                      className="rounded-lg max-w-full"
                    />
                  </div>
                </div>

                {/* Upload Timestamp */}
                {payment.uploadedAt && (
                  <div className="px-3 py-2 border-t border-border/50 bg-secondary/20">
                    <p className="text-[11px] text-muted-foreground">
                      Uploaded {payment.uploadedAt}
                    </p>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-6 text-center border-border/50">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No receipt uploaded yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {member.name} hasn't submitted proof of payment.
                </p>
              </Card>
            )}
          </div>

          {/* Send Reminder Button - Only show if pending payment */}
          {!isSettled && !hasReceipt && onRemind && expenseId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onRemind(member.id)}
              disabled={isLoading}
            >
              <Bell className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : "Remind"}
            </Button>
          )}

          {/* Payer Note */}
          {payment.payerNote && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2">Payer's Note</h3>
              <Card className="p-3 border-border/50 bg-secondary/20">
                <p className="text-sm text-foreground italic">"{payment.payerNote}"</p>
              </Card>
            </div>
          )}

          {/* Action Button - Only show if not settled and has receipt */}
          {!isSettled && hasReceipt && (
            <Button
              className="w-full"
              onClick={onConfirmReceived}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm & Mark as Settled
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
