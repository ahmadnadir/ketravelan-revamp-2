/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Sparkles, ChevronRight, Instagram, Link2, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelector, Country, countries } from "@/components/onboarding/CountrySelector";
import { TravelStyleGrid } from "@/components/onboarding/TravelStyleGrid";
import { ImageCropModal } from "@/components/profile/ImageCropModal";
import { useAuth } from "@/contexts/AuthContext";
import { CurrencyCode, getCurrencyInfo } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const navigate = useNavigate();
  const { setHomeCurrency, user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Profile
  const [name, setName] = useState(profile?.full_name || profile?.username || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [gender, setGender] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  // Step 2: Location
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [derivedCurrency, setDerivedCurrency] = useState<CurrencyCode>("MYR");
  const [showCurrencyOverride, setShowCurrencyOverride] = useState(false);

  // Step 3: About & Social
  const [aboutMe, setAboutMe] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    tiktok: "",
    other: "",
  });

  // Step 4: Travel Styles
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  // Load saved avatar on mount
  useEffect(() => {
    const savedAvatar = localStorage.getItem("ketravelan-avatar");
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username)
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
  }, [username]);

  // Update derived currency when country changes
  const handleCountryChange = (selectedCountry: Country) => {
    setCountry(selectedCountry.name);
    setDerivedCurrency(selectedCountry.currency);
    setShowCurrencyOverride(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPendingImage(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setAvatarUrl(croppedDataUrl);
    localStorage.setItem("ketravelan-avatar", croppedDataUrl);
    setCropModalOpen(false);
    setPendingImage(null);
  };

  const handleStyleToggle = (styleId: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((id) => id !== styleId)
        : [...prev, styleId]
    );
  };

  const handleNext = async () => {
    // Step 1 validation: name and username required
    if (currentStep === 1) {
      if (!name.trim()) {
        alert("Please enter your name");
        return;
      }
      if (!username.trim()) {
        alert("Please enter a username");
        return;
      }
      if (username.length < 3) {
        alert("Username must be at least 3 characters");
        return;
      }
      if (usernameStatus === "taken") {
        alert("This username is already taken. Please choose another.");
        return;
      }
      if (usernameStatus === "checking") {
        alert("Please wait while we check username availability...");
        return;
      }
    }

    if (!user) {
      setCurrentStep((prev) => prev + 1);
      return;
    }
    // Prepare update payload (do not set onboarding_completed except on last step)
    const updatePayload: any = {
      full_name: name,
      username: username,
      gender,
      avatar_url: avatarUrl,
      country,
      city,
      location,
      home_currency: derivedCurrency,
      bio: aboutMe,
      social_links: socialLinks,
      travel_styles: selectedStyles,
      updated_at: new Date().toISOString(),
    };
    Object.keys(updatePayload).forEach((k) => {
      if (
        updatePayload[k] === undefined ||
        updatePayload[k] === null ||
        (typeof updatePayload[k] === "string" && updatePayload[k].trim() === "") ||
        (Array.isArray(updatePayload[k]) && updatePayload[k].length === 0)
      ) {
        delete updatePayload[k];
      }
    });
    // Ensure row exists: upsert with primary key id
    await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updatePayload }, { onConflict: "id" });
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async (destination: "/explore" | "/create" = "/explore") => {
    if (!user) return;
    setIsCompleting(true);
    setHomeCurrency(derivedCurrency);
    // Prepare update payload
    const updatePayload: any = {
      full_name: name,
      gender,
      avatar_url: avatarUrl,
      country,
      city,
      home_currency: derivedCurrency,
      bio: aboutMe,
      social_links: socialLinks,
      travel_styles: selectedStyles,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    // Remove empty/undefined fields
    Object.keys(updatePayload).forEach((k) => {
      if (
        updatePayload[k] === undefined ||
        updatePayload[k] === null ||
        (typeof updatePayload[k] === "string" && updatePayload[k].trim() === "") ||
        (Array.isArray(updatePayload[k]) && updatePayload[k].length === 0)
      ) {
        delete updatePayload[k];
      }
    });
    // Save to Supabase
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updatePayload }, { onConflict: "id" });
    if (error) {
      alert("Failed to update profile: " + error.message);
      return;
    }
    // Fire onboarding email via Edge Function (non-blocking)
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: user.email,
          userName: name,
        },
      });
    } catch (e) {
      // Silently ignore email failures
      console.warn('Failed to send onboarding email', e);
    }
    navigate(destination);
    // no need to reset isCompleting due to navigation
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return country !== "";
      case 3:
        return true; // All optional
      case 4:
        return true; // Styles are optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSkip = () => {
    localStorage.setItem("ketravelan-onboarded", "skipped");
    navigate("/explore");
  };

  const currencyInfo = getCurrencyInfo(derivedCurrency);
  const selectedCountryData = countries.find((c) => c.name === country);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="container max-w-lg mx-auto flex h-16 items-center px-4">
          {currentStep > 1 ? (
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
          <div className="flex-1" />
          {currentStep < 5 ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {currentStep} of {TOTAL_STEPS - 1}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                Skip
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 container max-w-lg mx-auto px-4 py-6 flex flex-col">
        {/* Step 1: Basic Profile */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Let's set up your profile</h1>
              <p className="text-muted-foreground">
                This helps travel buddies get to know you
              </p>
            </div>

            {/* Avatar Picker */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Avatar
                  className="h-28 w-28 border-4 border-background shadow-lg cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-muted">
                    {name ? getInitials(name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2 mb-5">
              <label className="text-sm font-medium">
                Your name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Username Input */}
            <div className="space-y-2 mb-5">
              <label className="text-sm font-medium">
                Username <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="username (for mentioning in chat)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className={cn(
                    "h-12 text-base",
                    usernameStatus === "available" && "border-green-500",
                    usernameStatus === "taken" && "border-destructive",
                    usernameStatus === "checking" && "border-yellow-500"
                  )}
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
                "text-xs",
                usernameStatus === "available" && "text-green-600 font-medium",
                usernameStatus === "taken" && "text-destructive font-medium",
                usernameStatus === "checking" && "text-yellow-600",
                !username || username.length < 3 && "text-muted-foreground"
              )}>
                {usernameStatus === "checking" && "Checking availability..."}
                {usernameStatus === "available" && "Username available"}
                {usernameStatus === "taken" && "Username already taken"}
                {(!username || username.length < 3 || usernameStatus === "idle") && "Lowercase letters, numbers, and underscores only. Can't be changed later."}
              </p>
            </div>

            {/* Gender Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Gender (optional)</label>
              <Select value={gender || ""} onValueChange={(v) => setGender(v || null)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Helps us personalise your profile
              </p>
            </div>

            <div className="flex-1" />
          </div>
        )}

        {/* Step 2: Location */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Where are you based?</h1>
              <p className="text-muted-foreground">
                We'll use this to set your home currency and show clearer costs
              </p>
            </div>

            {/* Country Selector */}
            <div className="space-y-2 mb-5">
              <label className="text-sm font-medium">
                Country <span className="text-destructive">*</span>
              </label>
              <CountrySelector value={country} onChange={handleCountryChange} />
            </div>

            {/* City Input */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                City (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., Kuala Lumpur"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setLocation(e.target.value); // Set location to city value
                }}
                  className="h-12 text-base"
              />
            </div>

            {/* Derived Currency Display */}
            {country && (
              <div className="bg-card rounded-xl border border-border p-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Suggested Home Currency</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedCountryData?.flag || currencyInfo?.flag}</span>
                      <div>
                        <p className="font-semibold">
                          {currencyInfo?.symbol} {derivedCurrency}
                        </p>
                        <p className="text-sm text-muted-foreground">{currencyInfo?.name}</p>
                      </div>
                    </div>
                  </div>
                  {!showCurrencyOverride ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowCurrencyOverride(true)}
                    >
                      Change
                    </Button>
                  ) : null}
                </div>

                {showCurrencyOverride && (
                  <div className="mt-4 pt-4 border-t border-border animate-in fade-in duration-200">
                    <label className="text-sm font-medium mb-2 block">Override Currency</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["MYR", "USD", "EUR", "IDR"] as CurrencyCode[]).map((code) => {
                        const info = getCurrencyInfo(code);
                        return (
                          <button
                            key={code}
                            onClick={() => setDerivedCurrency(code)}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-lg border transition-all",
                              derivedCurrency === code
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <span className="text-xl mb-1">{info?.flag}</span>
                            <span className="text-xs font-medium">{code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1" />
          </div>
        )}

        {/* Step 3: About & Social */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">Tell others about you</h1>
              <p className="text-muted-foreground">
                A short intro builds trust and better travel matches
              </p>
            </div>

            {/* About Me */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium">About Me (optional)</label>
              <Textarea
                placeholder="Love exploring new places and trying local food!"
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value.slice(0, 200))}
                className="min-h-[100px] text-base resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {aboutMe.length}/200
              </p>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <label className="text-sm font-medium">Social Links (optional)</label>
              
              <div className="space-y-3">
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="@yourusername"
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks((prev) => ({ ...prev, instagram: e.target.value }))}
                    className="h-12 text-base pl-10"
                  />
                </div>

                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                  <Input
                    type="text"
                    placeholder="@yourusername"
                    value={socialLinks.tiktok}
                    onChange={(e) => setSocialLinks((prev) => ({ ...prev, tiktok: e.target.value }))}
                    className="h-12 text-base pl-10"
                  />
                </div>

                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://yoursite.com"
                    value={socialLinks.other}
                    onChange={(e) => setSocialLinks((prev) => ({ ...prev, other: e.target.value }))}
                    className="h-12 text-base pl-10"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                You can edit this anytime
              </p>
            </div>

            <div className="flex-1" />
          </div>
        )}

        {/* Step 4: Travel Styles */}
        {currentStep === 4 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">What's your travel vibe?</h1>
              <p className="text-muted-foreground">
                Pick styles that match how you like to travel
              </p>
            </div>

            <TravelStyleGrid
              selectedStyles={selectedStyles}
              onToggle={handleStyleToggle}
            />

            {selectedStyles.length > 0 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                {selectedStyles.length} selected {selectedStyles.length >= 3 && selectedStyles.length <= 5 && "✓"}
              </p>
            )}
            {selectedStyles.length === 0 && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Pick 3–5 that describe you
              </p>
            )}

            <div className="flex-1" />
          </div>
        )}

        {/* Step 5: Completion */}
        {currentStep === 5 && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            {isCompleting && (
              <div className="w-full mb-4">
                <div className="h-1 w-full bg-primary/20 rounded">
                  <div className="h-1 w-1/3 bg-primary rounded animate-pulse" />
                </div>
              </div>
            )}
            {/* Celebration */}
            <div className="relative mb-6">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              {/* Decorative dots */}
              <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-warning" />
              <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-info" />
              <div className="absolute top-1/2 -right-4 h-2 w-2 rounded-full bg-success" />
            </div>

            <h1 className="text-2xl font-bold mb-2">You're all set! 🎉</h1>
            <p className="text-muted-foreground text-center mb-8">
              Your profile is ready to go
            </p>

            {/* Summary Card */}
            <div className="w-full bg-card rounded-2xl border border-border p-5 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-14 w-14 border-2 border-background shadow">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {city ? `${city}, ${country}` : country}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{currencyInfo?.flag}</span>
                <span className="font-medium">{derivedCurrency}</span>
                <span className="text-muted-foreground">• Home Currency</span>
              </div>

              {selectedStyles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedStyles.slice(0, 5).map((styleId) => {
                    const style = [
                      { id: "adventure", label: "Adventure", emoji: "🏔️" },
                      { id: "budget", label: "Budget-friendly", emoji: "💰" },
                      { id: "nature", label: "Nature", emoji: "🌿" },
                      { id: "food", label: "Food", emoji: "🍜" },
                      { id: "city", label: "City", emoji: "🏙️" },
                      { id: "culture", label: "Culture", emoji: "🏛️" },
                      { id: "photography", label: "Photo", emoji: "📸" },
                      { id: "hiking", label: "Hiking", emoji: "🥾" },
                      { id: "wildlife", label: "Wildlife", emoji: "🦁" },
                      { id: "beach", label: "Beach", emoji: "🏖️" },
                      { id: "luxury", label: "Luxury", emoji: "✨" },
                      { id: "backpacking", label: "Backpacking", emoji: "🎒" },
                      { id: "solo", label: "Solo", emoji: "🧭" },
                      { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
                      { id: "romantic", label: "Romantic", emoji: "💕" },
                    ].find((s) => s.id === styleId);
                    if (!style) return null;
                    return (
                      <span
                        key={styleId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted rounded-full text-xs font-medium"
                      >
                        {style.emoji} {style.label}
                      </span>
                    );
                  })}
                  {selectedStyles.length > 5 && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                      +{selectedStyles.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="w-full space-y-3">
              <Button
                onClick={() => handleComplete("/explore")}
                className="w-full h-12 text-base font-medium rounded-xl"
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Starting...
                  </span>
                ) : (
                  <>
                    Start Exploring
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleComplete("/create")}
                className="w-full h-12 text-base font-medium rounded-xl"
                disabled={isCompleting}
              >
                Create a Trip
              </Button>
            </div>
          </div>
        )}

        {/* Progress Dots + Continue Button */}
        {currentStep < 5 && (
          <div className="mt-auto pt-6">
            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    step === currentStep
                      ? "w-6 bg-primary"
                      : step < currentStep
                      ? "w-2 bg-primary"
                      : "w-2 bg-muted"
                  )}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full h-12 text-base font-medium rounded-xl"
            >
              Continue
            </Button>

            {currentStep === 1 && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Photo is optional, you can add it later
              </p>
            )}
          </div>
        )}
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={cropModalOpen}
        onOpenChange={setCropModalOpen}
        imageSrc={pendingImage}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
