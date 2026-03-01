import { Download } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface ViewQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  amount?: number;
  currency?: string;
  qrCodeUrl?: string;
}

export function ViewQRModal({
  open,
  onOpenChange,
  recipientName,
  amount,
  currency = "RM",
  qrCodeUrl,
}: ViewQRModalProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrCodeUrl || "/placeholder.svg";
    link.download = `payment-qr-${recipientName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center text-lg font-semibold">
            Payment QR Code
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center justify-center flex-1 py-6 space-y-6">
          {/* QR Code Display */}
          <div className="w-64 h-64 bg-white rounded-2xl p-4 shadow-lg border border-border/50">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`Payment QR for ${recipientName}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
                <div className="text-center text-muted-foreground">
                  <div className="text-4xl mb-2">📱</div>
                  <p className="text-xs">QR not available</p>
                </div>
              </div>
            )}
          </div>

          {/* Recipient Info */}
          <div className="text-center space-y-1">
            <p className="text-muted-foreground text-sm">Pay to</p>
            <p className="text-xl font-semibold text-foreground">{recipientName}</p>
            {amount !== undefined && amount > 0 && (
              <p className="text-2xl font-bold text-primary">
                {currency} {amount.toLocaleString()}
              </p>
            )}
          </div>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            className="w-full max-w-xs rounded-xl h-12"
            disabled={!qrCodeUrl}
          >
            <Download className="h-5 w-5 mr-2" />
            Download QR Code
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
