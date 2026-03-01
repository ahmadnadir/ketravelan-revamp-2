/**
 * Chat mention utilities for parsing and rendering @mentions
 */

export interface ParsedMention {
  userId: string;
  username: string;
  fullName: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse @mentions from message content
 * Matches @username pattern where username contains letters, numbers, underscores, dots
 */
export function parseMessageMentions(content: string, members: Array<{ id: string; username: string; full_name: string }>): ParsedMention[] {
  if (!content || !members.length) return [];

  const mentions: ParsedMention[] = [];
  const mentionRegex = /@(\w[\w._]*)/g;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    const member = members.find(m => m.username?.toLowerCase() === username.toLowerCase());

    if (member) {
      mentions.push({
        userId: member.id,
        username: member.username,
        fullName: member.full_name,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return mentions;
}

/**
 * Extract @mention suggestions from partial input
 * Returns matching members when user types @ followed by characters
 */
export function getMentionSuggestions(
  input: string,
  members: Array<{ id: string; username: string; full_name: string }>,
  cursorPosition: number
): { members: typeof members; atSymbolIndex: number } | null {
  if (cursorPosition === 0) return null;

  // Look backwards from cursor to find @symbol
  let atIndex = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (input[i] === '@') {
      atIndex = i;
      break;
    }
    // Stop if we hit space or newline (@ mention must be right after @ or space)
    if (input[i] === ' ' || input[i] === '\n') break;
  }

  if (atIndex === -1) return null;

  // Get typed text after @
  const typedAfterAt = input.substring(atIndex + 1, cursorPosition);

  // If there's a space between @ and cursor, cancel mentions
  if (typedAfterAt.includes(' ')) return null;

  // Filter members by username or full_name
  const filtered = members.filter(
    m =>
      m.username?.toLowerCase().includes(typedAfterAt.toLowerCase()) ||
      m.full_name?.toLowerCase().includes(typedAfterAt.toLowerCase())
  );

  return filtered.length > 0 ? { members: filtered, atSymbolIndex: atIndex } : null;
}

/**
 * Replace @mention placeholder with sanitized format in message
 * Keeps mentions in format @username for storage and display
 */
export function formatMentionedMessage(content: string): string {
  return content;
}

/**
 * Render message content with highlighted mentions
 * Returns JSX-compatible array of text and mention nodes
 */
export function parseMessageForDisplay(content: string): Array<{ type: 'text' | 'mention'; value: string; username?: string }> {
  const parts: Array<{ type: 'text' | 'mention'; value: string; username?: string }> = [];
  const mentionRegex = /@(\w[\w._]*)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }

    // Add mention
    parts.push({ type: 'mention', value: match[0], username: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: content }];
}
