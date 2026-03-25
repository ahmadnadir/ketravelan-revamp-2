import { InlineMedia, InlineMediaImage } from "@/hooks/useStoryDrafts";

// === Block types ===

export interface TextBlock {
  id: string;
  type: "text";
  content: string; // HTML from TipTap
}

export interface ImageBlock {
  id: string;
  type: "image";
  images: InlineMediaImage[];
}

export interface GalleryBlock {
  id: string;
  type: "gallery";
  images: InlineMediaImage[];
}

export type EditorBlock = TextBlock | ImageBlock | GalleryBlock;

// === Helpers ===

let blockCounter = 0;
export function generateBlockId(): string {
  return `blk-${Date.now()}-${++blockCounter}`;
}

export function createTextBlock(content = ""): TextBlock {
  return { id: generateBlockId(), type: "text", content };
}

export function createImageBlock(images: InlineMediaImage[]): ImageBlock {
  return { id: generateBlockId(), type: "image", images };
}

export function createGalleryBlock(images: InlineMediaImage[]): GalleryBlock {
  return { id: generateBlockId(), type: "gallery", images };
}

/**
 * Insert a media block after the given block id.
 * Always ensures a text block follows the new media block so the user can keep typing.
 */
export function insertMediaBlock(
  blocks: EditorBlock[],
  afterBlockId: string | null,
  mediaBlock: ImageBlock | GalleryBlock
): EditorBlock[] {
  const newBlocks = [...blocks];

  // Find insertion index
  let insertIdx: number;
  if (!afterBlockId) {
    // Insert at the end
    insertIdx = newBlocks.length;
  } else {
    const idx = newBlocks.findIndex((b) => b.id === afterBlockId);
    insertIdx = idx === -1 ? newBlocks.length : idx + 1;
  }

  // Insert the media block
  newBlocks.splice(insertIdx, 0, mediaBlock);

  // Ensure a text block follows the media block
  const nextBlock = newBlocks[insertIdx + 1];
  if (!nextBlock || nextBlock.type !== "text") {
    newBlocks.splice(insertIdx + 1, 0, createTextBlock());
  }

  return newBlocks;
}

/**
 * Migrate legacy draft data (content + inlineMedia + contentAfterMedia) into ordered EditorBlocks.
 */
export function migrateLegacyToBlocks(
  content: string,
  inlineMedia: InlineMedia[],
  contentAfterMedia?: string
): EditorBlock[] {
  const blocks: EditorBlock[] = [];

  // First text block from main content
  if (content && content.trim()) {
    blocks.push(createTextBlock(content));
  } else {
    blocks.push(createTextBlock());
  }

  // Each inline media becomes a media block + text block (from contentAfter)
  for (const media of inlineMedia) {
    if (media.type === "image") {
      blocks.push(createImageBlock([...media.images]));
    } else {
      blocks.push(createGalleryBlock([...media.images]));
    }
    // Text that was written after this media
    blocks.push(createTextBlock(media.contentAfter || ""));
  }

  // Legacy contentAfterMedia (only if no per-media contentAfter was used)
  if (contentAfterMedia && contentAfterMedia.trim()) {
    // Append to the last text block if it's empty, otherwise add new
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.type === "text" && !lastBlock.content.trim()) {
      (lastBlock as TextBlock).content = contentAfterMedia;
    } else {
      blocks.push(createTextBlock(contentAfterMedia));
    }
  }

  // Ensure we always have at least one text block
  if (blocks.length === 0) {
    blocks.push(createTextBlock());
  }

  return blocks;
}

/**
 * Derive legacy fields from EditorBlocks for backward compatibility during publish.
 */
export function blocksToLegacy(blocks: EditorBlock[]): {
  content: string;
  inlineMedia: InlineMedia[];
  contentAfterMedia: string;
} {
  let content = "";
  const inlineMedia: InlineMedia[] = [];
  let contentAfterMedia = "";
  let foundFirstText = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "text") {
      if (!foundFirstText) {
        content = block.content;
        foundFirstText = true;
      } else {
        // Text after media  attach to the preceding media block's contentAfter
        const prevMedia = inlineMedia[inlineMedia.length - 1];
        if (prevMedia) {
          prevMedia.contentAfter = block.content;
        } else {
          contentAfterMedia = block.content;
        }
      }
    } else {
      // Media block
      const mediaItem: InlineMedia = {
        id: block.id,
        type: block.type,
        images: block.images,
        insertPosition: content.length,
        contentAfter: "",
      };
      inlineMedia.push(mediaItem);
    }
  }

  return { content, inlineMedia, contentAfterMedia };
}
