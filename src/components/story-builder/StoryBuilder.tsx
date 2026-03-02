import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, 
  ChevronRight, 
  Image as ImageIcon, 
  GripVertical, 
  Trash2, 
  Loader2,
  Bold,
  Underline,
  List,
  ListOrdered,
  Image,
  AtSign,
  Save,
  Eye,
  Instagram,
  Youtube,
  Music2,
  Linkedin,
  Twitter,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StoryDraft } from "@/hooks/useStoryDraft";
import { StoryBlock, BlockType, blockTypeConfig, SocialPlatform } from "@/data/communityMockData";
import { AddBlockSheet } from "./AddBlockSheet";
import { AddSocialLinksModal } from "./AddSocialLinksModal";
import { TextBlock } from "./blocks/TextBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { LocationBlock } from "./blocks/LocationBlock";
import { SocialLinkBlock } from "./blocks/SocialLinkBlock";
import { uploadImageFromDataUrl } from "@/lib/imageStorage";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface StoryBuilderProps {
  draft: StoryDraft;
  saveDraft: (updates: Partial<StoryDraft>) => void;
  addBlock: (block: StoryBlock) => void;
  updateBlock: (blockId: string, updates: Partial<StoryBlock>) => void;
  removeBlock: (blockId: string) => void;
  reorderBlocks: (blocks: StoryBlock[]) => void;
  onComplete: () => void;
}

export function StoryBuilder({
  draft,
  saveDraft,
  addBlock,
  updateBlock,
  removeBlock,
  reorderBlocks,
  onComplete,
}: StoryBuilderProps) {
  const { user } = useAuth();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [content, setContent] = useState(() => draft.blocks[0]?.content || "");
  const editorRef = useRef<HTMLDivElement>(null);
  const [showGalleryInput, setShowGalleryInput] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showSocialLinksModal, setShowSocialLinksModal] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleEditorChange = useCallback(() => {
    if (editorRef.current) {
      // Before saving, sync caption input values to data attributes
      const captionInputs = editorRef.current.querySelectorAll("input[data-image-caption]");
      captionInputs.forEach((input: Element) => {
        const inputEl = input as HTMLInputElement;
        const wrapper = inputEl.closest("[data-image-block]");
        if (wrapper) {
          const img = wrapper.querySelector("img");
          if (img) {
            img.setAttribute("data-caption", inputEl.value);
          }
        }
      });

      const html = editorRef.current.innerHTML;
      setContent(html);
      if (draft.blocks.length > 0) {
        updateBlock(draft.blocks[0].id, { content: html });
      } else {
        const newBlock: StoryBlock = {
          id: `block-${Date.now()}`,
          type: "text",
          content: html,
        };
        addBlock(newBlock);
      }
    }
  }, [addBlock, draft.blocks, updateBlock]);

  const attachPhotoEventListeners = useCallback(() => {
    if (!editorRef.current) return;
    
    // Attach handlers to all close buttons
    const closeButtons = editorRef.current.querySelectorAll("[data-image-block] button");
    closeButtons.forEach((btn) => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true) as HTMLElement;
      btn.parentNode?.replaceChild(newBtn, btn);
      
      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const photoBlock = newBtn.closest("[data-image-block]");
        if (photoBlock) {
          photoBlock.remove();
          handleEditorChange();
        }
      });
    });
    
    // Populate caption inputs from image data-caption attributes
    const captionInputs = editorRef.current.querySelectorAll("input[data-image-caption]");
    captionInputs.forEach((input: Element) => {
      const inputEl = input as HTMLInputElement;
      const wrapper = inputEl.closest("[data-image-block]");
      if (wrapper) {
        const img = wrapper.querySelector("img");
        if (img) {
          const captionValue = img.getAttribute("data-caption") || "";
          inputEl.value = captionValue;
        }
      }
    });
  }, [handleEditorChange]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && content) {
      editorRef.current.innerHTML = content;
      // After loading HTML, populate caption values and attach event listeners
      setTimeout(() => {
        attachPhotoEventListeners();
      }, 0);
    }
  }, [content, attachPhotoEventListeners]);

  const applyFormat = (command: string, value?: string) => {
    // Ensure editor is focused
    editorRef.current?.focus();

    // Execute the command
    document.execCommand(command, false, value);

    // Update content state after formatting
    setTimeout(() => {
      handleEditorChange();
    }, 0);
  };

  const applyBlockFormat = (command: string) => {
    // Ensure editor is focused before executing command
    editorRef.current?.focus();

    // Execute the command
    document.execCommand(command, false);

    // Update content state after formatting
    setTimeout(() => {
      handleEditorChange();
    }, 0);
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingCover(true);
    try {
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64Data = event.target?.result as string;
            const uploadedUrl = await uploadImageFromDataUrl(base64Data, {
              folder: "stories/images",
            });
            
            // Insert image directly into contentEditable editor with wrapper
            if (editorRef.current) {
              // Create a wrapper for both image and caption
              const photoContainer = document.createElement("div");
              photoContainer.setAttribute("data-image-block", "true");
              photoContainer.setAttribute("contenteditable", "false");
              photoContainer.style.display = "flex";
              photoContainer.style.flexDirection = "column";
              photoContainer.style.gap = "0";
              photoContainer.style.marginBottom = "1rem";
              
              // Create image container
              const imageWrapper = document.createElement("div");
              imageWrapper.className = "relative group rounded-lg overflow-hidden bg-muted inline-block w-full";
              
              // Create image
              const img = document.createElement("img");
              img.src = uploadedUrl;
              img.className = "w-full h-auto";
              img.setAttribute("contenteditable", "false");
              
              // Create close button container
              const closeBtn = document.createElement("button");
              closeBtn.className = "absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors";
              closeBtn.innerHTML = '<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
              closeBtn.setAttribute("contenteditable", "false");
              closeBtn.onclick = (e) => {
                e.preventDefault();
                photoContainer.remove();
                handleEditorChange();
              };
              
              // Create image container for positioning close button
              const imgContainer = document.createElement("div");
              imgContainer.className = "relative";
              imgContainer.setAttribute("contenteditable", "false");
              imgContainer.appendChild(img);
              imgContainer.appendChild(closeBtn);
              imageWrapper.appendChild(imgContainer);
              
              // Create caption input container (separate block)
              const captionContainer = document.createElement("div");
              
              const captionInput = document.createElement("input");
              captionInput.type = "text";
              captionInput.placeholder = "Add a caption...";
              captionInput.maxLength = 100;
              captionInput.className = "w-full px-0 py-1 bg-transparent text-sm text-center italic placeholder-muted-foreground focus:outline-none border-none";
              captionInput.setAttribute("data-image-caption", "true");
              
              // Allow input to be editable and handle keyboard properly
              captionInput.addEventListener("keydown", (e) => {
                e.stopPropagation();
              });
              
              captionInput.addEventListener("keyup", (e) => {
                e.stopPropagation();
              });
              
              // Add event listener to sync caption to image data attribute
              captionInput.addEventListener("input", () => {
                img.setAttribute("data-caption", captionInput.value);
                handleEditorChange();
              });
              
              captionContainer.appendChild(captionInput);
              
              // Append to photo container
              photoContainer.appendChild(imageWrapper);
              photoContainer.appendChild(captionContainer);
              
              // Append container to editor
              editorRef.current.appendChild(photoContainer);
              
              // Add line break after image block
              const br = document.createElement("br");
              editorRef.current.appendChild(br);
              
              // Focus editor and position cursor after the image block
              editorRef.current.focus();
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(br, 0);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
              
              handleEditorChange();
            }
          } catch (error) {
            console.error("Failed to upload image:", error);
            toast({
              title: "Upload failed",
              description: "Could not upload image. Please try again.",
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(file);
      }
      setShowGalleryInput(false);
      // Reset file input to prevent duplicate uploads
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
      }
      toast({
        title: "Images uploaded",
        description: "Your images have been added to the story.",
      });
    } catch (error) {
      console.error("Failed to process images:", error);
      toast({
        title: "Error",
        description: "Could not process images",
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddSocialLinks = () => {
    setShowSocialLinksModal(true);
  };

  const handleAddSocialLinksBlocks = (blocks: StoryBlock[]) => {
    // Collect all social links from the blocks
    const allSocialLinks = blocks.map((block) => ({
      platform: block.platform as SocialPlatform,
      url: block.url || "",
    }));

    // Check if we already have a social-link block
    const existingSocialBlock = draft.blocks.find((b) => b.type === "social-link");

    if (existingSocialBlock) {
      // Add to existing block
      const updatedLinks = [
        ...(existingSocialBlock.socialLinks || []),
        ...allSocialLinks,
      ];
      updateBlock(existingSocialBlock.id, {
        socialLinks: updatedLinks,
      });
    } else {
      // Create new social-link block
      const newBlock: StoryBlock = {
        id: `block-${Date.now()}`,
        type: "social-link",
        content: "",
        socialLinks: allSocialLinks,
      };
      addBlock(newBlock);
    }

    toast({
      title: "Social links added",
      description: `Added ${allSocialLinks.length} social link${allSocialLinks.length > 1 ? "s" : ""} to your story.`,
    });
  };

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case "instagram":
        return Instagram;
      case "youtube":
        return Youtube;
      case "tiktok":
        return Music2;
      case "facebook":
      case "linkedin":
        return Linkedin;
      case "twitter":
        return Twitter;
      default:
        return Plus;
    }
  };

  const isValid = draft.blocks.length > 0 && content.trim();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Story Builder</h1>
          <button className="text-muted-foreground hover:text-foreground">←</button>
        </div>
        <div className="border-t border-border/20 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-4 max-w-2xl mx-auto space-y-6">
          {/* Cover Image Upload */}
          <div className="space-y-2">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const url = event.target?.result as string;
                    saveDraft({ coverImage: url });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
            {draft.coverImage ? (
              <div className="relative group">
                <div className="w-full aspect-[16/9] rounded-lg overflow-hidden">
                  <img
                    src={draft.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                >
                  <span className="text-white font-medium">Change Cover</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                className="w-full aspect-[16/9] rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors"
              >
                <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">Add cover image</span>
              </button>
            )}
          </div>

          {/* Story Title */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">{draft.title}</h2>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex justify-center gap-2 pb-4 border-b-2 border-border/50">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("bold");
              }}
              className="p-2 hover:text-foreground text-muted-foreground transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-5 w-5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("underline");
              }}
              className="p-2 hover:text-foreground text-muted-foreground transition-colors"
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-5 w-5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyBlockFormat("insertUnorderedList");
              }}
              className="p-2 hover:text-foreground text-muted-foreground transition-colors"
              title="Bullet List"
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyBlockFormat("insertOrderedList");
              }}
              className="p-2 hover:text-foreground text-muted-foreground transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="h-5 w-5" />
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleGallerySelect}
              disabled={uploadingCover}
              className="hidden"
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                galleryInputRef.current?.click();
              }}
              disabled={uploadingCover}
              className="p-2 hover:text-foreground text-muted-foreground transition-colors disabled:opacity-50"
              title="Add Gallery"
            >
              <Image className="h-5 w-5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddSocialLinks();
              }}
              className="p-2 hover:text-foreground text-muted-foreground transition-colors"
              title="Add Social Links"
            >
              <AtSign className="h-5 w-5" />
            </button>
          </div>

          {/* Rich Text Editor Area with Social Links */}
          <div className="rounded-lg border-2 border-border overflow-hidden">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorChange}
              onKeyDown={(e) => {
                // Prevent backspace from deleting social link blocks and image blocks
                if (e.key === "Backspace") {
                  const selection = window.getSelection();
                  if (selection && selection.focusNode) {
                    const socialBlock = (selection.focusNode as Node).parentElement?.closest(
                      "[data-social-block]"
                    );
                    const imageBlock = (selection.focusNode as Node).parentElement?.closest(
                      "[data-image-block]"
                    );
                    if (socialBlock || imageBlock) {
                      e.preventDefault();
                      return;
                    }
                  }
                }

                if (e.ctrlKey || e.metaKey) {
                  if (e.key === "b") {
                    e.preventDefault();
                    applyFormat("bold");
                  } else if (e.key === "u") {
                    e.preventDefault();
                    applyFormat("underline");
                  }
                }
              }}
              suppressContentEditableWarning
              className="w-full min-h-[400px] p-4 text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 placeholder-muted-foreground resize-none leading-relaxed [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:mb-1"
            />

            {/* Social Links Block - Inside editor container */}
            {draft.blocks.map((block) => {
              if (
                block.type === "social-link" &&
                block.socialLinks &&
                block.socialLinks.length > 0
              ) {
                return (
                  <div
                    key={block.id}
                    data-social-block
                    className="bg-muted/30 p-4 space-y-2 border-t-2 border-border"
                  >
                    <p className="text-sm font-medium text-foreground">You can find me on:</p>
                    <div className="space-y-1">
                      {block.socialLinks.map((link, index) => {
                        const platformLabel = link.platform
                          ? link.platform.charAt(0).toUpperCase() + link.platform.slice(1)
                          : "Social";
                        const handle = link.url
                          ? link.url.split("/").pop() || link.url
                          : "";

                        return (
                          <div
                            key={`${block.id}-${index}`}
                            className="flex items-center justify-between"
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-foreground hover:text-primary transition-colors"
                            >
                              {platformLabel} · @{handle}
                            </a>
                            <button
                              onClick={() => {
                                const updatedLinks = block.socialLinks!.filter(
                                  (_, i) => i !== index
                                );
                                if (updatedLinks.length === 0) {
                                  removeBlock(block.id);
                                } else {
                                  updateBlock(block.id, {
                                    socialLinks: updatedLinks,
                                  });
                                }
                              }}
                              className="-ml-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove social link"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-above-nav left-0 right-0 z-40 p-4 bg-background/95 backdrop-blur-sm border-t border-border/50">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2"
            size="lg"
          >
            <Save className="h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            onClick={onComplete}
            disabled={!isValid}
            className="flex-1 h-12 gap-2"
            size="lg"
          >
            Preview
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Social Links Modal */}
      <AddSocialLinksModal
        open={showSocialLinksModal}
        onOpenChange={setShowSocialLinksModal}
        onAddSocialLinks={handleAddSocialLinksBlocks}
      />
    </div>
  );
}
