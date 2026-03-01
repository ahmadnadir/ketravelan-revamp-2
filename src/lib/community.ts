import { supabase } from "@/lib/supabase";
import { countries, Discussion, Story, StoryType, DiscussionTopic, StoryVisibility, StoryBlock, SocialLink } from "@/data/communityMockData";
import type { StoryDraft } from "@/hooks/useStoryDraft";
import { getTravelStyleByIdOrLabel } from "@/data/travelStyles";

const FALLBACK_FLAG = "🌍";
const FALLBACK_AVATAR = "";
const WORDS_PER_MINUTE = 200;

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type StoryRow = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  content: unknown;
  excerpt: string | null;
  status: string;
  visibility: StoryVisibility;
  linked_trip_id: string | null;
  location_country: string | null;
  location_city: string | null;
  story_type?: StoryType | null;
  story_types?: StoryType[] | null;
  travel_styles?: string[] | null;
  reading_time_minutes: number | null;
  like_count: number | null;
  bookmark_count?: number | null;
  comment_count: number | null;
  created_at: string;
  published_at?: string | null;
  author?: ProfileRow | ProfileRow[] | null;
  story_tags?: {
    tag?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  }[] | null;
};

type DiscussionRow = {
  id: string;
  title: string;
  body: string | null;
  category: DiscussionTopic;
  status: "open" | "closed" | "resolved";
  visibility: "public" | "private";
  location_country: string | null;
  location_city: string | null;
  reply_count: number | null;
  like_count: number | null;
  view_count: number | null;
  created_at: string;
  author?: ProfileRow | ProfileRow[] | null;
};

type DiscussionReplyRow = {
  id: string;
  body: string;
  depth: number | null;
  parent_reply_id?: string | null;
  vote_count_up?: number | null;
  vote_count_down?: number | null;
  created_at: string;
  author?: ProfileRow | ProfileRow[] | null;
};

const getCountryFlag = (country?: string | null) => {
  if (!country) return FALLBACK_FLAG;
  return countries.find((c) => c.name === country)?.flag ?? "📍";
};

const getAuthorName = (profile?: ProfileRow | null) =>
  profile?.full_name || profile?.username || "Traveler";

const buildAuthor = (profile?: ProfileRow | null) => ({
  id: profile?.id ?? "unknown",
  name: getAuthorName(profile),
  avatar: profile?.avatar_url ?? FALLBACK_AVATAR,
});

const normalizeProfile = (profile?: ProfileRow | ProfileRow[] | null) =>
  Array.isArray(profile) ? profile[0] ?? null : profile ?? null;

const toPlainText = (value: string) => {
  if (!value) return "";

  let text = value;
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(value, "text/html");
    text = doc.body.textContent || "";
  } else {
    text = value.replace(/<[^>]+>/g, " ");
  }

  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/(^|\s)\|(?=\s|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

const extractTextFromBlocks = (blocks?: Array<{ content?: string }>) => {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks
    .map((b) => (typeof b?.content === "string" ? toPlainText(b.content) : ""))
    .filter(Boolean)
    .join("\n\n");
};

const extractSocialLinksFromBlocks = (blocks?: unknown[]) => {
  if (!Array.isArray(blocks)) return [] as SocialLink[];

  const links: SocialLink[] = [];
  blocks.forEach((block) => {
    if (!block || typeof block !== "object") return;
    const data = block as { socialLinks?: unknown };
    if (!Array.isArray(data.socialLinks)) return;

    data.socialLinks.forEach((link) => {
      if (
        link &&
        typeof link === "object" &&
        "platform" in link &&
        "url" in link &&
        typeof (link as { platform?: unknown }).platform === "string" &&
        typeof (link as { url?: unknown }).url === "string"
      ) {
        links.push(link as SocialLink);
      }
    });
  });

  const deduped = new Map<string, SocialLink>();
  links.forEach((link) => {
    const key = `${link.platform}|${link.url}`;
    if (!deduped.has(key)) deduped.set(key, link);
  });

  return Array.from(deduped.values());
};

const normalizeStoryContent = (content: unknown) => {
  if (typeof content === "string") {
    return { text: toPlainText(content), blocks: [] as unknown[], socialLinks: [] as SocialLink[] };
  }
  if (content && typeof content === "object") {
    const data = content as { text?: string; blocks?: unknown[]; socialLinks?: unknown };
    const socialLinks = Array.isArray(data.socialLinks)
      ? (data.socialLinks
          .filter((link) =>
            Boolean(link && typeof link === "object" && "platform" in link && "url" in link),
          ) as SocialLink[])
      : [];
    const blockSocialLinks = extractSocialLinksFromBlocks(data.blocks);
    return {
      text: toPlainText(data.text || "") || extractTextFromBlocks(data.blocks as Array<{ content?: string }>) || "",
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      socialLinks: socialLinks.length ? socialLinks : blockSocialLinks,
    };
  }
  return { text: "", blocks: [] as unknown[], socialLinks: [] as SocialLink[] };
};

const toExcerpt = (text: string, max = 180) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean;
};

const estimateReadingTime = (text: string) => {
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeTagName = (tag?: { name: string } | { name: string }[] | null) => {
  if (!tag) return undefined;
  if (Array.isArray(tag)) return tag[0]?.name;
  return tag.name;
};

const storyFocusToStoryType: Partial<Record<StoryDraft["storyFocuses"][number], StoryType>> = {
  "trip-recap": "trip-recap",
  "lessons-learned": "other",
  "tips-for-others": "tips",
  "destination-guide": "guide",
  "budget-breakdown": "budget",
  "solo-travel": "trip-recap",
  "first-time-experience": "trip-recap",
};

const uniqueStoryTypes = (values: (StoryType | null | undefined)[]) => {
  const set = new Set<StoryType>();
  values.forEach((value) => {
    if (value) set.add(value);
  });
  return Array.from(set);
};

const mapStoryRow = (row: StoryRow, reactions?: Map<string, { liked: boolean; saved: boolean }>) => {
  const contentData = normalizeStoryContent(row.content);
  const excerptSource = row.excerpt ? toPlainText(row.excerpt) : contentData.text;
  const storyReactions = reactions?.get(row.id) || { liked: false, saved: false };
  const authorProfile = normalizeProfile(row.author);
  const storyTypes = uniqueStoryTypes(row.story_types || []);
  const primaryStoryType = storyTypes[0] || "trip-recap";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverImage: row.cover_image_url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200",
    excerpt: toExcerpt(excerptSource),
    content: contentData.text,
    blocks: contentData.blocks as StoryBlock[],
    author: buildAuthor(authorProfile),
    location: {
      country: row.location_country || "Unknown",
      city: row.location_city || undefined,
      flag: getCountryFlag(row.location_country),
    },
    readingTime: row.reading_time_minutes ?? estimateReadingTime(contentData.text),
    storyType: primaryStoryType,
    storyTypes,
    travelStyleIds: row.travel_styles || [],
    linkedTripId: row.linked_trip_id || undefined,
    likes: row.like_count ?? 0,
    saves: row.bookmark_count ?? 0,
    isLiked: storyReactions.liked,
    isSaved: storyReactions.saved,
    isDraft: row.status === "draft",
    visibility: row.visibility,
    tags: row.story_tags?.map((t) => normalizeTagName(t.tag)).filter(Boolean) as string[] | undefined,
    socialLinks: contentData.socialLinks || [],
    createdAt: new Date(row.published_at || row.created_at),
    relatedDiscussionId: undefined,
  } as Story;
};

const mapDiscussionRow = (row: DiscussionRow, isAnsweredOverride?: boolean) => {
  const authorProfile = normalizeProfile(row.author);
  return {
  id: row.id,
  title: row.title,
  details: row.body ?? "",
    author: buildAuthor(authorProfile),
  location: {
    country: row.location_country || "Unknown",
    city: row.location_city || undefined,
    flag: getCountryFlag(row.location_country),
  },
  topic: row.category,
  replyCount: row.reply_count ?? 0,
  isAnswered: typeof isAnsweredOverride === "boolean" ? isAnsweredOverride : row.status === "resolved",
  views: row.view_count ?? 0,
  createdAt: new Date(row.created_at),
  } as Discussion;
};

const mapDiscussionReply = (row: DiscussionReplyRow) => {
  const authorProfile = normalizeProfile(row.author);
  return {
    id: row.id,
    author: buildAuthor(authorProfile),
    content: row.body,
    createdAt: new Date(row.created_at),
    depth: row.depth ?? 0,
    parentReplyId: row.parent_reply_id ?? null,
    upvotes: row.vote_count_up ?? 0,
    downvotes: row.vote_count_down ?? 0,
    userVote: null,
  };
};

export async function fetchStories(userId?: string | null) {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      id,
      slug,
      title,
      cover_image_url,
      content,
      excerpt,
      status,
      visibility,
      linked_trip_id,
      location_country,
      location_city,
      story_types,
      travel_styles,
      reading_time_minutes,
      like_count,
      bookmark_count,
      comment_count,
      created_at,
      published_at,
      author:profiles!stories_author_id_fkey(id, full_name, username, avatar_url),
      story_tags(tag:tags(name, slug))
    `
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (error) throw error;

  const reactions = await fetchStoryReactions(userId, data || []);
  return (data || []).map((row) => mapStoryRow(row as StoryRow, reactions));
}

export async function fetchStoryBySlug(slug: string, userId?: string | null) {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      id,
      slug,
      title,
      cover_image_url,
      content,
      excerpt,
      status,
      visibility,
      linked_trip_id,
      location_country,
      location_city,
      story_types,
      travel_styles,
      reading_time_minutes,
      like_count,
      bookmark_count,
      comment_count,
      created_at,
      published_at,
      author:profiles!stories_author_id_fkey(id, full_name, username, avatar_url),
      story_tags(tag:tags(name, slug))
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const reactions = await fetchStoryReactions(userId, [data]);
  const story = mapStoryRow(data as StoryRow, reactions);
  
  // Fetch comments for this story
  const comments = await fetchStoryComments(story.id);
  return { ...story, commentsList: comments };
}

export async function fetchStoryComments(storyId: string) {
  const { data, error } = await supabase
    .from("story_comments")
    .select(
      `
      id,
      body,
      created_at,
      like_count,
      author:profiles!story_comments_author_id_fkey(id, full_name, username, avatar_url)
    `
    )
    .eq("story_id", storyId)
    .is("deleted_at", null)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  if (error) throw error;
  
  return (data || []).map((comment) => ({
    id: comment.id,
    body: comment.body,
    author: buildAuthor(normalizeProfile(comment.author)),
    createdAt: new Date(comment.created_at),
    likes: comment.like_count || 0,
  }));
}

export async function fetchStoryById(storyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      id,
      slug,
      title,
      cover_image_url,
      content,
      excerpt,
      status,
      visibility,
      linked_trip_id,
      location_country,
      location_city,
      story_types,
      travel_styles,
      reading_time_minutes,
      author:profiles!stories_author_id_fkey(id, full_name, username, avatar_url),
      story_tags(tag:tags(name, slug))
    `
    )
    .eq("id", storyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Story not found");
  
  // Check if user is the author
  const authorData = Array.isArray(data.author) ? data.author[0] : data.author;
  const authorId = (authorData as ProfileRow | null)?.id;
  if (user?.id !== authorId) {
    throw new Error("You can only edit your own stories");
  }

  return mapStoryRow(data as StoryRow, new Map());
}

export async function fetchDiscussions() {
  const { data, error } = await supabase
    .from("discussions")
    .select(
      `
      id,
      title,
      body,
      category,
      status,
      visibility,
      location_country,
      location_city,
      reply_count,
      like_count,
      view_count,
      created_at,
      author:profiles!discussions_author_id_fkey(id, full_name, username, avatar_url)
    `
    )
    .eq("visibility", "public")
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false });

  if (error) throw error;
  const discussions = (data || []) as DiscussionRow[];
  if (discussions.length === 0) return [];

  const discussionIds = discussions.map((row) => row.id);
  const { data: acceptedRows, error: acceptedError } = await supabase
    .from("discussion_replies")
    .select("discussion_id")
    .eq("is_accepted_answer", true)
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .in("discussion_id", discussionIds);

  if (acceptedError) throw acceptedError;
  const acceptedSet = new Set((acceptedRows || []).map((row) => row.discussion_id));

  return discussions.map((row) => mapDiscussionRow(row, acceptedSet.has(row.id)));
}

export async function fetchDiscussionById(id: string) {
  const { data, error } = await supabase
    .from("discussions")
    .select(
      `
      id,
      title,
      body,
      category,
      status,
      visibility,
      location_country,
      location_city,
      reply_count,
      like_count,
      view_count,
      created_at,
      author:profiles!discussions_author_id_fkey(id, full_name, username, avatar_url)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const { data: acceptedRows, error: acceptedError } = await supabase
    .from("discussion_replies")
    .select("discussion_id")
    .eq("is_accepted_answer", true)
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .eq("discussion_id", id)
    .limit(1);

  if (acceptedError) throw acceptedError;
  const hasAccepted = (acceptedRows || []).length > 0;

  return mapDiscussionRow(data as DiscussionRow, hasAccepted);
}

export async function fetchDiscussionReplies(discussionId: string) {
  try {
    // Try to fetch with vote counts (columns might not exist yet)
    const { data, error } = await supabase
      .from("discussion_replies")
      .select(
        `
        id,
        body,
        depth,
        parent_reply_id,
        vote_count_up,
        vote_count_down,
        created_at,
        author:profiles!discussion_replies_author_id_fkey(id, full_name, username, avatar_url)
      `
      )
      .eq("discussion_id", discussionId)
      .eq("is_hidden", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      // If vote columns don't exist, fetch without them
      console.warn("Vote columns not found, fetching without vote data:", error.message);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("discussion_replies")
        .select(
          `
          id,
          body,
          depth,
          parent_reply_id,
          created_at,
          author:profiles!discussion_replies_author_id_fkey(id, full_name, username, avatar_url)
        `
        )
        .eq("discussion_id", discussionId)
        .eq("is_hidden", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (fallbackError) throw fallbackError;
      return (fallbackData || []).map((row) => mapDiscussionReply(row as DiscussionReplyRow));
    }

    return (data || []).map((row) => mapDiscussionReply(row as DiscussionReplyRow));
  } catch (err) {
    console.error("Error fetching discussion replies:", err);
    throw err;
  }
}

async function fetchStoryReactions(userId: string | null | undefined, stories: Array<{ id: string }>) {
  if (!userId || stories.length === 0) return new Map<string, { liked: boolean; saved: boolean }>();
  const storyIds = stories.map((s) => s.id);
  const { data, error } = await supabase
    .from("reactions")
    .select("content_id, reaction_type")
    .eq("user_id", userId)
    .eq("content_type", "story")
    .in("content_id", storyIds);

  if (error) throw error;

  const reactionMap = new Map<string, { liked: boolean; saved: boolean }>();
  (data || []).forEach((row) => {
    const current = reactionMap.get(row.content_id) || { liked: false, saved: false };
    if (row.reaction_type === "like") current.liked = true;
    if (row.reaction_type === "bookmark") current.saved = true;
    reactionMap.set(row.content_id, current);
  });
  return reactionMap;
}

export async function toggleStoryReaction(storyId: string, reactionType: "like" | "bookmark") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Call the RPC function that handles both reaction insert/delete and count update
  const { data, error } = await supabase.rpc("toggle_story_reaction", {
    p_story_id: storyId,
    p_reaction_type: reactionType,
    p_user_id: user.id,
  });

  if (error) throw error;
  if (data && !data.success) throw new Error(data.error || "Failed to toggle reaction");

  return { toggledOn: data?.toggledOn ?? false };
}

export async function createDiscussion(input: {
  title: string;
  body?: string | null;
  category: DiscussionTopic;
  locationCountry?: string | null;
  locationCity?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("discussions")
    .insert({
      author_id: user.id,
      title: input.title,
      body: input.body ?? null,
      category: input.category,
      status: "open",
      visibility: "public",
      location_country: input.locationCountry ?? null,
      location_city: input.locationCity ?? null,
    })
    .select(
      `
      id,
      title,
      body,
      category,
      status,
      visibility,
      location_country,
      location_city,
      reply_count,
      like_count,
      created_at,
      author:profiles!discussions_author_id_fkey(id, full_name, username, avatar_url)
    `
    )
    .single();

  if (error) throw error;
  return mapDiscussionRow(data as DiscussionRow);
}

export async function createDiscussionReply(discussionId: string, body: string, parentReplyId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Calculate depth based on parent reply
  let depth = 0;
  if (parentReplyId) {
    const { data: parentReply, error: parentError } = await supabase
      .from("discussion_replies")
      .select("depth")
      .eq("id", parentReplyId)
      .single();

    if (parentError) throw parentError;
    if (parentReply) {
      depth = parentReply.depth + 1;
    }
  }

  const { data, error } = await supabase
    .from("discussion_replies")
    .insert({
      discussion_id: discussionId,
      author_id: user.id,
      body,
      parent_reply_id: parentReplyId || null,
      depth,
    })
    .select(
      `
      id,
      body,
      is_accepted_answer,
      depth,
      parent_reply_id,
      vote_count_up,
      vote_count_down,
      created_at,
      author:profiles!discussion_replies_author_id_fkey(id, full_name, username, avatar_url)
    `
    )
    .single();

  if (error) throw error;
  
  // Note: reply_count and last_activity_at are automatically updated by database trigger
  // adjust_discussion_reply_count() on discussion_replies INSERT/DELETE/UPDATE

  return mapDiscussionReply(data as DiscussionReplyRow);
}

export async function toggleAcceptDiscussionReply(replyId: string, discussionId: string, currentAccepted: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify user is the discussion owner
  const { data: discussion, error: discussionError } = await supabase
    .from("discussions")
    .select("author_id")
    .eq("id", discussionId)
    .single();

  if (discussionError) throw discussionError;
  if (discussion.author_id !== user.id) {
    throw new Error("Only the discussion owner can accept replies");
  }

  // Toggle the accepted status
  const { error } = await supabase
    .from("discussion_replies")
    .update({ is_accepted_answer: !currentAccepted })
    .eq("id", replyId);

  if (error) throw error;
}

export async function updateDiscussionReply(replyId: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: reply, error: replyError } = await supabase
    .from("discussion_replies")
    .select("author_id, is_accepted_answer")
    .eq("id", replyId)
    .maybeSingle();

  if (replyError) throw replyError;
  if (!reply) throw new Error("Reply not found");
  if (reply.is_accepted_answer) throw new Error("Accepted replies cannot be edited");
  if (reply.author_id !== user.id) throw new Error("You can only edit your own replies");

  const { error } = await supabase
    .from("discussion_replies")
    .update({ body: body.trim() })
    .eq("id", replyId)
    .eq("author_id", user.id);

  if (error) throw error;
}

export async function deleteDiscussionReply(replyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: reply, error: replyError } = await supabase
    .from("discussion_replies")
    .select("author_id, is_accepted_answer")
    .eq("id", replyId)
    .maybeSingle();

  if (replyError) throw replyError;
  if (!reply) throw new Error("Reply not found");
  if (reply.is_accepted_answer) throw new Error("Accepted replies cannot be deleted");
  if (reply.author_id !== user.id) throw new Error("You can only delete your own replies");

  const { error } = await supabase
    .from("discussion_replies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", replyId)
    .eq("author_id", user.id);

  if (error) throw error;
}

const deriveStoryType = (draft: StoryDraft): StoryType => {
  const storyTypes = deriveStoryTypes(draft);
  return storyTypes[0] || "trip-recap";
};

const deriveStoryTypes = (draft: StoryDraft): StoryType[] => {
  const fromFocuses = (draft.storyFocuses || [])
    .map((focus) => storyFocusToStoryType[focus])
    .filter(Boolean) as StoryType[];

  return uniqueStoryTypes([draft.storyType, ...fromFocuses]);
};

const deriveTravelStyles = (draft: StoryDraft) => {
  return Array.from(
    new Set(
      (draft.travelStyleIds || [])
        .map((styleIdOrLabel) => getTravelStyleByIdOrLabel(styleIdOrLabel)?.id || styleIdOrLabel)
        .filter(Boolean),
    ),
  );
};

const deriveLegacyStoryType = (storyTypes: StoryType[]): StoryType => {
  return storyTypes[0] || "trip-recap";
};

const deriveStoryTypeLegacy = (draft: StoryDraft): StoryType => {
  if (draft.storyType) return draft.storyType;
  if (draft.storyFocuses?.includes("destination-guide")) return "guide";
  if (draft.storyFocuses?.includes("budget-breakdown")) return "budget";
  return "trip-recap";
};

const buildStoryContent = (draft: StoryDraft) => ({
  text: extractTextFromBlocks(draft.blocks),
  blocks: draft.blocks,
  socialLinks: (draft.socialLinks && draft.socialLinks.length > 0)
    ? draft.socialLinks
    : extractSocialLinksFromBlocks(draft.blocks),
});

async function upsertTags(tagSlugs: string[]) {
  if (!tagSlugs.length) return [] as Array<{ id: string; slug: string }>;
  const rows = tagSlugs.map((slug) => ({
    name: slug.replace(/-/g, " "),
    slug,
  }));

  const { data, error } = await supabase
    .from("tags")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (error) throw error;
  return data || [];
}

const buildStoryTagSlugs = (draft: StoryDraft) => {
  const tagSet = new Set<string>();

  (draft.tags || []).forEach((tag) => {
    const normalized = slugify(tag);
    if (normalized) tagSet.add(normalized);
  });

  (draft.travelStyleIds || []).forEach((styleIdOrLabel) => {
    const resolved = getTravelStyleByIdOrLabel(styleIdOrLabel);
    const normalized = slugify(resolved?.id || styleIdOrLabel);
    if (normalized) tagSet.add(normalized);
  });

  return Array.from(tagSet);
};

export async function publishStoryFromDraft(draft: StoryDraft) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const content = buildStoryContent(draft);
  const contentText = content.text || draft.title;
  const excerpt = toExcerpt(contentText);
  const readingTime = estimateReadingTime(contentText);
  const storyTypes = deriveStoryTypes(draft);
  const normalizedStoryTypes = storyTypes.length ? storyTypes : [deriveStoryTypeLegacy(draft)];
  const travelStyles = deriveTravelStyles(draft);
  const tags = await upsertTags(buildStoryTagSlugs(draft));

  // If this is an edit (has story ID), update instead of insert
  if (draft.storyId) {
    // For updates, keep the original slug to avoid duplicate key errors
    const { data: existingStory, error: fetchError } = await supabase
      .from("stories")
      .select("slug, title")
      .eq("id", draft.storyId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Only regenerate slug if title changed
    const slug = draft.title !== existingStory.title 
      ? slugify(draft.title) || existingStory.slug 
      : existingStory.slug;

    const { data: story, error } = await supabase
      .from("stories")
      .update({
        title: draft.title,
        slug,
        cover_image_url: draft.coverImage,
        content,
        excerpt,
        status: "published",
        visibility: draft.visibility,
        linked_trip_id: draft.linkedTripId,
        location_country: draft.country || null,
        location_city: draft.city || null,
        story_types: normalizedStoryTypes,
        travel_styles: travelStyles,
        reading_time_minutes: readingTime,
      })
      .eq("id", draft.storyId)
      .eq("author_id", user.id)
      .select("id")
      .single();

    if (error) throw error;

    // Refresh tags (including removals)
    const { error: deleteTagsError } = await supabase
      .from("story_tags")
      .delete()
      .eq("story_id", story.id);
    if (deleteTagsError) throw deleteTagsError;

    if (tags.length) {
      const { error: tagError } = await supabase
        .from("story_tags")
        .upsert(tags.map((tag) => ({ story_id: story.id, tag_id: tag.id })), {
          onConflict: "story_id,tag_id",
          ignoreDuplicates: true,
        });
      if (tagError) throw tagError;
    }

    return story.id as string;
  }

  // New story - insert
  const slug = slugify(draft.title) || `story-${Date.now()}`;
  const { data: story, error } = await supabase
    .from("stories")
    .insert({
      author_id: user.id,
      title: draft.title,
      slug,
      cover_image_url: draft.coverImage,
      content,
      excerpt,
      status: "published",
      visibility: draft.visibility,
      linked_trip_id: draft.linkedTripId,
      location_country: draft.country || null,
      location_city: draft.city || null,
      story_types: normalizedStoryTypes,
      travel_styles: travelStyles,
      reading_time_minutes: readingTime,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (tags.length) {
    const { error: tagError } = await supabase
      .from("story_tags")
      .upsert(tags.map((tag) => ({ story_id: story.id, tag_id: tag.id })), {
        onConflict: "story_id,tag_id",
        ignoreDuplicates: true,
      });
    if (tagError) throw tagError;
  }

  return story.id as string;
}
export async function deleteStory(storyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Delete the story (soft delete by setting deleted_at)
  const { error } = await supabase
    .from("stories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", storyId)
    .eq("author_id", user.id);

  if (error) throw error;
}

export async function updateStory(storyId: string, updates: Partial<Story>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("stories")
    .update(updates)
    .eq("id", storyId)
    .eq("author_id", user.id);

  if (error) throw error;
}

export async function createStoryComment(storyId: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("story_comments")
    .insert({
      story_id: storyId,
      author_id: user.id,
      body: body.trim(),
      depth: 0,
    })
    .select(`
      id,
      body,
      created_at,
      author:profiles!story_comments_author_id_fkey(id, full_name, username, avatar_url)
    `)
    .single();

  if (error) throw error;

  // Manually update comment count (in case trigger isn't active)
  const { data: storyData } = await supabase
    .from("stories")
    .select("comment_count")
    .eq("id", storyId)
    .single();

  if (storyData) {
    const { error: updateError } = await supabase
      .from("stories")
      .update({ comment_count: (storyData.comment_count || 0) + 1 })
      .eq("id", storyId);

    if (updateError) console.error("Failed to update comment count:", updateError);
  }

  return data;
}

export async function updateStoryComment(commentId: string, body: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("story_comments")
    .update({ body: body.trim() })
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) throw error;
}

export async function incrementDiscussionViews(discussionId: string) {
  try {
    console.log(`[View Count] Starting increment for discussion ${discussionId}`);
    
    // Get current view count
    const { data: discussion, error: fetchError } = await supabase
      .from("discussions")
      .select("view_count, id, title")
      .eq("id", discussionId)
      .maybeSingle();

    if (fetchError) {
      console.error("[View Count] Failed to fetch discussion:", fetchError);
      return;
    }

    if (!discussion) {
      console.error("[View Count] Discussion not found:", discussionId);
      return;
    }

    const currentViews = discussion.view_count ?? 0;
    const newViews = currentViews + 1;
    
    console.log(`[View Count] Current views: ${currentViews}, will update to: ${newViews}`);
    
    // Update with incremented view count
    const { data: updateData, error: updateError } = await supabase
      .from("discussions")
      .update({ view_count: newViews })
      .eq("id", discussionId)
      .select("view_count, id");

    if (updateError) {
      console.error("[View Count] Failed to increment views. Error:", {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
    } else if (updateData && updateData.length > 0) {
      console.log(`[View Count] Successfully updated! New view count: ${updateData[0].view_count}`);
    } else {
      console.warn("[View Count] Update executed but no data returned:", updateData);
    }
  } catch (err) {
    console.error("[View Count] Unexpected error:", err);
  }
}

export async function deleteStoryComment(commentId: string, storyId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from("story_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) throw error;

  // Manually update comment count (in case trigger isn't active)
  const { data: storyData } = await supabase
    .from("stories")
    .select("comment_count")
    .eq("id", storyId)
    .single();

  if (storyData && storyData.comment_count > 0) {
    const { error: updateError } = await supabase
      .from("stories")
      .update({ comment_count: storyData.comment_count - 1 })
      .eq("id", storyId);

    if (updateError) console.error("Failed to update comment count:", updateError);
  }
}

export async function toggleDiscussionReplyVote(replyId: string, voteType: "up" | "down") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get current vote counts and check for existing votes
  const { data: reply, error: fetchError } = await supabase
    .from("discussion_replies")
    .select("vote_count_up, vote_count_down, author_id")
    .eq("id", replyId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!reply) throw new Error("Reply not found");
  if (reply.author_id === user.id) throw new Error("You cannot vote on your own reply");

  let newUpvotes = Math.max(0, reply.vote_count_up ?? 0);
  let newDownvotes = Math.max(0, reply.vote_count_down ?? 0);

  // Try to check for existing vote in discussion_votes table
  let existingVoteType: "up" | "down" | null = null;
  try {
    const { data: existingVote } = await supabase
      .from("discussion_votes")
      .select("vote_type")
      .eq("reply_id", replyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      existingVoteType = existingVote.vote_type;
      
      // Remove the existing vote
      if (existingVote.vote_type === "up") {
        newUpvotes = Math.max(0, newUpvotes - 1);
      } else {
        newDownvotes = Math.max(0, newDownvotes - 1);
      }
    }
  } catch (e) {
    // discussion_votes table might not exist yet, continue without it
    console.log("discussion_votes table not ready, continuing with simple vote increment");
  }

  // Add new vote only if it's different from existing
  if (existingVoteType !== voteType) {
    if (voteType === "up") {
      newUpvotes += 1;
    } else {
      newDownvotes += 1;
    }
  }

  // Update vote counts
  const { error: updateError } = await supabase
    .from("discussion_replies")
    .update({
      vote_count_up: Math.max(0, newUpvotes),
      vote_count_down: Math.max(0, newDownvotes),
    })
    .eq("id", replyId);

  if (updateError) throw updateError;

  // Try to save vote in discussion_votes table
  try {
    if (existingVoteType === voteType) {
      // Remove vote if toggling same type
      const { error: deleteError } = await supabase
        .from("discussion_votes")
        .delete()
        .eq("reply_id", replyId)
        .eq("user_id", user.id);
      if (deleteError) console.error("Failed to delete vote:", deleteError);
    } else {
      // Insert or update vote
      const { error: voteError } = await supabase
        .from("discussion_votes")
        .upsert({
          reply_id: replyId,
          user_id: user.id,
          vote_type: voteType,
        });
      if (voteError) console.error("Failed to save vote:", voteError);
    }
  } catch (e) {
    console.log("discussion_votes table not ready, vote counts updated only");
  }

  return { upvotes: Math.max(0, newUpvotes), downvotes: Math.max(0, newDownvotes) };
}
