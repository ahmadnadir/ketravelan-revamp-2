import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Camera,
  User,
  MapPin,
  Instagram,
  Youtube,
  Linkedin,
  Globe,
  Facebook,
  Twitter,
  Plus,
  X,
  Check,
  Mail,
  Phone as PhoneIcon,
  Loader2,
  Coins,
  Settings,
  Link2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ImageCropModal } from "@/components/profile/ImageCropModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { currencies, CurrencyCode } from "@/lib/currencyUtils";
import { travelStyles, TravelStyleGrid } from "@/components/onboarding/TravelStyleGrid";
import { cn } from "@/lib/utils";

// TikTok icon component
const TikTok = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const socialPlatforms = [
  { id: "instagram", label: "Instagram", icon: Instagram, placeholder: "instagram.com/username" },
  { id: "tiktok", label: "TikTok", icon: TikTok, placeholder: "tiktok.com/@username" },
  { id: "youtube", label: "YouTube", icon: Youtube, placeholder: "youtube.com/@channel" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "linkedin.com/in/username" },
  { id: "facebook", label: "Facebook", icon: Facebook, placeholder: "facebook.com/username" },
  { id: "twitter", label: "X (Twitter)", icon: Twitter, placeholder: "x.com/username" },
  { id: "website", label: "Website", icon: Globe, placeholder: "yourwebsite.com" },
  { id: "other", label: "Other", icon: Link2, placeholder: "linktr.ee/you" },
];

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading, refreshProfile, homeCurrency, setHomeCurrency } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    phone: "",
    location: "",
    bio: "",
    gender: "",
  });

  const [selectedHomeCurrency, setSelectedHomeCurrency] = useState<CurrencyCode>(homeCurrency);

  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [profileImage, setProfileImage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [originalUsername, setOriginalUsername] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && user) {
      // Generate gender-based default avatar using Notion style
      const getDefaultAvatar = (userId: string, gender: string) => {
        const timestamp = Date.now(); // Cache buster
        if (gender === "male") {
          return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-female&t=${timestamp}`;
        } else if (gender === "female") {
          return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}-male&t=${timestamp}`;
        }
        return `https://api.dicebear.com/7.x/notionists/svg?seed=${userId}&t=${timestamp}`;
      };

      if (profile) {
        const gender = profile.gender || "";
        const defaultAvatar = getDefaultAvatar(user.id, gender);
        // Always regenerate avatar if it's a dicebear URL, to match current gender
        const isDefaultDicebear = profile.avatar_url?.includes('dicebear.com');
        const avatarToUse = (!profile.avatar_url || isDefaultDicebear) ? defaultAvatar : profile.avatar_url;

        const usernameMorm = profile.username || "";
        setFormData({
          name: profile.full_name || "",
          username: usernameMorm,
          phone: profile.phone || "",
          location: profile.location || "",
          bio: profile.bio || "",
          gender: gender,
        });
        setOriginalUsername(usernameMorm);
        setProfileImage(avatarToUse);
        // Normalize travel styles: convert labels to IDs if needed
        const normalizedStyles = Array.isArray(profile.travel_styles) 
          ? profile.travel_styles.map((style: string) => {
              // If it's already an ID (lowercase), keep it
              if (travelStyles.some(ts => ts.id === style)) {
                return style;
              }
              // If it's a label, find the matching ID
              const matchingStyle = travelStyles.find(ts => ts.label.toLowerCase() === style.toLowerCase());
              return matchingStyle?.id || style;
            })
          : [];
        setSelectedStyles(normalizedStyles);
        setSocialLinks(profile.social_links || {});
        setSelectedHomeCurrency(profile.home_currency || homeCurrency);
      } else {
        const defaultAvatar = getDefaultAvatar(user.id, "");
        setFormData({
          name: "",
          username: "",
          phone: "",
          location: "",
          bio: "",
          gender: "",
        });
        setOriginalUsername("");
        setProfileImage(defaultAvatar);
        setSelectedStyles([]);
        setSocialLinks({});
        setSelectedHomeCurrency(homeCurrency);
      }
      setIsLoading(false);
    }
  }, [authLoading, profile, user, homeCurrency]);

  // Debounced username availability check (only if changed from original)
  useEffect(() => {
    const normalizedUsername = formData.username.trim().toLowerCase();
    const normalizedOriginal = originalUsername.trim().toLowerCase();

    // If username hasn't changed from original, no need to check
    if (normalizedUsername === normalizedOriginal) {
      setUsernameStatus("idle");
      return;
    }

    // If username is empty, set to idle
    if (!normalizedUsername || normalizedUsername.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", normalizedUsername)
          .single();

        if (error && error.code === "PGRST116") {
          // No row found = username is available
          setUsernameStatus("available");
        } else if (data) {
          // Row found = username is taken
          setUsernameStatus("taken");
        } else {
          setUsernameStatus("idle");
        }
      } catch (err) {
        console.error("Username check error:", err);
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username, originalUsername]);

    // Debug log to check authentication state
  console.log('EditProfile user:', user);
  console.log('EditProfile profile:', profile);
  console.log('EditProfile selectedStyles:', selectedStyles);
  console.log('EditProfile profile.travel_styles:', profile?.travel_styles);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTravelStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style]
    );
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      [platform]: value,
    }));
  };

  const removeSocialLink = (platform: string) => {
    setSocialLinks((prev) => {
      const updated = { ...prev };
      delete updated[platform];
      return updated;
    });
  };

  const handleImageChange = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageToCrop(result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setProfileImage(croppedImageUrl);
    toast({
      title: "Photo updated",
      description: "Your profile photo has been cropped. Remember to save changes.",
    });
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    // Check username availability if it was changed
    const normalizedUsername = formData.username.trim().toLowerCase();
    const normalizedOriginal = originalUsername.trim().toLowerCase();

    if (normalizedUsername !== normalizedOriginal) {
      if (usernameStatus === "taken") {
        toast({
          title: "Username taken",
          description: "This username is already taken. Please choose another.",
          variant: "destructive",
        });
        return;
      }
      if (usernameStatus === "checking") {
        toast({
          title: "Checking availability",
          description: "Please wait while we check username availability...",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session) {
        toast({
          title: "Session expired",
          description: "Please log in again to update your profile.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      let data, error;
      const profilePayload = {
        full_name: formData.name.trim(),
        username: formData.username.trim().toLowerCase().replace(/\s+/g, '_') || null,
        phone: formData.phone.trim() || null,
        location: formData.location.trim() || null,
        bio: formData.bio.trim() || null,
        avatar_url: profileImage || null,
        travel_styles: selectedStyles,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        home_currency: selectedHomeCurrency,
        gender: formData.gender || null,
        updated_at: new Date().toISOString(),
      };

      if (profile) {
        // Update existing profile
        ({ data, error } = await supabase
          .from("profiles")
          .update(profilePayload)
          .eq("id", user.id)
          .select()
          .single());
      } else {
        // Create new profile row
        ({ data, error } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username: user.email?.split("@")[0] || "user",
            created_at: new Date().toISOString(),
            ...profilePayload,
          })
          .select()
          .single());
      }

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message || "Failed to save profile");
      }

      await refreshProfile();

      if (selectedHomeCurrency && selectedHomeCurrency !== homeCurrency) {
        setHomeCurrency(selectedHomeCurrency);
      }

      toast({
        title: profile ? "Profile updated" : "Profile created",
        description: "Your changes have been saved successfully.",
      });

      navigate("/profile");
    } catch (error) {
      console.error("Error saving profile:", error);

      let errorMessage = profile ? "Failed to update profile" : "Failed to create profile";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: profile ? "Update failed" : "Create failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const availablePlatformsToAdd = socialPlatforms.filter(
    (p) => !Object.keys(socialLinks).includes(p.id)
  );
  const allTravelStyleIds = travelStyles.map((style) => style.id);
  const allStylesSelected = selectedStyles.length === allTravelStyleIds.length;

  const addSocialLink = (platformId: string) => {
    setSocialLinks((prev) => ({
      ...prev,
      [platformId]: "",
    }));
  };

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-6 max-w-md w-full text-center">
            <h2 className="text-xl font-bold mb-2">Not authenticated</h2>
            <p className="text-muted-foreground mb-6">
              Please log in to edit your profile.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-50 glass border-b border-border/50 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate(-1)}>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-secondary flex items-center justify-center">
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </div>
            </button>
            <h1 className="font-semibold text-foreground text-sm sm:text-base">Edit Profile</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="rounded-full text-xs sm:text-sm"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="relative">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
              <AvatarImage src={profileImage} alt="Profile" />
              <AvatarFallback className="text-xl sm:text-2xl font-semibold">
                {formData.name.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleImageChange}
              className="absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            >
              <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
          <button
            onClick={handleImageChange}
            className="mt-2 sm:mt-3 text-xs sm:text-sm text-primary font-medium"
          >
            Change Photo
          </button>
        </div>

        <Card className="p-3 sm:p-4 border-border/50 space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            Account Information
          </h3>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                id="email"
                value={user.email || ""}
                disabled
                readOnly
                className="h-10 sm:h-11 rounded-xl pl-9 sm:pl-10 text-sm bg-muted/50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-xs sm:text-sm">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Your name"
              className="h-10 sm:h-11 rounded-xl text-sm"
              maxLength={50}
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="username" className="text-xs sm:text-sm">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="username (for mentioning in chat)"
                className={cn(
                  "h-10 sm:h-11 rounded-xl text-sm",
                  usernameStatus === "available" && "border-green-500",
                  usernameStatus === "taken" && "border-destructive",
                  usernameStatus === "checking" && "border-yellow-500"
                )}
                maxLength={30}
              />
              {usernameStatus === "checking" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                </div>
              )}
              {usernameStatus === "available" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              )}
              {usernameStatus === "taken" && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-destructive" />
                </div>
              )}
            </div>
            <p className={cn(
              "text-xs flex-1",
              usernameStatus === "available" && "text-green-600 font-medium",
              usernameStatus === "taken" && "text-destructive font-medium",
              usernameStatus === "checking" && "text-yellow-600",
              (usernameStatus === "idle" || !formData.username) && "text-muted-foreground"
            )}>
              {usernameStatus === "checking" && "Checking availability..."}
              {usernameStatus === "available" && "Username available"}
              {usernameStatus === "taken" && "Username already taken"}
              {(usernameStatus === "idle" || !formData.username) && "Lowercase letters, numbers, and underscores only"}
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+60 12-345 6789"
                className="h-10 sm:h-11 rounded-xl pl-9 sm:pl-10 text-sm"
                maxLength={20}
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="gender" className="text-xs sm:text-sm">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
              <SelectTrigger className="h-10 sm:h-11 rounded-xl text-sm">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="location" className="text-xs sm:text-sm">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="City, Country"
                className="h-10 sm:h-11 rounded-xl pl-9 sm:pl-10 text-sm"
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="bio" className="text-xs sm:text-sm">About Me</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell others about yourself..."
              className="rounded-xl min-h-[80px] sm:min-h-[100px] resize-none text-sm"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/500
            </p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-border/50 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">Travel Style</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {selectedStyles.length} selected
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (allStylesSelected) {
                    setSelectedStyles([]);
                  } else {
                    setSelectedStyles(allTravelStyleIds);
                  }
                }}
              >
                {allStylesSelected ? "Clear all" : "Select all"}
              </Button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select styles that match your travel preferences
          </p>
          <div>
            <TravelStyleGrid selectedStyles={selectedStyles} onToggle={toggleTravelStyle} />
            {selectedStyles.length === 0 && (
              <span className="mt-2 inline-block text-muted-foreground text-xs">No travel styles selected</span>
            )}
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-border/50 space-y-3">
          <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Preferences
          </h3>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              Home Currency
            </Label>
            <select
              className="h-10 sm:h-11 rounded-xl border border-input bg-background px-3 text-sm"
              value={selectedHomeCurrency}
              onChange={(e) => setSelectedHomeCurrency(e.target.value as CurrencyCode)}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} – {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Used to display expense totals and settlements
            </p>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-border/50 space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-foreground text-sm sm:text-base">Social Links</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Connect your social profiles
          </p>

          <div className="space-y-2 sm:space-y-3">
            {Object.entries(socialLinks).map(([platform, url]) => {
              const platformInfo = socialPlatforms.find((p) => p.id === platform) || {
                id: platform,
                label: platform,
                icon: Link2,
                placeholder: "https://",
              };
              const Icon = platformInfo.icon;
              return (
                <div key={platform} className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  </div>
                  <Input
                    value={url}
                    onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                    placeholder={platformInfo.placeholder}
                    className="h-8 sm:h-10 rounded-lg sm:rounded-xl flex-1 text-xs sm:text-sm"
                  />
                  <button
                    onClick={() => removeSocialLink(platform)}
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 hover:bg-destructive/20 transition-colors"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>

          {availablePlatformsToAdd.length > 0 && (
            <div className="pt-1 sm:pt-2">
              <p className="text-xs text-muted-foreground mb-1.5 sm:mb-2">Add more:</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {availablePlatformsToAdd.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => addSocialLink(platform.id)}
                      className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors text-xs sm:text-sm"
                    >
                      <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>{platform.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      <ImageCropModal
        open={cropModalOpen}
        onOpenChange={setCropModalOpen}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
      />
    </AppLayout>
  );
}
