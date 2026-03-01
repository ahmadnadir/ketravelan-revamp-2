import { useState, useRef } from "react";
import { Upload, X, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface YourQRSectionProps {
  qrCodeUrl?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function YourQRSection({
  qrCodeUrl,
  onUpload,
  onRemove,
}: YourQRSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <Card className="p-4 border-border/50">
      <h3 className="font-semibold text-foreground mb-3 text-sm sm:text-base flex items-center gap-2">
        <QrCode className="h-4 w-4" />
        Your QR Code
      </h3>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {qrCodeUrl ? (
        <div className="space-y-3">
          <div className="relative w-full aspect-square max-w-[200px] mx-auto">
            <img
              src={qrCodeUrl}
              alt="Your payment QR"
              className="w-full h-full object-contain rounded-xl border border-border bg-white p-2"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs sm:text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs sm:text-sm text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="w-full aspect-square max-w-[200px] mx-auto border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <QrCode className="h-10 w-10 text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center px-4">
              Upload your QR so others can pay you easily
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full h-10 rounded-xl text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload QR Code
          </Button>
        </div>
      )}
    </Card>
  );
}
