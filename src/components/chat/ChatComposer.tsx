/* eslint-disable no-empty */
import { useEffect, useState, useRef } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttachmentSheet } from "./AttachmentSheet";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { getMentionSuggestions } from "@/lib/chatMentions";

import type { ChatAttachment } from "@/lib/conversations";
import { uploadChatFile, getCurrentLocation } from "@/lib/chatAttachments";

type PendingAttachment =
  | { type: "image"; file: File; previewUrl: string }
  | { type: "document"; file: File }
  | { type: "location"; lat: number; lng: number };

export interface TripMember {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface ChatComposerProps {
  onSend: (message: string, attachments?: ChatAttachment[], mentionedUserIds?: string[]) => void;
  placeholder?: string;
  onTypingChange?: (typing: boolean) => void;
  tripMembers?: TripMember[];
}

export function ChatComposer({ onSend, placeholder = "Type a message...", onTypingChange, tripMembers = [] }: ChatComposerProps) {
  const [message, setMessage] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<TripMember[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardHeight = useKeyboardHeight();

  const handleSend = async () => {
    if (!message.trim() && pendingAttachments.length === 0) return;
    // Upload files now (on send)
    const uploaded: ChatAttachment[] = [];
    for (const att of pendingAttachments) {
      if (att.type === "image" || att.type === "document") {
        try {
          const up = await uploadChatFile(att.file);
          uploaded.push({ type: up.type, url: up.url, name: up.name, mime: up.mime, size: up.size });
        } catch (e) {
          console.error("Upload failed", e);
        }
      } else if (att.type === "location") {
        uploaded.push({ type: "location", lat: att.lat, lng: att.lng });
      }
    }

    // Extract mentioned user IDs from message content
    const mentionRegex = /@(\w[\w._]*)/g;
    const mentionedUserIds: string[] = [];
    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
      const username = match[1];
      const member = tripMembers.find(m => m.username?.toLowerCase() === username.toLowerCase());
      if (member && !mentionedUserIds.includes(member.id)) {
        mentionedUserIds.push(member.id);
      }
    }

    onSend(message.trim(), uploaded, mentionedUserIds.length > 0 ? mentionedUserIds : undefined);
    // Cleanup previews
    pendingAttachments.forEach((att) => {
      if (att.type === "image") {
        try { URL.revokeObjectURL(att.previewUrl); } catch {}
      }
    });
    setMessage("");
    setPendingAttachments([]);
  };

  const imageInputId = "chat-image-input";
  const fileInputId = "chat-file-input";

  const handleAttachment = async (type: "image" | "document" | "location") => {
    if (type === "image") {
      const el = document.getElementById(imageInputId) as HTMLInputElement | null;
      el?.click();
    } else if (type === "document") {
      const el = document.getElementById(fileInputId) as HTMLInputElement | null;
      el?.click();
    } else if (type === "location") {
      const loc = await getCurrentLocation();
      if (loc) {
        setPendingAttachments(prev => [...prev, { type: "location", lat: loc.lat, lng: loc.lng }]);
      }
    }
    setAttachmentOpen(false);
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items: PendingAttachment[] = [];
    for (const f of Array.from(files)) {
      const isImage = (f.type || "").startsWith("image/");
      if (isImage) {
        const previewUrl = URL.createObjectURL(f);
        items.push({ type: "image", file: f, previewUrl });
      } else {
        items.push({ type: "document", file: f });
      }
    }
    if (items.length > 0) setPendingAttachments(prev => [...prev, ...items]);
  };

  // When keyboard is open, position above keyboard; otherwise use default nav-aware position
  const bottomStyle = keyboardHeight > 0 
    ? { bottom: `${keyboardHeight}px` } 
    : undefined;

  // Typing detection with mention support
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = e.target.value;
    const newCursorPos = e.currentTarget.selectionStart || 0;

    setMessage(newMessage);
    setCursorPosition(newCursorPos);

    // Check for mention suggestions
    const suggestions = getMentionSuggestions(newMessage, tripMembers, newCursorPos);
    if (suggestions && suggestions.members.length > 0) {
      setMentionSuggestions(suggestions.members);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionSuggestions([]);
    }

    if (typeof onTypingChange === "function") {
      onTypingChange(newMessage.length > 0);
    }
  };

  const handleMentionSelect = (member: TripMember) => {
    // Find the @ symbol position
    const atIndex = message.lastIndexOf('@');
    if (atIndex === -1) return;

    // Get text before @
    const beforeMention = message.substring(0, atIndex);
    // Get text after cursor (if any)
    const afterCursor = message.substring(cursorPosition);

    // Create new message with mention
    const newMessage = `${beforeMention}@${member.username} ${afterCursor}`;
    setMessage(newMessage);
    setShowMentionDropdown(false);
    setMentionSuggestions([]);

    // Update cursor position
    const newCursorPos = beforeMention.length + member.username.length + 2;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleInputBlur = () => {
    // Delay closing dropdown to allow click on suggestion
    setTimeout(() => {
      setShowMentionDropdown(false);
    }, 150);

    if (typeof onTypingChange === "function") {
      onTypingChange(false);
    }
  };

  return (
    <>
      <div 
        className="w-full border-t border-border/30"
      >
        {/* Slim input container - WhatsApp style */}
        <div className="px-2 sm:px-3 py-2">
          <div className="container max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto">
            {/* Mention suggestions dropdown */}
            {showMentionDropdown && mentionSuggestions.length > 0 && (
              <div className="mb-1.5 max-h-32 overflow-y-auto bg-secondary border border-border/50 rounded-lg">
                {mentionSuggestions.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleMentionSelect(member)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors text-sm"
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.username} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{member.username}</div>
                      <div className="text-xs text-muted-foreground">{member.full_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Attachment previews */}
            {pendingAttachments.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg border bg-background px-1.5 py-1 text-xs">
                    {att.type === 'image' ? (
                      <img src={att.previewUrl} alt={att.file.name || 'Image'} className="h-10 w-10 rounded object-cover" />
                    ) : att.type === 'document' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[140px]">{att.file.name || 'Document'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="rounded overflow-hidden">
                          <iframe
                            title="Location preview"
                            src={`https://www.google.com/maps?q=${att.lat},${att.lng}&z=15&output=embed`}
                            className="h-14 w-24 border-0"
                            loading="lazy"
                          />
                        </div>
                        <span>{att.lat?.toFixed(3)}, {att.lng?.toFixed(3)}</span>
                      </div>
                    )}
                    <button
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => setPendingAttachments(prev => {
                        const next = [...prev];
                        const removed = next.splice(i, 1)[0];
                        if (removed && removed.type === 'image') {
                          try { URL.revokeObjectURL(removed.previewUrl); } catch {}
                        }
                        return next;
                      })}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 h-8 w-8 hover:bg-secondary/80"
                onClick={() => setAttachmentOpen(true)}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Input
                ref={inputRef}
                placeholder={placeholder}
                value={message}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 rounded-2xl bg-white text-black border-0 h-9 text-sm px-3 placeholder:text-gray-400"
                style={{
                  fontSize: '16px', // Prevent iOS zoom on focus
                }}
              />
              <Button
                size="icon"
                className="shrink-0 rounded-full h-8 w-8 hover:opacity-80"
                onClick={handleSend}
                disabled={!message.trim() && pendingAttachments.length === 0}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs for file selection */}
      <input id={imageInputId} type="file" accept="image/*" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
      <input id={fileInputId} type="file" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />

      <AttachmentSheet
        open={attachmentOpen}
        onOpenChange={setAttachmentOpen}
        onSelect={handleAttachment}
      />
    </>
  );
}
