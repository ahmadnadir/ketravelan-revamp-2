import { useEffect, useState } from "react";
import { Send, Mail, MessageCircle, Bell, X, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface SendReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  amount: number;
  tripName: string;
  lastReminderSent?: Date;
  onSend: (message: string) => Promise<void> | void;
  // Back navigation (for secondary modal flow)
  onBack?: () => void;
}

export function SendReminderModal({
  open,
  onOpenChange,
  recipientName,
  amount,
  tripName,
  lastReminderSent,
  onSend,
  onBack,
}: SendReminderModalProps) {
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;
  const amountDisplay = normalizedAmount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const tripLabel = /\btrip\b/i.test(tripName) ? tripName : `${tripName} trip`;
  const defaultMessage = `Hey 👋 Just a reminder to settle RM${amountDisplay} for our ${tripLabel}. Thanks!`;
  const [message, setMessage] = useState(defaultMessage);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
    }
  }, [defaultMessage, open]);

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      await onSend(message);
      toast({
        title: "Reminder sent",
        description: `Payment reminder sent to ${recipientName} via notification, chat, and email`,
      });
      onOpenChange(false);
      setMessage(defaultMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send reminder.";
      toast({
        title: "Failed to send reminder",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl p-0 flex flex-col overflow-hidden max-h-[85vh] [&>button]:hidden">
        {/* Fixed Header */}
        <DialogHeader className="flex-none p-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            {/* Back button (if secondary modal) */}
            {onBack ? (
              <button 
                onClick={onBack}
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-8" />
            )}
            <DialogTitle className="text-lg font-semibold flex-1 text-center">Send Payment Reminder</DialogTitle>
            <button 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide p-4 space-y-4">
          <div className="p-4 bg-secondary/50 rounded-xl">
            <p className="text-sm text-muted-foreground">
              Remind <span className="font-medium text-foreground">{recipientName}</span> to pay{" "}
              <span className="font-medium text-foreground">RM {amountDisplay}</span>
            </p>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your reminder message..."
            className="min-h-[100px] resize-none rounded-xl"
            disabled={isSending}
          />

          {/* Multi-channel notification info */}
          <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/50">
            <div className="flex gap-1.5 mt-0.5">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              This will be sent via in-app notification, chat, and email.
            </p>
          </div>

          {/* Last reminder sent timestamp */}
          {lastReminderSent && (
            <p className="text-xs text-muted-foreground/70 text-center">
              Last reminder sent {formatDistanceToNow(lastReminderSent)} ago
            </p>
          )}

        </div>

        {/* Fixed Footer */}
        <div className="flex-none p-4 pt-3 border-t border-border/50">
          <Button className="w-full h-12 rounded-xl" onClick={handleSend} disabled={isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Reminder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
