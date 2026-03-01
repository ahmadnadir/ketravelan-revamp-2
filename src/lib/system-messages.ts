import { supabase } from "@/lib/supabase";

export type SystemMessageAction = "expense_added" | "member_joined" | "trip_created";

interface SystemMessagePayload {
  conversationId: string;
  action: SystemMessageAction;
  senderName: string;
  details?: string;
}

/**
 * Send a system message to a conversation
 * Examples:
 * - "Ahmad added expense: Ferry tickets - RM 320"
 * - "Lisa Wong joined the trip"
 */
export async function sendSystemMessage({
  conversationId,
  action,
  senderName,
  details,
}: SystemMessagePayload): Promise<void> {
  try {
    let content = "";

    if (action === "expense_added" && details) {
      content = `${senderName} added expense: ${details}`;
    } else if (action === "member_joined") {
      content = `${senderName} joined the trip`;
    } else if (action === "trip_created") {
      content = `${senderName} created the trip`;
    }

    if (!content) return;

    // Insert system message directly into messages table
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content,
        sender_id: null, // System messages have no sender
        type: "system",
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to send system message:", error);
    }
  } catch (err) {
    console.error("Error sending system message:", err);
  }
}
