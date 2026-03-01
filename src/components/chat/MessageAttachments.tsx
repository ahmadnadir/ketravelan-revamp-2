/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import type { ChatAttachment } from "@/lib/conversations";
import { FileText, MapPin, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface MessageAttachmentsProps {
  attachments: ChatAttachment[];
  isOwn?: boolean;
}

// WhatsApp-like attachment rendering inside a bubble
export function MessageAttachments({ attachments, isOwn }: MessageAttachmentsProps) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.type === "image");
  const documents = attachments.filter((a) => a.type === "document");
  const locations = attachments.filter((a) => a.type === "location");

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const formatBytes = (bytes?: number): string => {
    const b = Number(bytes || 0);
    if (!b) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let val = b;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Images: grid like WhatsApp */}
      {images.length > 0 && (
        images.length === 1 ? (
          <button
            type="button"
            className="block"
            onClick={() => {
              setImageIndex(0);
              setImageModalOpen(true);
            }}
          >
            <img
              src={images[0].url}
              alt={images[0].name || "Image"}
              className="rounded-xl w-full max-h-[420px] object-cover"
            />
          </button>
        ) : (
          <div
            className={
              images.length === 2
                ? "grid grid-cols-2 gap-2"
                : images.length === 3
                ? "grid grid-cols-2 gap-2"
                : "grid grid-cols-2 sm:grid-cols-3 gap-2"
            }
          >
            {images.slice(0, 6).map((att, idx) => (
              <button
                key={idx}
                type="button"
                className="block"
                onClick={() => {
                  setImageIndex(idx);
                  setImageModalOpen(true);
                }}
              >
                <img
                  src={att.url}
                  alt={att.name || "Image"}
                  className="rounded-lg w-full h-44 sm:h-48 object-cover"
                />
              </button>
            ))}
          </div>
        )
      )}

      {/* Documents: chips with icon + name */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-2">
          {documents.map((att, idx) => (
            <a
              key={idx}
              href={att.url}
              target="_blank"
              rel="noreferrer"
              className={
                "flex items-center gap-2 px-3 py-2 rounded-lg border " +
                  (isOwn ? "bg-[#0f0f0f] border-[#1f1f1f] text-white" : "bg-muted border-border")
              }
            >
              <div className={"flex items-center justify-center h-8 w-8 shrink-0 rounded-md " + (isOwn ? "bg-[#1a1a1a]" : "bg-background")}>
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ maxWidth: "200px" }}>{att.name || "Document"}</div>
                <div className="text-xs opacity-60">{formatBytes((att as any).size)}</div>
              </div>
              <Download className="h-4 w-4 opacity-60 shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* Locations: simple card with maps link */}
      {locations.length > 0 && (
        <div className="flex flex-col gap-2">
          {locations.map((att, idx) => (
            <div key={idx} className="space-y-2">
              {/* Map preview (embed) */}
              <div className="rounded-xl overflow-hidden">
                <iframe
                  title="Location preview"
                  src={`https://www.google.com/maps?q=${att.lat},${att.lng}&z=15&output=embed`}
                  className="w-full h-40 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Info row with link */}
              <a
                href={`https://www.google.com/maps?q=${att.lat},${att.lng}`}
                target="_blank"
                rel="noreferrer"
                className={
                  "flex items-center gap-3 px-3 py-2 rounded-xl border " +
                         (isOwn ? "bg-[#0f0f0f] border-[#1f1f1f] text-white" : "bg-muted border-border")
                }
              >
                <div className={"flex items-center justify-center h-9 w-9 rounded-lg " + (isOwn ? "bg-[#1a1a1a]" : "bg-background")}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">View Location</div>
                  <div className="text-xs opacity-70">{att.lat?.toFixed(5)}, {att.lng?.toFixed(5)}</div>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {images.length > 0 && (
        <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
          <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-black/95">
            <div className="relative w-full h-full flex items-center justify-center">
              {images.length > 1 && (
                <div className="absolute inset-x-0 top-0 flex justify-between p-4">
                  <button
                    type="button"
                    onClick={() => setImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                    className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    {/* left chevron */}
                    <span className="sr-only">Previous</span>
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageIndex((prev) => (prev + 1) % images.length)}
                    className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    {/* right chevron */}
                    <span className="sr-only">Next</span>
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              )}
              <img
                src={images[imageIndex]?.url}
                alt={images[imageIndex]?.name || "Image"}
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-3 py-1 rounded-full">
                {imageIndex + 1} / {images.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
