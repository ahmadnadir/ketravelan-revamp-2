// Mock data for Ketravelan app

export type TripType = "diy" | "guided";

export const mockTrips = [
  {
    id: "1",
    title: "Langkawi Island Adventure",
    destination: "Langkawi, Malaysia",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    startDate: "Jan 15, 2025",
    endDate: "Jan 18, 2025",
    price: 850,
    slotsLeft: 2,
    totalSlots: 8,
    tags: ["Nature & Outdoor", "Beach", "Community"],
    isAlmostFull: true,
    tripType: "diy" as TripType,
    description: "Join us for an unforgettable adventure exploring the beautiful beaches and rainforests of Langkawi. We'll visit iconic spots like the Sky Bridge, cable car, and pristine beaches.",
    requirements: [
      "Comfortable with swimming",
      "Basic fitness level for hiking",
      "Bring own snorkeling gear (optional)",
      "Valid passport for duty-free shopping",
    ],
    budgetBreakdown: [
      { category: "Transport", amount: 200, icon: "car" },
      { category: "Accommodation", amount: 350, icon: "bed" },
      { category: "Food", amount: 200, icon: "utensils" },
      { category: "Activities", amount: 100, icon: "ticket" },
    ],
  },
  {
    id: "2",
    title: "Cameron Highlands Retreat",
    destination: "Cameron Highlands, Malaysia",
    imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800",
    startDate: "Feb 5, 2025",
    endDate: "Feb 7, 2025",
    price: 450,
    slotsLeft: 5,
    totalSlots: 10,
    tags: ["Nature & Outdoor", "Cross Border"],
    isAlmostFull: false,
    tripType: "diy" as TripType,
    description: "Escape the city heat with a refreshing trip to Cameron Highlands. Enjoy tea plantations, strawberry farms, and cool mountain air.",
    requirements: [
      "Warm clothing for cool weather",
      "Comfortable walking shoes",
    ],
    budgetBreakdown: [
      { category: "Transport", amount: 100, icon: "car" },
      { category: "Accommodation", amount: 200, icon: "bed" },
      { category: "Food", amount: 100, icon: "utensils" },
      { category: "Activities", amount: 50, icon: "ticket" },
    ],
  },
  {
    id: "3",
    title: "Penang Food & Culture Tour",
    destination: "Penang, Malaysia",
    imageUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    startDate: "Feb 20, 2025",
    endDate: "Feb 23, 2025",
    price: 650,
    slotsLeft: 4,
    totalSlots: 12,
    tags: ["City & Urban", "Food", "Culture"],
    isAlmostFull: false,
    tripType: "diy" as TripType,
    description: "Discover the rich heritage and incredible street food of Georgetown, Penang. Visit temples, street art, and eat your way through hawker centers.",
    requirements: [
      "Adventurous appetite",
      "Comfortable walking shoes",
    ],
    budgetBreakdown: [
      { category: "Transport", amount: 150, icon: "car" },
      { category: "Accommodation", amount: 300, icon: "bed" },
      { category: "Food", amount: 150, icon: "utensils" },
      { category: "Activities", amount: 50, icon: "ticket" },
    ],
  },
  {
    id: "4",
    title: "Taman Negara Jungle Expedition",
    destination: "Pahang, Malaysia",
    imageUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800",
    startDate: "Mar 10, 2025",
    endDate: "Mar 13, 2025",
    price: 750,
    slotsLeft: 6,
    totalSlots: 8,
    tags: ["Nature & Outdoor", "Adventure"],
    isAlmostFull: false,
    tripType: "diy" as TripType,
    description: "Explore one of the world's oldest rainforests! Canopy walk, night safari, river cruise, and indigenous village visit included.",
    requirements: [
      "Good physical fitness",
      "Insect repellent",
      "Rain gear",
      "Sense of adventure",
    ],
    budgetBreakdown: [
      { category: "Transport", amount: 180, icon: "car" },
      { category: "Accommodation", amount: 280, icon: "bed" },
      { category: "Food", amount: 140, icon: "utensils" },
      { category: "Activities", amount: 150, icon: "ticket" },
    ],
  },
  // Guided Trips
  {
    id: "5",
    title: "Bali Wellness Retreat",
    destination: "Bali, Indonesia",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800",
    startDate: "Mar 20, 2025",
    endDate: "Mar 25, 2025",
    price: 1850,
    slotsLeft: 3,
    totalSlots: 12,
    tags: ["Nature & Outdoor", "Culture"],
    isAlmostFull: true,
    tripType: "guided" as TripType,
    description: "A curated wellness retreat in Ubud with daily yoga, spa treatments, and healthy cuisine. Led by certified wellness coaches.",
    requirements: [
      "Open to wellness activities",
      "Basic yoga experience helpful",
    ],
    budgetBreakdown: [
      { category: "Transport", amount: 400, icon: "car" },
      { category: "Accommodation", amount: 800, icon: "bed" },
      { category: "Food", amount: 350, icon: "utensils" },
      { category: "Activities", amount: 300, icon: "ticket" },
    ],
  },
  {
    id: "6",
    title: "Japan Cherry Blossom Tour",
    destination: "Tokyo & Kyoto, Japan",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
    startDate: "Apr 1, 2025",
    endDate: "Apr 8, 2025",
    price: 3200,
    slotsLeft: 5,
    totalSlots: 15,
    tags: ["Culture", "City & Urban", "Cross Border"],
    isAlmostFull: false,
    tripType: "guided" as TripType,
    description: "Experience the magic of sakura season with a local guide. Visit Tokyo, Kyoto, and hidden gem locations for the best cherry blossom viewing.",
    requirements: [
      "Valid passport",
      "Comfortable walking for 5+ km daily",
    ],
    budgetBreakdown: [
      { category: "Transport", amount: 800, icon: "car" },
      { category: "Accommodation", amount: 1400, icon: "bed" },
      { category: "Food", amount: 600, icon: "utensils" },
      { category: "Activities", amount: 400, icon: "ticket" },
    ],
  },
  {
    id: "7",
    title: "Vietnam Heritage Journey",
    destination: "Hanoi to Ho Chi Minh",
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    startDate: "Apr 15, 2025",
    endDate: "Apr 22, 2025",
    price: 1450,
    slotsLeft: 8,
    totalSlots: 16,
    tags: ["Culture", "Food", "Cross Border"],
    isAlmostFull: false,
    tripType: "guided" as TripType,
    description: "Journey through Vietnam from North to South. Explore Ha Long Bay, Hoi An, and the bustling streets of Saigon with expert local guides.",
    requirements: [
      "Valid passport",
      "Adventurous appetite",
    ],
    budgetBreakdown: [
      { category: "Transport", amount: 350, icon: "car" },
      { category: "Accommodation", amount: 600, icon: "bed" },
      { category: "Food", amount: 300, icon: "utensils" },
      { category: "Activities", amount: 200, icon: "ticket" },
    ],
  },
];

export const mockMembers = [
  { id: "1", name: "Ahmad Razak", role: "Organizer", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", descriptor: "Outdoor enthusiast", qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ahmadpay123" },
  { id: "2", name: "Sarah Tan", role: "Member", imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200", descriptor: "First time in Langkawi", qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=sarahpay456" },
  { id: "3", name: "Lisa Wong", role: "Member", imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200", descriptor: "Frequent DIY traveler" },
  { id: "4", name: "John Lee", role: "Member", imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200", descriptor: "Photography lover", qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=johnpay789" },
  { id: "5", name: "Priya Kumar", role: "Member", descriptor: "Adventure seeker" },
];

// Payment tracking for each expense member
export interface ExpensePayment {
  memberId: string;
  status: "pending" | "settled";
  receiptUrl?: string;
  uploadedAt?: string;
  payerNote?: string;
  confirmedByPayer?: boolean;
}

// Enhanced expense data with payments tracking
export interface ExpenseData {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  date: string;
  hasReceipt: boolean;
  paymentProgress: number;
  category: string;
  splitType: "equal" | "custom";
  splitWith: string[];
  customSplitAmounts?: { memberId: string; amount: number }[];
  notes?: string;
  payments?: ExpensePayment[];
  // Multi-currency support
  originalCurrency?: "MYR" | "USD" | "EUR" | "IDR";
  fxRateToHome?: number;
  convertedAmountHome?: number;
  homeCurrency?: "MYR" | "USD" | "EUR" | "IDR";
}

export const mockExpenses: ExpenseData[] = [
  { 
    id: "1", 
    title: "Accommodation - 3 nights", 
    amount: 1200, 
    paidBy: "Ahmad Razak", 
    date: "Jan 15, 2025", 
    hasReceipt: true, 
    paymentProgress: 75, // 3/4 settled = 75%
    category: "Accommodation", 
    splitType: "equal" as const, 
    splitWith: ["1", "2", "3", "4"],
    payments: [
      { memberId: "1", status: "settled" },
      { memberId: "2", status: "settled" },
      { memberId: "3", status: "settled" },
      { memberId: "4", status: "pending" },
    ]
  },
  { 
    id: "2", 
    title: "Ferry tickets", 
    amount: 320, 
    paidBy: "Sarah Tan", 
    date: "Jan 15, 2025", 
    hasReceipt: true, 
    paymentProgress: 100, // 5/5 settled = 100%
    category: "Transport", 
    splitType: "equal" as const, 
    splitWith: ["1", "2", "3", "4", "5"],
    payments: [
      { memberId: "1", status: "settled" },
      { memberId: "2", status: "settled" },
      { memberId: "3", status: "settled" },
      { memberId: "4", status: "settled" },
      { memberId: "5", status: "settled" },
    ]
  },
  { 
    id: "3", 
    title: "Rental car", 
    amount: 450, 
    paidBy: "Ahmad Razak", 
    date: "Jan 15, 2025", 
    hasReceipt: false, 
    paymentProgress: 67, // RM300/RM450 settled = 67%
    category: "Transport", 
    splitType: "custom" as const, 
    splitWith: ["1", "2", "3"], 
    customSplitAmounts: [{ memberId: "1", amount: 150 }, { memberId: "2", amount: 150 }, { memberId: "3", amount: 150 }],
    payments: [
      { memberId: "1", status: "settled" },
      { memberId: "2", status: "settled", receiptUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop", uploadedAt: "Jan 16, 2025", payerNote: "Paid via TNG on Jan 16" },
      { memberId: "3", status: "pending" },
    ]
  },
  { 
    id: "4", 
    title: "Group dinner", 
    amount: 280, 
    paidBy: "Lisa Wong", 
    date: "Jan 16, 2025", 
    hasReceipt: true, 
    paymentProgress: 40, // 2/5 settled = 40%
    category: "Food & Drinks", 
    splitType: "equal" as const, 
    splitWith: ["1", "2", "3", "4", "5"], 
    notes: "Seafood dinner at the beach restaurant",
    payments: [
      { memberId: "1", status: "settled", receiptUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop", uploadedAt: "Jan 17, 2025", payerNote: "Bank transfer completed" },
      { memberId: "2", status: "pending" },
      { memberId: "3", status: "settled" },
      { memberId: "4", status: "pending" },
      { memberId: "5", status: "pending" },
    ]
  },
  // Multi-currency expenses (USD)
  { 
    id: "usd-1", 
    title: "Airport shuttle", 
    amount: 45, 
    paidBy: "Ahmad Razak", 
    date: "Jan 15, 2025", 
    hasReceipt: true, 
    paymentProgress: 50,
    category: "Transport", 
    splitType: "equal" as const, 
    splitWith: ["1", "2"],
    originalCurrency: "USD",
    fxRateToHome: 4.76,
    convertedAmountHome: 214.20,
    homeCurrency: "MYR",
    payments: [
      { memberId: "1", status: "settled" },
      { memberId: "2", status: "pending" },
    ]
  },
  { 
    id: "usd-2", 
    title: "Duty free shopping", 
    amount: 120, 
    paidBy: "Sarah Tan", 
    date: "Jan 16, 2025", 
    hasReceipt: true, 
    paymentProgress: 33,
    category: "Shopping", 
    splitType: "equal" as const, 
    splitWith: ["1", "2", "3"],
    originalCurrency: "USD",
    fxRateToHome: 4.76,
    convertedAmountHome: 571.20,
    homeCurrency: "MYR",
    payments: [
      { memberId: "1", status: "pending" },
      { memberId: "2", status: "settled" },
      { memberId: "3", status: "pending" },
    ]
  },
  { 
    id: "5", 
    title: "Sky Bridge tickets", 
    amount: 176, 
    paidBy: "John Lee",
    date: "Jan 17, 2025", 
    hasReceipt: true, 
    paymentProgress: 25, // 1/4 settled = 25%
    category: "Activities", 
    splitType: "equal" as const, 
    splitWith: ["1", "2", "3", "4"],
    payments: [
      { memberId: "1", status: "pending" },
      { memberId: "2", status: "pending" },
      { memberId: "3", status: "pending" },
      { memberId: "4", status: "settled" },
    ]
  },
  { 
    id: "6", 
    title: "Boat tour tickets", 
    amount: 200, 
    paidBy: "Priya Kumar",
    date: "Jan 17, 2025", 
    hasReceipt: true, 
    paymentProgress: 50, // 1/2 settled = 50%
    category: "Activities", 
    splitType: "equal" as const, 
    splitWith: ["1", "5"],
    payments: [
      { memberId: "1", status: "pending" },
      { memberId: "5", status: "settled" },
    ]
  },
  // Historical settled expenses for UI demonstration
  { 
    id: "settled-exp-1", 
    title: "Cable car tickets", 
    amount: 128, 
    paidBy: "Ahmad Razak", 
    date: "Jan 16, 2025", 
    hasReceipt: true, 
    paymentProgress: 100,
    category: "Activities", 
    splitType: "equal" as const, 
    splitWith: ["1", "2"],
    payments: [
      { memberId: "1", status: "settled" },
      { memberId: "2", status: "settled" }, // Sarah paid Ahmad her share: RM 64
    ]
  },
  { 
    id: "settled-exp-2", 
    title: "Breakfast buffet", 
    amount: 168, 
    paidBy: "Lisa Wong", 
    date: "Jan 17, 2025", 
    hasReceipt: true, 
    paymentProgress: 100,
    category: "Food & Drinks", 
    splitType: "equal" as const, 
    splitWith: ["1", "3", "4"],
    payments: [
      { memberId: "1", status: "settled" }, // Ahmad paid Lisa his share: RM 56
      { memberId: "3", status: "settled" },
      { memberId: "4", status: "settled" },
    ]
  },
];

export const mockMessages = [
  { id: "1", senderId: "1", senderName: "Ahmad Razak", content: "Welcome everyone! Excited for our Langkawi trip 🎉", timestamp: "10:00 AM", type: "text" as const },
  { id: "2", senderId: "2", senderName: "Sarah Tan", content: "Can't wait! Should we meet at KL Sentral?", timestamp: "10:05 AM", type: "text" as const },
  { id: "3", senderId: "system", senderName: "System", content: "Lisa Wong joined the trip", timestamp: "10:10 AM", type: "system" as const },
  { id: "4", senderId: "3", senderName: "Lisa Wong", content: "Hey everyone! Happy to be here 😊", timestamp: "10:12 AM", type: "text" as const },
  { id: "5", senderId: "1", senderName: "Ahmad Razak", content: "Yes, KL Sentral at 7am works. I'll share the exact meeting point later.", timestamp: "10:15 AM", type: "text" as const },
  { id: "6", senderId: "system", senderName: "System", content: "Ahmad added expense: Ferry tickets - RM 320", timestamp: "10:30 AM", type: "system" as const },
];

export const mockNotes = [
  { id: "1", title: "Packing List", content: "- Sunscreen\n- Swimsuit\n- Comfortable shoes\n- Light jacket\n- Camera\n- Snorkeling gear", date: "Jan 10, 2025", pinned: true },
  { id: "2", title: "Restaurant Recommendations", content: "1. Wonderland Food Store - Laksa\n2. Orkid Ria - Seafood\n3. Manggo Lounge - Western", date: "Jan 8, 2025", pinned: false },
  { id: "3", title: "Emergency Contacts", content: "Trip Leader: Ahmad - 012-345-6789\nHotel: 04-123-4567\nEmergency: 999", date: "Jan 5, 2025", pinned: true },
];

export const mockChats = [
  { id: "trip-1", name: "Langkawi Adventure", type: "trip" as const, lastMessage: "Ahmad: See you all at 7am!", unread: 3, imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200" },
  { id: "trip-2", name: "Cameron Highlands", type: "trip" as const, lastMessage: "Lisa: I'll bring the snacks", unread: 0, imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=200" },
  { id: "dm-1", name: "Sarah Tan", type: "direct" as const, lastMessage: "Thanks for the info!", unread: 1, imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" },
  { id: "dm-2", name: "John Lee", type: "direct" as const, lastMessage: "See you there", unread: 0, imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200" },
];

// Extended user profiles for public profile view
export interface UserProfile {
  id: string;
  name: string;
  imageUrl?: string;
  coverPhotoUrl?: string;
  location?: string;
  bio?: string;
  travelStyles: string[];
  socialLinks?: { platform: string; url: string }[];
  stats: {
    tripsCount: number;
    countriesCount: number;
    rating?: number;
  };
  previousTrips: {
    id: string;
    title: string;
    destination: string;
    imageUrl: string;
    startDate: string;
    endDate: string;
    tripType: "diy" | "guided";
  }[];
}

export const mockUserProfiles: Record<string, UserProfile> = {
  "1": {
    id: "1",
    name: "Ahmad Razak",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    coverPhotoUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200",
    location: "Kuala Lumpur, Malaysia",
    bio: "Passionate traveler who loves exploring new cultures and cuisines. Always looking for the next adventure! I've been organizing group trips for 5 years and love bringing people together.",
    travelStyles: ["Adventure", "Budget-friendly", "Nature", "Food"],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/ahmadrazak" },
      { platform: "youtube", url: "https://youtube.com/@ahmadtravels" },
    ],
    stats: {
      tripsCount: 12,
      countriesCount: 8,
      rating: 4.8,
    },
    previousTrips: [
      { id: "1", title: "Langkawi Island Adventure", destination: "Langkawi, Malaysia", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400", startDate: "Jan 15", endDate: "Jan 18, 2025", tripType: "diy" },
      { id: "2", title: "Cameron Highlands Retreat", destination: "Cameron Highlands", imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400", startDate: "Feb 5", endDate: "Feb 7, 2025", tripType: "diy" },
    ],
  },
  "2": {
    id: "2",
    name: "Sarah Tan",
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    coverPhotoUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200",
    location: "Singapore",
    bio: "Weekend explorer and coffee enthusiast. Love discovering hidden gems and local experiences. First time doing DIY group travel!",
    travelStyles: ["City & Urban", "Food", "Culture", "Photography"],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/sarahtan" },
    ],
    stats: {
      tripsCount: 5,
      countriesCount: 4,
      rating: 4.9,
    },
    previousTrips: [
      { id: "3", title: "Penang Food & Culture Tour", destination: "Penang, Malaysia", imageUrl: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400", startDate: "Feb 20", endDate: "Feb 23, 2025", tripType: "diy" },
    ],
  },
  "3": {
    id: "3",
    name: "Lisa Wong",
    imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    coverPhotoUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200",
    location: "Johor Bahru, Malaysia",
    bio: "Frequent DIY traveler with a passion for nature and adventure. Always up for hiking and exploring off-the-beaten-path destinations.",
    travelStyles: ["Adventure", "Nature", "Hiking", "Wildlife"],
    stats: {
      tripsCount: 18,
      countriesCount: 12,
      rating: 4.7,
    },
    previousTrips: [
      { id: "4", title: "Taman Negara Jungle Expedition", destination: "Pahang, Malaysia", imageUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400", startDate: "Mar 10", endDate: "Mar 13, 2025", tripType: "diy" },
      { id: "1", title: "Langkawi Island Adventure", destination: "Langkawi, Malaysia", imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400", startDate: "Jan 15", endDate: "Jan 18, 2025", tripType: "diy" },
    ],
  },
  "4": {
    id: "4",
    name: "John Lee",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    coverPhotoUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200",
    location: "Penang, Malaysia",
    bio: "Photography lover who travels to capture beautiful moments. Always carrying my camera and looking for the perfect shot.",
    travelStyles: ["Photography", "Nature", "City & Urban", "Sunrise/Sunset"],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/johnleephoto" },
      { platform: "youtube", url: "https://youtube.com/@johnleephoto" },
      { platform: "website", url: "https://johnleephoto.com" },
    ],
    stats: {
      tripsCount: 8,
      countriesCount: 6,
      rating: 4.6,
    },
    previousTrips: [
      { id: "2", title: "Cameron Highlands Retreat", destination: "Cameron Highlands", imageUrl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400", startDate: "Feb 5", endDate: "Feb 7, 2025", tripType: "diy" },
    ],
  },
  "5": {
    id: "5",
    name: "Priya Kumar",
    location: "Kuala Lumpur, Malaysia",
    bio: "Adventure seeker and solo traveler. Love meeting new people and trying local cuisines wherever I go.",
    travelStyles: ["Adventure", "Solo Travel", "Food", "Budget-friendly"],
    stats: {
      tripsCount: 3,
      countriesCount: 2,
    },
    previousTrips: [],
  },
};
