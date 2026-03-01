// Community Mock Data

// Story types aligned with Community schema
export type StoryType =
  | "trip-recap"
  | "guide"
  | "review"
  | "tips"
  | "itinerary"
  | "budget"
  | "other";

export type DiscussionTopic =
  | "general"
  | "budget"
  | "transport"
  | "visa"
  | "safety"
  | "food"
  | "accommodation";

export type BlockType = 
  | "text"
  | "image"
  | "moment"
  | "lesson"
  | "tip"
  | "location"
  | "social-link";

// Story focus chips for new story creation (optional, multi-select)
export type StoryFocus =
  | "trip-recap"
  | "lessons-learned"
  | "tips-for-others"
  | "destination-guide"
  | "budget-breakdown"
  | "solo-travel"
  | "first-time-experience";

export const storyFocusOptions: { value: StoryFocus; label: string; emoji: string }[] = [
  { value: "trip-recap", label: "Trip Recap", emoji: "📝" },
  { value: "lessons-learned", label: "Lessons Learned", emoji: "💡" },
  { value: "tips-for-others", label: "Tips for Others", emoji: "💫" },
  { value: "destination-guide", label: "Destination Guide", emoji: "🗺️" },
  { value: "budget-breakdown", label: "Budget Breakdown", emoji: "💰" },
  { value: "solo-travel", label: "Solo Travel", emoji: "🧳" },
  { value: "first-time-experience", label: "First-Time Experience", emoji: "⭐" },
];

export type TextPrompt =
  | "free"
  | "what-happened"
  | "lesson"
  | "tip"
  | "why-place-matters";

export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "facebook" | "twitter";

export type StoryVisibility = "public" | "private" | "unlisted";

export interface StoryBlock {
  id: string;
  type: BlockType;
  content: string;
  // Optional guidance for text blocks (keeps creation flexible)
  textPrompt?: TextPrompt;
  caption?: string;
  imageUrl?: string;
  url?: string;
  platform?: SocialPlatform;
  locationName?: string;
  socialLinks?: SocialLink[];
}

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface StoryAuthor {
  id: string;
  name: string;
  avatar: string;
  socialLinks?: SocialLink[];
}

export interface StoryComment {
  id: string;
  body: string;
  author: StoryAuthor;
  createdAt: Date;
  likes: number;
}

export interface Location {
  country: string;
  city?: string;
  flag: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  excerpt: string;
  content: string;
  blocks?: StoryBlock[];
  author: StoryAuthor;
  location: Location;
  readingTime: number;
  storyType: StoryType;
  storyTypes?: StoryType[];
  travelStyleIds?: string[];
  linkedTripId?: string;
  likes: number;
  saves: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isDraft?: boolean;
  visibility?: StoryVisibility;
  tags?: string[];
  socialLinks?: SocialLink[];
  comments?: StoryComment[];
  commentsList?: StoryComment[]; // Fetched comments from DB
  createdAt: Date;
  relatedDiscussionId?: string;
}

export interface Discussion {
  id: string;
  title: string;
  details?: string;
  author: StoryAuthor;
  location: Location;
  topic: DiscussionTopic;
  replyCount: number;
  isAnswered: boolean;
  createdAt: Date;
  relatedStoryId?: string;
  views: number;
}

export const storyTypeLabels: Record<StoryType, string> = {
  "trip-recap": "Trip Recap",
  "guide": "Guide",
  "review": "Review",
  "tips": "Tips & Advice",
  "itinerary": "Itinerary",
  "budget": "Budget Breakdown",
  "other": "Other",
};

export const storyTypeEmojis: Record<StoryType, string> = {
  "trip-recap": "📝",
  "guide": "🗺️",
  "review": "💡",
  "tips": "💫",
  "itinerary": "🧳",
  "budget": "💰",
  "other": "⭐",
};

// Story types available for new story creation
export const newStoryTypes: StoryType[] = [
  "trip-recap",
  "guide",
  "review",
  "tips",
  "itinerary",
  "budget",
  "other",
];

export const discussionTopicLabels: Record<DiscussionTopic, string> = {
  general: "General",
  budget: "Budget",
  transport: "Transport",
  visa: "Visa",
  safety: "Safety",
  food: "Food",
  accommodation: "Accommodation",
};

// Block type configurations with friendly guidance
export const blockTypeConfig: Record<BlockType, { label: string; icon: string; description: string; placeholder: string }> = {
  "text": {
    label: "Text",
    icon: "📝",
    description: "Share your thoughts and experiences",
    placeholder: "What happened next? Share your thoughts...",
  },
  "image": {
    label: "Photo",
    icon: "📷",
    description: "Add a photo with optional caption",
    placeholder: "Add a caption to your photo...",
  },
  "moment": {
    label: "Key Moment",
    icon: "✨",
    description: "Highlight a memorable experience",
    placeholder: "Describe this special moment...",
  },
  "lesson": {
    label: "Lesson Learned",
    icon: "💡",
    description: "Share something you learned",
    placeholder: "What did this experience teach you?",
  },
  "tip": {
    label: "Tip for Others",
    icon: "💬",
    description: "Give advice to future travelers",
    placeholder: "What advice would you give others?",
  },
  "location": {
    label: "Location",
    icon: "📍",
    description: "Highlight a specific place",
    placeholder: "What was special about this place?",
  },
  "social-link": {
    label: "Social Link",
    icon: "🔗",
    description: "Link to your social media content",
    placeholder: "Add the URL to your post...",
  },
};

export const mockStories: Story[] = [
  {
    id: "story-1",
    slug: "backpacking-vietnam-budget-breakdown",
    title: "How I Spent RM2,500 on 3 Weeks in Vietnam",
    coverImage: "https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=800",
    excerpt: "A detailed breakdown of every ringgit spent during my solo backpacking adventure through Vietnam.",
    content: "Full story content here...",
    blocks: [
      { id: "b1", type: "text", content: "When I first decided to backpack through Vietnam, everyone told me it would be expensive. They were wrong." },
      { id: "b2", type: "image", content: "", imageUrl: "https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=800", caption: "The streets of Hanoi at sunset" },
      { id: "b3", type: "moment", content: "The moment I realized I could live on RM80/day including accommodation was life-changing." },
      { id: "b4", type: "tip", content: "Book overnight buses to save on accommodation costs - you travel and sleep at the same time!" },
    ],
    author: {
      id: "user-1",
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/sarahchen" },
        { platform: "youtube", url: "https://youtube.com/@sarahtravels" },
      ],
    },
    location: { country: "Vietnam", city: "Hanoi", flag: "🇻🇳" },
    readingTime: 8,
    storyType: "budget",
    visibility: "public",
    tags: ["budget", "backpacking", "vietnam", "solo-travel"],
    likes: 234,
    saves: 89,
    createdAt: new Date("2025-01-05"),
  },
  {
    id: "story-2",
    slug: "first-solo-trip-japan",
    title: "My First Solo Trip to Japan: What I Wish I Knew",
    coverImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
    excerpt: "The mistakes I made, the lessons I learned, and why I'd do it all over again.",
    content: "Full story content here...",
    blocks: [
      { id: "b1", type: "text", content: "Japan had been on my bucket list for years. When I finally booked that ticket, I had no idea what I was getting into." },
      { id: "b2", type: "lesson", content: "Learn basic Japanese phrases. Even 'sumimasen' (excuse me) goes a long way." },
      { id: "b3", type: "moment", content: "Getting lost in Shibuya and finding the most amazing hidden ramen shop." },
    ],
    author: {
      id: "user-2",
      name: "Ahmad Razak",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
      socialLinks: [
        { platform: "instagram", url: "https://instagram.com/ahmadrazak" },
      ],
    },
    location: { country: "Japan", city: "Tokyo", flag: "🇯🇵" },
    readingTime: 12,
    storyType: "trip-recap",
    visibility: "public",
    tags: ["japan", "solo-travel", "first-time", "lessons"],
    likes: 456,
    saves: 178,
    createdAt: new Date("2025-01-03"),
  },
  {
    id: "story-3",
    slug: "bali-travel-mistakes",
    title: "5 Expensive Mistakes I Made in Bali",
    coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
    excerpt: "From overpriced taxis to tourist trap restaurants - learn from my wallet's suffering.",
    content: "Full story content here...",
    author: {
      id: "user-3",
      name: "Priya Sharma",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    },
    location: { country: "Indonesia", city: "Bali", flag: "🇮🇩" },
    readingTime: 6,
    storyType: "review",
    likes: 312,
    saves: 145,
    createdAt: new Date("2025-01-01"),
  },
  {
    id: "story-4",
    slug: "solo-to-group-thailand",
    title: "From Solo Traveler to Group Leader in Thailand",
    coverImage: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800",
    excerpt: "How I accidentally started leading group trips after meeting strangers in hostels.",
    content: "Full story content here...",
    author: {
      id: "user-4",
      name: "Marcus Lee",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    },
    location: { country: "Thailand", city: "Chiang Mai", flag: "🇹🇭" },
    readingTime: 10,
    storyType: "trip-recap",
    likes: 189,
    saves: 67,
    createdAt: new Date("2024-12-28"),
  },
  {
    id: "story-5",
    slug: "lessons-from-europe-trip",
    title: "10 Lessons from 30 Days Across Europe",
    coverImage: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800",
    excerpt: "Train passes, budget airlines, and everything I learned about traveling smart.",
    content: "Full story content here...",
    author: {
      id: "user-5",
      name: "Jessica Wong",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    },
    location: { country: "France", city: "Paris", flag: "🇫🇷" },
    readingTime: 15,
    storyType: "tips",
    likes: 567,
    saves: 234,
    createdAt: new Date("2024-12-25"),
  },
];

export const mockDiscussions: Discussion[] = [
  {
    id: "disc-1",
    title: "Best way to get from KLIA to Langkawi?",
    details: "I'm arriving at KLIA late at night and need to get to Langkawi the next day. Should I take a bus to Kuala Perlis or fly?",
    author: {
      id: "user-6",
      name: "David Tan",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    },
    location: { country: "Malaysia", flag: "🇲🇾" },
    topic: "transport",
    replyCount: 12,
    isAnswered: true,
    createdAt: new Date("2025-01-10"),
    views: 1148,
  },
  {
    id: "disc-2",
    title: "Is RM150/day enough for Bangkok?",
    details: "Planning a week trip to Bangkok. Can I survive on RM150 per day including accommodation?",
    author: {
      id: "user-7",
      name: "Anonymous",
      avatar: "",
    },
    location: { country: "Thailand", city: "Bangkok", flag: "🇹🇭" },
    topic: "budget",
    replyCount: 8,
    isAnswered: false,
    createdAt: new Date("2025-01-09"),
    views: 856,
  },
  {
    id: "disc-3",
    title: "Vietnam visa on arrival - still valid in 2025?",
    details: "I've read conflicting info. Do Malaysians still get 30 days visa-free in Vietnam?",
    author: {
      id: "user-8",
      name: "Mei Ling",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    },
    location: { country: "Vietnam", flag: "🇻🇳" },
    topic: "visa",
    replyCount: 15,
    isAnswered: true,
    createdAt: new Date("2025-01-08"),
    views: 2341,
  },
  {
    id: "disc-4",
    title: "Safe areas to stay in Jakarta for solo female?",
    details: "First time visiting Jakarta alone. Which areas should I look for accommodation?",
    author: {
      id: "user-9",
      name: "Nina Abdullah",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200",
    },
    location: { country: "Indonesia", city: "Jakarta", flag: "🇮🇩" },
    topic: "safety",
    replyCount: 23,
    isAnswered: true,
    createdAt: new Date("2025-01-07"),
    views: 3512,
  },
  {
    id: "disc-5",
    title: "Must-try street food in Penang?",
    details: "Spending 3 days in Penang. What are the absolute must-try dishes and where?",
    author: {
      id: "user-6",
      name: "Kevin Lim",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200",
    },
    location: { country: "Malaysia", city: "Penang", flag: "🇲🇾" },
    topic: "food",
    replyCount: 31,
    isAnswered: false,
    createdAt: new Date("2025-01-06"),
    views: 4892,
  },
  {
    id: "disc-6",
    title: "Cheapest hostels in Tokyo?",
    details: "Looking for budget accommodation in Tokyo. Any recommendations under RM100/night?",
    author: {
      id: "user-11",
      name: "Ryan Goh",
      avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200",
    },
    location: { country: "Japan", city: "Tokyo", flag: "🇯🇵" },
    topic: "accommodation",
    replyCount: 19,
    isAnswered: true,
    createdAt: new Date("2025-01-05"),
    views: 2756,
  },
];

export const countries = [
  // Asia
  { name: "Afghanistan", flag: "🇦🇫" },
  { name: "Armenia", flag: "🇦🇲" },
  { name: "Azerbaijan", flag: "🇦🇿" },
  { name: "Bahrain", flag: "🇧🇭" },
  { name: "Bangladesh", flag: "🇧🇩" },
  { name: "Bhutan", flag: "🇧🇹" },
  { name: "Brunei", flag: "🇧🇳" },
  { name: "Cambodia", flag: "🇰🇭" },
  { name: "China", flag: "🇨🇳" },
  { name: "Georgia", flag: "🇬🇪" },
  { name: "Hong Kong", flag: "🇭🇰" },
  { name: "India", flag: "🇮🇳" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "Iran", flag: "🇮🇷" },
  { name: "Iraq", flag: "🇮🇶" },
  { name: "Israel", flag: "🇮🇱" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Jordan", flag: "🇯🇴" },
  { name: "Kazakhstan", flag: "🇰🇿" },
  { name: "Kuwait", flag: "🇰🇼" },
  { name: "Kyrgyzstan", flag: "🇰🇬" },
  { name: "Laos", flag: "🇱🇦" },
  { name: "Lebanon", flag: "🇱🇧" },
  { name: "Macau", flag: "🇲🇴" },
  { name: "Malaysia", flag: "🇲🇾" },
  { name: "Maldives", flag: "🇲🇻" },
  { name: "Mongolia", flag: "🇲🇳" },
  { name: "Myanmar", flag: "🇲🇲" },
  { name: "Nepal", flag: "🇳🇵" },
  { name: "North Korea", flag: "🇰🇵" },
  { name: "Oman", flag: "🇴🇲" },
  { name: "Pakistan", flag: "🇵🇰" },
  { name: "Palestine", flag: "🇵🇸" },
  { name: "Philippines", flag: "🇵🇭" },
  { name: "Qatar", flag: "🇶🇦" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "Sri Lanka", flag: "🇱🇰" },
  { name: "Syria", flag: "🇸🇾" },
  { name: "Taiwan", flag: "🇹🇼" },
  { name: "Tajikistan", flag: "🇹🇯" },
  { name: "Thailand", flag: "🇹🇭" },
  { name: "Timor-Leste", flag: "🇹🇱" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Turkmenistan", flag: "🇹🇲" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
  { name: "Uzbekistan", flag: "🇺🇿" },
  { name: "Vietnam", flag: "🇻🇳" },
  { name: "Yemen", flag: "🇾🇪" },
  
  // Europe
  { name: "Albania", flag: "🇦🇱" },
  { name: "Andorra", flag: "🇦🇩" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Belarus", flag: "🇧🇾" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { name: "Bulgaria", flag: "🇧🇬" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Cyprus", flag: "🇨🇾" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Estonia", flag: "🇪🇪" },
  { name: "Finland", flag: "🇫🇮" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "Hungary", flag: "🇭🇺" },
  { name: "Iceland", flag: "🇮🇸" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Kosovo", flag: "🇽🇰" },
  { name: "Latvia", flag: "🇱🇻" },
  { name: "Liechtenstein", flag: "🇱🇮" },
  { name: "Lithuania", flag: "🇱🇹" },
  { name: "Luxembourg", flag: "🇱🇺" },
  { name: "Malta", flag: "🇲🇹" },
  { name: "Moldova", flag: "🇲🇩" },
  { name: "Monaco", flag: "🇲🇨" },
  { name: "Montenegro", flag: "🇲🇪" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "North Macedonia", flag: "🇲🇰" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Romania", flag: "🇷🇴" },
  { name: "Russia", flag: "🇷🇺" },
  { name: "San Marino", flag: "🇸🇲" },
  { name: "Serbia", flag: "🇷🇸" },
  { name: "Slovakia", flag: "🇸🇰" },
  { name: "Slovenia", flag: "🇸🇮" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Ukraine", flag: "🇺🇦" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Vatican City", flag: "🇻🇦" },
  
  // Africa
  { name: "Algeria", flag: "🇩🇿" },
  { name: "Angola", flag: "🇦🇴" },
  { name: "Benin", flag: "🇧🇯" },
  { name: "Botswana", flag: "🇧🇼" },
  { name: "Burkina Faso", flag: "🇧🇫" },
  { name: "Burundi", flag: "🇧🇮" },
  { name: "Cameroon", flag: "🇨🇲" },
  { name: "Cape Verde", flag: "🇨🇻" },
  { name: "Central African Republic", flag: "🇨🇫" },
  { name: "Chad", flag: "🇹🇩" },
  { name: "Comoros", flag: "🇰🇲" },
  { name: "Congo", flag: "🇨🇬" },
  { name: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { name: "Djibouti", flag: "🇩🇯" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "Equatorial Guinea", flag: "🇬🇶" },
  { name: "Eritrea", flag: "🇪🇷" },
  { name: "Eswatini", flag: "🇸🇿" },
  { name: "Ethiopia", flag: "🇪🇹" },
  { name: "Gabon", flag: "🇬🇦" },
  { name: "Gambia", flag: "🇬🇲" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Guinea", flag: "🇬🇳" },
  { name: "Guinea-Bissau", flag: "🇬🇼" },
  { name: "Ivory Coast", flag: "🇨🇮" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Lesotho", flag: "🇱🇸" },
  { name: "Liberia", flag: "🇱🇷" },
  { name: "Libya", flag: "🇱🇾" },
  { name: "Madagascar", flag: "🇲🇬" },
  { name: "Malawi", flag: "🇲🇼" },
  { name: "Mali", flag: "🇲🇱" },
  { name: "Mauritania", flag: "🇲🇷" },
  { name: "Mauritius", flag: "🇲🇺" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Mozambique", flag: "🇲🇿" },
  { name: "Namibia", flag: "🇳🇦" },
  { name: "Niger", flag: "🇳🇪" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Rwanda", flag: "🇷🇼" },
  { name: "Sao Tome and Principe", flag: "🇸🇹" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "Seychelles", flag: "🇸🇨" },
  { name: "Sierra Leone", flag: "🇸🇱" },
  { name: "Somalia", flag: "🇸🇴" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "South Sudan", flag: "🇸🇸" },
  { name: "Sudan", flag: "🇸🇩" },
  { name: "Tanzania", flag: "🇹🇿" },
  { name: "Togo", flag: "🇹🇬" },
  { name: "Tunisia", flag: "🇹🇳" },
  { name: "Uganda", flag: "🇺🇬" },
  { name: "Zambia", flag: "🇿🇲" },
  { name: "Zimbabwe", flag: "🇿🇼" },
  
  // North America
  { name: "Antigua and Barbuda", flag: "🇦🇬" },
  { name: "Bahamas", flag: "🇧🇸" },
  { name: "Barbados", flag: "🇧🇧" },
  { name: "Belize", flag: "🇧🇿" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Costa Rica", flag: "🇨🇷" },
  { name: "Cuba", flag: "🇨🇺" },
  { name: "Dominica", flag: "🇩🇲" },
  { name: "Dominican Republic", flag: "🇩🇴" },
  { name: "El Salvador", flag: "🇸🇻" },
  { name: "Grenada", flag: "🇬🇩" },
  { name: "Guatemala", flag: "🇬🇹" },
  { name: "Haiti", flag: "🇭🇹" },
  { name: "Honduras", flag: "🇭🇳" },
  { name: "Jamaica", flag: "🇯🇲" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Nicaragua", flag: "🇳🇮" },
  { name: "Panama", flag: "🇵🇦" },
  { name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { name: "Saint Lucia", flag: "🇱🇨" },
  { name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { name: "Trinidad and Tobago", flag: "🇹🇹" },
  { name: "United States", flag: "🇺🇸" },
  
  // South America
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Bolivia", flag: "🇧🇴" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Guyana", flag: "🇬🇾" },
  { name: "Paraguay", flag: "🇵🇾" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Suriname", flag: "🇸🇷" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Venezuela", flag: "🇻🇪" },
  
  // Oceania
  { name: "Australia", flag: "🇦🇺" },
  { name: "Fiji", flag: "🇫🇯" },
  { name: "Kiribati", flag: "🇰🇮" },
  { name: "Marshall Islands", flag: "🇲🇭" },
  { name: "Micronesia", flag: "🇫🇲" },
  { name: "Nauru", flag: "🇳🇷" },
  { name: "New Zealand", flag: "🇳🇿" },
  { name: "Palau", flag: "🇵🇼" },
  { name: "Papua New Guinea", flag: "🇵🇬" },
  { name: "Samoa", flag: "🇼🇸" },
  { name: "Solomon Islands", flag: "🇸🇧" },
  { name: "Tonga", flag: "🇹🇴" },
  { name: "Tuvalu", flag: "🇹🇻" },
  { name: "Vanuatu", flag: "🇻🇺" },
];

// Title placeholder examples for story creation
export const storyTitleExamples = [
  "How I Spent RM2,500 on 3 Weeks in Vietnam",
  "My First Solo Trip to Japan: What I Wish I Knew",
  "5 Expensive Mistakes I Made in Bali",
  "The Hidden Gems of Langkawi Nobody Talks About",
  "How I Met My Best Travel Buddy in Thailand",
];
