import { useState } from "react";
import { Eye, Bell, CheckCircle, ImageOff, Download, ZoomIn, ZoomOut, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface MemberPayment {
  memberId: string;
  status: "pending" | "settled";
  receiptUrl?: string;
  uploadedAt?: string;
  payerNote?: string;
}

interface Member {
  id: string;
  name: string;
  imageUrl?: string;
}

interface PendingMember {
  member: Member;
  amount: number;
  payment?: MemberPayment;
}

interface ReceiptsFromOthersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingMembers: PendingMember[];
  onMarkAsReceived: (memberId: string) => void;
  onSendReminder: (memberId: string, memberName: string) => void;
}

export function ReceiptsFromOthersModal({
  open,
  onOpenChange,
  pendingMembers,
  onMarkAsReceived,
  onSendReminder,
}: ReceiptsFromOthersModalProps) {
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleDownload = (receiptUrl: string, memberName: string) => {
    const link = document.createElement("a");
    link.href = receiptUrl;
    link.download = `receipt-${memberName.replace(/\s+/g, "-").toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (payment?: MemberPayment) => {
    if (payment?.status === "settled") {
      return (
        <Badge className="text-xs px-2 py-0.5 bg-stat-green/10 text-stat-green border-stat-green/30">
          Settled
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs px-2 py-0.5 text-amber-600 border-amber-500/30 bg-amber-500/10">
        Pending
      </Badge>
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setExpandedReceipt(null);
      setZoom(1);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none p-4 pb-2 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Payment Receipts from Others
            </DialogTitle>
            <button 
              onClick={() => handleOpenChange(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide p-4 space-y-3">
          {pendingMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-stat-green" />
              <p className="font-medium">All payments settled!</p>
              <p className="text-sm">Everyone has settled their share.</p>
            </div>
          ) : (
            pendingMembers.map(({ member, amount, payment }) => {
              const isSettled = payment?.status === "settled";
              const hasReceipt = !!payment?.receiptUrl;
              const isExpanded = expandedReceipt === member.id;

              // Use provided receipt URL or mock for demo
              const receiptUrl = payment?.receiptUrl || 
                (hasReceipt ? "" : undefined);

              return (
                <Card key={member.id} className="border-border/50 overflow-hidden">
                  {/* Member Info Header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={member.imageUrl} alt={member.name || "Member"} />
                        <AvatarFallback className="text-xs">
                          {(member.name || "M").split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{member.name || "Unknown"}</p>
                        <div className="mt-1">
                          {getStatusBadge(payment)}
                        </div>
                      </div>
                      <p className="text-base font-bold text-foreground whitespace-nowrap">
                        RM {amount.toFixed(2)}
                      </p>
                    </div>

                    {/* Receipt Section */}
                    {receiptUrl ? (
                      <div className="mt-3">
                        {isExpanded ? (
                          /* Expanded Receipt View */
                          <div className="border border-border/50 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
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
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownload(receiptUrl, member.name)}
                                  className="h-7 w-7"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setExpandedReceipt(null);
                                    setZoom(1);
                                  }}
                                  className="h-7 text-xs"
                                >
                                  Collapse
                                </Button>
                              </div>
                            </div>
                            <div className="max-h-[200px] overflow-auto scrollbar-hide">
                              <div
                                className="flex items-center justify-center p-2"
                                style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
                              >
                                <img
                                  src={receiptUrl}
                                  alt="Receipt"
                                  className="rounded-lg max-w-full"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Receipt Thumbnail */
                          <div 
                            className="relative h-24 rounded-lg overflow-hidden cursor-pointer border border-border/50"
                            onClick={() => setExpandedReceipt(member.id)}
                          >
                            <img
                              src={receiptUrl}
                              alt="Receipt preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                              <div className="bg-background/90 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                                <Eye className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">View Receipt</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {payment?.payerNote && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            "{payment.payerNote}"
                          </p>
                        )}
                        {payment?.uploadedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Uploaded {payment.uploadedAt}
                          </p>
                        )}
                      </div>
                    ) : (
                      /* No Receipt */
                      <div className="mt-3 bg-muted/30 rounded-lg p-4 text-center">
                        <ImageOff className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                        <p className="text-xs text-muted-foreground">No receipt uploaded yet</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!isSettled && (
                    <>
                      <Separator />
                      <div className="p-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSendReminder(member.id, member.name)}
                          className="flex-1 text-xs gap-1.5"
                        >
                          <Bell className="h-3.5 w-3.5" />
                          Remind
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onMarkAsReceived(member.id)}
                          className="flex-1 text-xs gap-1.5"
                          disabled={!hasReceipt}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Mark as Settled
                        </Button>
                      </div>
                    </>
                  )}

                  {isSettled && (
                    <>
                      <Separator />
                      <div className="p-3 bg-stat-green/5">
                        <div className="flex items-center justify-center gap-2 text-stat-green">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Payment Settled</span>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
