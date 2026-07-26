export type SocialFeaturesLevel = "disabled" | "full";

const getSupabaseClient = async () => {
  const { supabase } = await import("@/lib/supabase");
  return supabase;
};

const SOCIAL_LEVEL_KEY = "ketravelan-social-features-level";
const SAFETY_ACK_DAY_KEY = "ketravelan-safety-reminder-day";

const MINOR_AGE_YEARS = 18;
const DEFAULT_CHILD_LEVEL: SocialFeaturesLevel = "disabled";

export const FAMILIES_SAFETY_REMINDER =
  "Be safe online. Never share your full name, phone number, address, school, passwords, or live location with people you do not know in real life.";

export class FamiliesPolicyError extends Error {
  code: "SOCIAL_DISABLED" | "SAFETY_REMINDER_REQUIRED" | "SENSITIVE_CONTENT_BLOCKED";

  constructor(
    code: "SOCIAL_DISABLED" | "SAFETY_REMINDER_REQUIRED" | "SENSITIVE_CONTENT_BLOCKED",
    message: string,
  ) {
    super(message);
    this.name = "FamiliesPolicyError";
    this.code = code;
  }
}

export type SensitiveContentDetection = {
  isRisky: boolean;
  reasons: string[];
};

const PHONE_NUMBER_PATTERN = /\b(?:\+?\d[\d().\s-]{7,}\d)\b/;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const ADDRESS_HINT_PATTERN = /\b(?:street|st\.|road|rd\.|avenue|ave\.|lane|ln\.|drive|dr\.|boulevard|blvd|apartment|apt|building|unit|home address|address)\b/i;
const SCHOOL_HINT_PATTERN = /\b(?:school|grade|classroom|teacher|principal)\b/i;

export const detectSensitiveContent = (value: string): SensitiveContentDetection => {
  const normalized = (value || "").trim();
  if (!normalized) {
    return { isRisky: false, reasons: [] };
  }

  const reasons: string[] = [];

  if (PHONE_NUMBER_PATTERN.test(normalized)) {
    reasons.push("phone number");
  }

  if (EMAIL_PATTERN.test(normalized)) {
    reasons.push("email address");
  }

  if (ADDRESS_HINT_PATTERN.test(normalized)) {
    reasons.push("home address or location hint");
  }

  if (SCHOOL_HINT_PATTERN.test(normalized)) {
    reasons.push("school details");
  }

  return {
    isRisky: reasons.length > 0,
    reasons,
  };
};

const safeStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export const getAgeFromDateOfBirth = (dateOfBirth?: string | null): number | null => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (!Number.isFinite(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

export const isMinorProfile = (profileLike?: { date_of_birth?: string | null } | null) => {
  const age = getAgeFromDateOfBirth(profileLike?.date_of_birth);
  return typeof age === "number" && age >= 0 && age < MINOR_AGE_YEARS;
};

export const getStoredSocialFeaturesLevel = (): SocialFeaturesLevel | null => {
  const storage = safeStorage();
  if (!storage) return null;
  const raw = storage.getItem(SOCIAL_LEVEL_KEY);
  if (raw === "disabled" || raw === "full") return raw;
  // Migrate legacy setting to the safer available option.
  if (raw === "known_contacts") return "disabled";
  return null;
};

export const getEffectiveSocialFeaturesLevel = (isMinor: boolean): SocialFeaturesLevel => {
  const stored = getStoredSocialFeaturesLevel();
  if (stored) return stored;
  return isMinor ? DEFAULT_CHILD_LEVEL : "full";
};

export const setStoredSocialFeaturesLevel = (level: SocialFeaturesLevel) => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(SOCIAL_LEVEL_KEY, level);
};

const getTodayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const hasAcknowledgedSafetyReminderToday = () => {
  const storage = safeStorage();
  if (!storage) return false;
  return storage.getItem(SAFETY_ACK_DAY_KEY) === getTodayKey();
};

export const acknowledgeSafetyReminderToday = () => {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(SAFETY_ACK_DAY_KEY, getTodayKey());
};

async function fetchCurrentUserDob() {
  const supabase = await getSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("date_of_birth")
    .eq("id", userId)
    .maybeSingle();

  return data?.date_of_birth || null;
}

export async function isKnownContactForCurrentUser(otherUserId: string) {
  const supabase = await getSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId || !otherUserId) return false;
  if (userId === otherUserId) return true;

  const [user1Id, user2Id] = [userId, otherUserId].sort();

  const { data: directConvo, error: convoError } = await supabase
    .from("conversations")
    .select("id")
    .eq("conversation_type", "direct")
    .eq("user1_id", user1Id)
    .eq("user2_id", user2Id)
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();

  if (!convoError && directConvo?.id) {
    return true;
  }

  const { data: memberships, error: memberError } = await supabase
    .from("trip_members")
    .select("trip_id, user_id")
    .in("user_id", [userId, otherUserId])
    .is("left_at", null);

  if (memberError || !Array.isArray(memberships) || memberships.length === 0) {
    return false;
  }

  const usersByTrip = new Map<string, Set<string>>();
  memberships.forEach((row) => {
    const set = usersByTrip.get(row.trip_id) || new Set<string>();
    set.add(row.user_id);
    usersByTrip.set(row.trip_id, set);
  });

  for (const users of usersByTrip.values()) {
    if (users.has(userId) && users.has(otherUserId)) {
      return true;
    }
  }

  return false;
}

export async function ensureCurrentUserCanStartDirectChat(otherUserId: string) {
  if (!otherUserId) return;
  const dob = await fetchCurrentUserDob();
  const isMinor = isMinorProfile({ date_of_birth: dob });
  if (!isMinor) return;

  const level = getEffectiveSocialFeaturesLevel(true);
  if (level === "disabled") {
    throw new FamiliesPolicyError(
      "SOCIAL_DISABLED",
      "Chat is currently disabled for this child account. An adult can enable it in Settings > Family Safety.",
    );
  }
}

export async function enforceCurrentUserSocialWritePolicy(freeformText: string) {
  const dob = await fetchCurrentUserDob();
  const isMinor = isMinorProfile({ date_of_birth: dob });
  if (!isMinor) return;

  const level = getEffectiveSocialFeaturesLevel(true);
  if (level === "disabled") {
    throw new FamiliesPolicyError(
      "SOCIAL_DISABLED",
      "Social posting is currently disabled for this child account. An adult can change this in Settings > Family Safety.",
    );
  }

  if (!hasAcknowledgedSafetyReminderToday()) {
    throw new FamiliesPolicyError(
      "SAFETY_REMINDER_REQUIRED",
      `Safety reminder: ${FAMILIES_SAFETY_REMINDER}`,
    );
  }

  const detection = detectSensitiveContent(freeformText);
  if (detection.isRisky) {
    throw new FamiliesPolicyError(
      "SENSITIVE_CONTENT_BLOCKED",
      `We blocked this message because it may include sensitive details such as ${detection.reasons.join(", ")}. Please remove those details or ask a parent for approval.`,
    );
  }
}
