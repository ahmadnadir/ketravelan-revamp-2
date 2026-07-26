import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Moon,
  Globe,
  HelpCircle,
  FileText,
  MessageSquare,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Link2,
  Trash2,
  Ban,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AppLayout } from "@/components/layout/AppLayout";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ParentalPinOnboarding from "@/components/ParentalPinOnboarding";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserPreferences, updateUserPreference } from "@/lib/userPreferences";
import { useEffect } from "react";
import { syncPushNotifications } from "@/lib/pushNotifications";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";
import {
  getEffectiveSocialFeaturesLevel,
  getStoredSocialFeaturesLevel,
  isMinorProfile,
  setStoredSocialFeaturesLevel,
  type SocialFeaturesLevel,
} from "@/lib/familiesSafety";


interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

const SettingItem = ({ icon, label, description, onClick, trailing, destructive }: SettingItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${
      destructive ? "text-destructive" : ""
    }`}
  >
    <div className={`${destructive ? "text-destructive" : "text-muted-foreground"}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>
        {label}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    {trailing || <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
  </button>
);

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, deleteAccount, user, profile, linkedProviders, linkGoogleIdentity, linkAppleIdentity, identityLinkingAvailable, refreshProfile } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showLinkConflictDialog, setShowLinkConflictDialog] = useState(false);
  const [linkConflictProvider, setLinkConflictProvider] = useState<"Google" | "Apple">("Apple");
  const [socialFeaturesLevel, setSocialFeaturesLevel] = useState<SocialFeaturesLevel>(() => getStoredSocialFeaturesLevel() || "full");
  const [showSocialPinDialog, setShowSocialPinDialog] = useState(false);
  const [socialPinInput, setSocialPinInput] = useState("");
  const [pendingSocialFeaturesLevel, setPendingSocialFeaturesLevel] = useState<SocialFeaturesLevel | null>(null);
  const [socialPinMode, setSocialPinMode] = useState<"create" | "verify">("verify");
  const [isSavingSocialLevel, setIsSavingSocialLevel] = useState(false);
  const [isResettingSocialPin, setIsResettingSocialPin] = useState(false);
  const [showChangeSocialPinDialog, setShowChangeSocialPinDialog] = useState(false);
  const [currentSocialPinInput, setCurrentSocialPinInput] = useState("");
  const [newSocialPinInput, setNewSocialPinInput] = useState("");
  const [socialPinChangeStep, setSocialPinChangeStep] = useState<"current" | "new">("current");
  const [pendingSocialPinHash, setPendingSocialPinHash] = useState<string | null>(null);
  const [isChangingSocialPin, setIsChangingSocialPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingApple, setIsLinkingApple] = useState(false);

  const isCreatingPinForSocialSetting = showSocialPinDialog && socialPinMode === "create";
  const isVerifyingPinForSocialSetting = showSocialPinDialog && socialPinMode === "verify";
  const isVerifyingPinForChangePin = showChangeSocialPinDialog && socialPinChangeStep === "current";
  const isCreatingPinForChangePin = showChangeSocialPinDialog && socialPinChangeStep === "new" && !pendingSocialPinHash;
  const showParentalPinPage = isCreatingPinForSocialSetting || isVerifyingPinForSocialSetting || isVerifyingPinForChangePin || isCreatingPinForChangePin;

  const handleParentalPinOnboardingComplete = () => {
    if (isCreatingPinForSocialSetting || isVerifyingPinForSocialSetting) {
      setShowSocialPinDialog(false);
      if (pendingSocialFeaturesLevel) {
        setSocialFeaturesLevel(pendingSocialFeaturesLevel);
        setStoredSocialFeaturesLevel(pendingSocialFeaturesLevel);
        setPendingSocialFeaturesLevel(null);
        toast.success("Family safety setting updated");
      }
      return;
    }

    if (isCreatingPinForChangePin) {
      setShowChangeSocialPinDialog(false);
      setSocialPinChangeStep("current");
      setPendingSocialPinHash(null);
      return;
    }
  };

  const handleParentalPinOnboardingCancel = () => {
    if (isCreatingPinForSocialSetting || isVerifyingPinForSocialSetting) {
      setShowSocialPinDialog(false);
      setPendingSocialFeaturesLevel(null);
    }

    if (isVerifyingPinForChangePin || isCreatingPinForChangePin) {
      setShowChangeSocialPinDialog(false);
      setSocialPinChangeStep("current");
      setPendingSocialPinHash(null);
    }
  };
  
  // Notification settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [tripReminders, setTripReminders] = useState(true);
  
  // Privacy settings state
  const [profileVisible, setProfileVisible] = useState(true);
  const [showTripsPublicly, setShowTripsPublicly] = useState(true);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const hasEmailProvider = linkedProviders.includes("email");
  const hasGoogleProvider = linkedProviders.includes("google");
  const hasAppleProvider = linkedProviders.includes("apple");
  const identityLinkingDisabled = !identityLinkingAvailable;
  const isMinorAccount = isMinorProfile(profile);
  const socialAccessBlockedState = location.state as { socialAccessBlocked?: boolean; blockedPath?: string } | null;
  const showSocialAccessBlockedNotice = Boolean(socialAccessBlockedState?.socialAccessBlocked);
  const blockedPath = socialAccessBlockedState?.blockedPath || "";
  const blockedFeatureLabel = blockedPath.startsWith("/chat")
    ? "chat"
    : blockedPath.startsWith("/community")
      ? "community"
      : blockedPath.startsWith("/create-story")
        ? "story creation"
        : "social features";
  const pendingSocialLevelLabel = pendingSocialFeaturesLevel === "disabled"
    ? "Disabled"
    : pendingSocialFeaturesLevel === "full"
      ? "Full Access"
      : null;

  const hashSocialPin = (pin: string) => {
    let hash = 0;
    for (let i = 0; i < pin.length; i += 1) {
      hash = (hash << 5) - hash + pin.charCodeAt(i);
      hash |= 0;
    }
    return `social-pin:${Math.abs(hash)}`;
  };

  const getStoredSocialPinHash = useCallback(() => {
    const raw = (profile as { social_features_pin_hash?: unknown } | null)?.social_features_pin_hash;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
  }, [profile]);

  const isLinkConflictError = (message: string) => {
    const normalized = message.toLowerCase();
    return [
      "already attached",
      "already linked",
      "identity_already_exists",
      "identity is already linked",
      "account exists",
      "already registered",
      "sign up not completed",
      "sign in not completed",
    ].some((token) => normalized.includes(token));
  };

  // Load preferences on mount
  useEffect(() => {
    if (!user?.id) return;
    
    const loadPreferences = async () => {
      setIsLoading(true);
      const prefs = await fetchUserPreferences(user.id);
      if (prefs) {
        setEmailNotifications(prefs.email_notifications);
        setPushNotifications(prefs.push_notifications);
        setTripReminders(prefs.trip_reminders);
        setProfileVisible(prefs.is_public);
        setShowTripsPublicly(prefs.show_trips_publicly);
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, [user?.id]);

  useEffect(() => {
    setSocialFeaturesLevel(getEffectiveSocialFeaturesLevel(isMinorAccount));
  }, [isMinorAccount]);

  // Handle preference changes
  const handlePreferenceChange = async (key: "email_notifications" | "push_notifications" | "trip_reminders" | "is_public" | "show_trips_publicly", value: boolean) => {
    if (!user?.id) return;
    
    const success = await updateUserPreference(user.id, key, value);
    if (!success) {
      toast.error("Failed to save preference");
      // Revert the change
      switch (key) {
        case "email_notifications":
          setEmailNotifications(!value);
          break;
        case "push_notifications":
          setPushNotifications(!value);
          break;
        case "trip_reminders":
          setTripReminders(!value);
          break;
        case "is_public":
          setProfileVisible(!value);
          break;
        case "show_trips_publicly":
          setShowTripsPublicly(!value);
          break;
      }
    } else {
      // Show specific toast messages for each preference
      switch (key) {
        case "email_notifications":
          toast.success(value ? "Email notifications enabled" : "Email notifications disabled");
          break;
        case "push_notifications":
          toast.success(value ? "Push notifications enabled" : "Push notifications disabled");
          break;
        case "trip_reminders":
          toast.success(value ? "Trip reminders enabled" : "Trip reminders disabled");
          break;
        case "is_public":
          toast.success(value ? "Your profile is now visible" : "Your profile is now private");
          break;
        case "show_trips_publicly":
          toast.success(value ? "Your trips are now public" : "Your trips are now private");
          break;
      }
    }
    return success;
  };

  const handlePushToggle = async (value: boolean) => {
    setPushNotifications(value);
    const success = await handlePreferenceChange("push_notifications", value);
    if (success && user?.id) {
      await syncPushNotifications(user.id, value);
    }
  };

  const handleResetNotificationSettings = async () => {
    if (!user?.id) {
      toast.error("Please sign in again and retry");
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.info("Reset notification state is available in the mobile app.");
      return;
    }

    try {
      // Reset push registration state on device and server, then register again.
      await syncPushNotifications(user.id, false);
      await syncPushNotifications(user.id, true);

      if (!pushNotifications) {
        setPushNotifications(true);
        await handlePreferenceChange("push_notifications", true);
      }

      toast.success("Notification state reset complete. Send a test notification now.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset notification state";
      toast.error(message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      setShowLogoutDialog(false);
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to logout";
      toast.error(message);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Type DELETE to confirm account deletion");
      return;
    }

    try {
      setIsDeletingAccount(true);
      const result = await deleteAccount();
      setShowDeleteAccountDialog(false);
      setDeleteConfirmText("");

      if (result?.email?.attempted && !result.email.sent) {
        toast.error(`Your account was deleted, but confirmation email failed: ${result.email.error || "unknown reason"}`);
      } else if (result?.email?.attempted && result.email.sent) {
        toast.success("Your account has been deleted. Confirmation email sent.");
      } else {
        toast.success("Your account has been deleted");
      }

      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete account";
      toast.error(message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword.trim()) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password cannot be the same as current password");
      return;
    }

    setIsChangingPassword(true);
    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        setIsChangingPassword(false);
        return;
      }

      // If current password is verified, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error(updateError.message || "Failed to change password");
      } else {
        toast.success("Password changed successfully");
        setShowPasswordDialog(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to change password";
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (hasGoogleProvider) return;
    try {
      setIsLinkingGoogle(true);
      await linkGoogleIdentity("/settings");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect Google";
      if (isLinkConflictError(message)) {
        setLinkConflictProvider("Google");
        setShowLinkConflictDialog(true);
        return;
      }
      toast.error(message);
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleLinkApple = async () => {
    if (hasAppleProvider) return;
    try {
      setIsLinkingApple(true);
      await linkAppleIdentity("/settings");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect Apple";
      if (isLinkConflictError(message)) {
        setLinkConflictProvider("Apple");
        setShowLinkConflictDialog(true);
        return;
      }
      toast.error(message);
    } finally {
      setIsLinkingApple(false);
    }
  };

  const handleSetSocialFeaturesLevel = (level: SocialFeaturesLevel) => {
    if (level === socialFeaturesLevel) return;

    setPendingSocialFeaturesLevel(level);
    setSocialPinInput("");
    setSocialPinMode(getStoredSocialPinHash() ? "verify" : "create");
    setShowSocialPinDialog(true);
  };

  const handleConfirmSocialFeaturesLevelChange = useCallback(async () => {
    if (!user?.id || !pendingSocialFeaturesLevel) {
      setShowSocialPinDialog(false);
      return;
    }

    if (!/^\d{4}$/.test(socialPinInput)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }

    const computedHash = hashSocialPin(socialPinInput);
    const existingHash = getStoredSocialPinHash();

    if (socialPinMode === "verify") {
      if (!existingHash || existingHash !== computedHash) {
        toast.error("Invalid PIN");
        return;
      }
    }

    try {
      setIsSavingSocialLevel(true);

      const updatePayload: { social_features_pin_hash?: string } = {};
      if (socialPinMode === "create") {
        updatePayload.social_features_pin_hash = computedHash;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", user.id);

        if (profileUpdateError) {
          throw profileUpdateError;
        }
        await refreshProfile();
      }

      setSocialFeaturesLevel(pendingSocialFeaturesLevel);
      setStoredSocialFeaturesLevel(pendingSocialFeaturesLevel);
      setShowSocialPinDialog(false);
      setSocialPinInput("");
      setPendingSocialFeaturesLevel(null);
      toast.success("Family safety setting updated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update family safety setting";
      toast.error(message);
    } finally {
      setIsSavingSocialLevel(false);
    }
  }, [
    user,
    pendingSocialFeaturesLevel,
    socialPinInput,
    socialPinMode,
    refreshProfile,
    getStoredSocialPinHash,
  ]);

  const handleForgotSocialPin = async () => {
    if (!user?.email) {
      toast.error("No email address found for this account");
      return;
    }

    try {
      setIsResettingSocialPin(true);
      const { data, error } = await supabase.functions.invoke("send-social-pin-reset", {
        body: {},
      });

      if (error) {
        throw error;
      }

      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error?: string }).error || "Failed to reset PIN");
      }

      await refreshProfile();
      setSocialPinInput("");
      toast.success("A new PIN has been emailed to you");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset PIN";
      toast.error(message);
    } finally {
      setIsResettingSocialPin(false);
    }
  };

  const openChangeSocialPinDialog = () => {
    const existingHash = getStoredSocialPinHash();

    if (!existingHash) {
      setCurrentSocialPinInput("");
      setNewSocialPinInput("");
      setPendingSocialPinHash(null);
      setSocialPinChangeStep("new");
      setShowChangeSocialPinDialog(true);
      return;
    }

    setCurrentSocialPinInput("");
    setNewSocialPinInput("");
    setPendingSocialPinHash(existingHash);
    setSocialPinChangeStep("current");
    setShowChangeSocialPinDialog(true);
  };

  const handleConfirmSocialPinChange = useCallback(async () => {
    if (!user?.id) return;

    const existingHash = pendingSocialPinHash || getStoredSocialPinHash();
    if (!existingHash) {
      toast.error("No PIN found. Create one first.");
      return;
    }

    if (socialPinChangeStep === "current") {
      if (!/^\d{4}$/.test(currentSocialPinInput)) {
        toast.error("Current PIN must be exactly 4 digits");
        return;
      }

      if (hashSocialPin(currentSocialPinInput) !== existingHash) {
        toast.error("Current PIN is incorrect");
        return;
      }

      setSocialPinChangeStep("new");
      return;
    }

    if (!/^\d{4}$/.test(newSocialPinInput)) {
      toast.error("New PIN must be exactly 4 digits");
      return;
    }

    const newHash = hashSocialPin(newSocialPinInput);

    try {
      setIsChangingSocialPin(true);
      const { error } = await supabase
        .from("profiles")
        .update({ social_features_pin_hash: newHash })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      setShowChangeSocialPinDialog(false);
      setCurrentSocialPinInput("");
      setNewSocialPinInput("");
      setPendingSocialPinHash(null);
      setSocialPinChangeStep("current");
      toast.success("PIN updated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update PIN";
      toast.error(message);
    } finally {
      setIsChangingSocialPin(false);
    }
  }, [
    user,
    pendingSocialPinHash,
    currentSocialPinInput,
    newSocialPinInput,
    socialPinChangeStep,
    refreshProfile,
    getStoredSocialPinHash,
  ]);

  useEffect(() => {
    if (showParentalPinPage) return;
    if (!showSocialPinDialog || isSavingSocialLevel) return;
    if (socialPinInput.length !== 4) return;
    void handleConfirmSocialFeaturesLevelChange();
  }, [
    socialPinInput,
    showSocialPinDialog,
    isSavingSocialLevel,
    handleConfirmSocialFeaturesLevelChange,
    showParentalPinPage,
  ]);

  useEffect(() => {
    if (showParentalPinPage) return;
    if (!showChangeSocialPinDialog || isChangingSocialPin) return;
    if (socialPinChangeStep === "current" && currentSocialPinInput.length === 4) {
      void handleConfirmSocialPinChange();
      return;
    }
    if (socialPinChangeStep === "new" && newSocialPinInput.length === 4) {
      void handleConfirmSocialPinChange();
    }
  }, [
    currentSocialPinInput,
    newSocialPinInput,
    showChangeSocialPinDialog,
    socialPinChangeStep,
    isChangingSocialPin,
    handleConfirmSocialPinChange,
    showParentalPinPage,
  ]);

  return (
    <AppLayout
      hideHeader={showParentalPinPage}
      hideBottomNav={showParentalPinPage}
      fullWidth={showParentalPinPage}
      mainClassName={showParentalPinPage ? "px-0 sm:px-0" : undefined}
    >
      {showParentalPinPage && (
        <ParentalPinOnboarding
          mode={
            isVerifyingPinForSocialSetting || isVerifyingPinForChangePin
              ? "verify"
              : "create"
          }
          closeIcon
          onForgotPin={
            isVerifyingPinForSocialSetting || isVerifyingPinForChangePin
              ? handleForgotSocialPin
              : undefined
          }
          isResettingPin={isResettingSocialPin}
          showSafetyFooter={false}
          heading={
            isVerifyingPinForSocialSetting
              ? "Enter parental control PIN"
              : isVerifyingPinForChangePin
                ? "Confirm parental PIN"
                : isCreatingPinForChangePin
                  ? "Choose a new parental PIN"
                  : undefined
          }
          description={
            isVerifyingPinForSocialSetting
              ? `Enter your parental control PIN to change social access to ${pendingSocialLevelLabel || "this setting"}. This keeps child social settings protected until a parent approves the change.`
              : isVerifyingPinForChangePin
                ? "Confirm your current parental PIN to continue."
                : isCreatingPinForChangePin
                  ? "Choose a new 4-digit parental PIN to replace the existing one."
                  : undefined
          }
          submitLabel={
            isVerifyingPinForSocialSetting || isVerifyingPinForChangePin
              ? "Verify"
              : undefined
          }
          mandatory={false}
          onComplete={handleParentalPinOnboardingComplete}
          onCancel={handleParentalPinOnboardingCancel}
          onVerify={
            isVerifyingPinForSocialSetting
              ? async (pin) => {
                if (!user?.id || !pendingSocialFeaturesLevel) {
                  toast.error("Unable to verify PIN.");
                  return false;
                }

                if (!/^\d{4}$/.test(pin)) {
                  toast.error("PIN must be exactly 4 digits");
                  return false;
                }

                const computedHash = hashSocialPin(pin);
                const existingHash = getStoredSocialPinHash();

                if (!existingHash || existingHash !== computedHash) {
                  toast.error("Invalid PIN");
                  return false;
                }

                // Let onComplete apply the setting and show the success toast once.
                return true;
              }
              : isVerifyingPinForChangePin
                ? async (pin) => {
                  const existingHash = getStoredSocialPinHash();
                  if (!existingHash) {
                    toast.error("No existing PIN found.");
                    return false;
                  }

                  if (!/^\d{4}$/.test(pin)) {
                    toast.error("PIN must be exactly 4 digits");
                    return false;
                  }

                  if (hashSocialPin(pin) !== existingHash) {
                    toast.error("Current PIN is incorrect");
                    return false;
                  }

                  setPendingSocialPinHash(null);
                  setSocialPinChangeStep("new");
                  return false;
                }
                : undefined
          }
        />
      )}

      {/* Page Header with Back Button */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate("/profile")}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="space-y-4">
        {showSocialAccessBlockedNotice && (
          <Card className="border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm font-semibold text-destructive">Social features are disabled</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Access to {blockedFeatureLabel} is currently blocked for this child account. Switch Social Features Level to Full Access to enable it.
            </p>
          </Card>
        )}

        {/* Notifications Section */}
        <Card className="overflow-hidden border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Notifications</h2>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            <SettingItem
              icon={<Bell className="h-5 w-5" />}
              label="Push Notifications"
              description="Receive alerts on your device"
              trailing={
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={(value) => {
                    handlePushToggle(value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              onClick={() => {
                const newValue = !pushNotifications;
                handlePushToggle(newValue);
              }}
            />
            <SettingItem
              icon={<MessageSquare className="h-5 w-5" />}
              label="Email Notifications"
              description="Get updates via email"
              trailing={
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(value) => {
                    setEmailNotifications(value);
                    handlePreferenceChange("email_notifications", value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              onClick={() => {
                const newValue = !emailNotifications;
                setEmailNotifications(newValue);
                handlePreferenceChange("email_notifications", newValue);
              }}
            />
            <SettingItem
              icon={<Bell className="h-5 w-5" />}
              label="Trip Reminders"
              description="Reminders before your trips"
              trailing={
                <Switch
                  checked={tripReminders}
                  onCheckedChange={(value) => {
                    setTripReminders(value);
                    handlePreferenceChange("trip_reminders", value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              onClick={() => {
                const newValue = !tripReminders;
                setTripReminders(newValue);
                handlePreferenceChange("trip_reminders", newValue);
              }}
            />
            <SettingItem
              icon={<Bell className="h-5 w-5" />}
              label="Reset Notification State"
              description="Re-register push notifications on this device"
              onClick={handleResetNotificationSettings}
            />
          </div>
        </Card>

        {/* Privacy Section */}
        <Card className="overflow-hidden border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Privacy</h2>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            <SettingItem
              icon={<Shield className="h-5 w-5" />}
              label="Profile Visibility"
              description="Allow others to view your profile"
              trailing={
                <Switch
                  checked={profileVisible}
                  onCheckedChange={(value) => {
                    setProfileVisible(value);
                    handlePreferenceChange("is_public", value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              onClick={() => {
                const newValue = !profileVisible;
                setProfileVisible(newValue);
                handlePreferenceChange("is_public", newValue);
              }}
            />
            <SettingItem
              icon={<Globe className="h-5 w-5" />}
              label="Show Trips Publicly"
              description="Display your trips on your profile"
              trailing={
                <Switch
                  checked={showTripsPublicly}
                  onCheckedChange={(value) => {
                    setShowTripsPublicly(value);
                    handlePreferenceChange("show_trips_publicly", value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              onClick={() => {
                const newValue = !showTripsPublicly;
                setShowTripsPublicly(newValue);
                handlePreferenceChange("show_trips_publicly", newValue);
              }}
            />
            <SettingItem
              icon={<Ban className="h-5 w-5" />}
              label="Blocked Users"
              description="Manage users you have blocked"
              onClick={() => navigate("/settings/blocked-users")}
            />
          </div>
        </Card>

        {/* Family Safety Section */}
        <Card className="overflow-hidden border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Family Safety</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage child social access controls on this device.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium text-foreground">Social Features Level</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isMinorAccount
                  ? "Child account detected from date of birth."
                  : "No child account detected. These controls still apply on this device."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A 4-digit PIN is required to change this setting.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={socialFeaturesLevel === "disabled" ? "default" : "outline"}
                  onClick={() => handleSetSocialFeaturesLevel("disabled")}
                >
                  Disabled
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={socialFeaturesLevel === "full" ? "default" : "outline"}
                  onClick={() => handleSetSocialFeaturesLevel("full")}
                >
                  Full Access
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openChangeSocialPinDialog}
                >
                  Change PIN
                </Button>
              </div>
            </div>

          </div>
        </Card>

        {/* Preferences Section */}
        {/* <Card className="overflow-hidden border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Preferences</h2>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            <SettingItem
              icon={<Moon className="h-5 w-5" />}
              label="Appearance"
              description="Light, dark, or system theme"
              onClick={() => toast.info("Theme settings coming soon")}
            />
            <SettingItem
              icon={<Globe className="h-5 w-5" />}
              label="Language"
              description="English"
              onClick={() => toast.info("Language settings coming soon")}
            />
          </div>
        </Card> */}

        {/* Account Section */}
        <Card className="overflow-hidden border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Connected Accounts</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in with your existing method first, then connect other providers here.
            </p>
            {identityLinkingDisabled && (
              <p className="mt-2 text-xs text-amber-700">
                Manual linking is currently disabled in Supabase Authentication. Enable it in Dashboard &gt; Authentication &gt; Providers.
              </p>
            )}
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Email & Password</p>
                <p className="text-xs text-muted-foreground">
                  {hasEmailProvider ? "Connected" : "Not detected on this account"}
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {hasEmailProvider ? "Connected" : "Unavailable"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Google</p>
                <p className="text-xs text-muted-foreground">
                  {hasGoogleProvider ? "Connected" : "Add Google as another sign-in method"}
                </p>
              </div>
              <Button
                type="button"
                variant={hasGoogleProvider ? "outline" : "default"}
                className="min-w-24 rounded-xl"
                disabled={hasGoogleProvider || isLinkingGoogle || identityLinkingDisabled}
                onClick={handleLinkGoogle}
              >
                {isLinkingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : hasGoogleProvider ? "Connected" : identityLinkingDisabled ? "Unavailable" : "Connect"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Apple</p>
                <p className="text-xs text-muted-foreground">
                  {hasAppleProvider ? "Connected" : "Add Apple as another sign-in method"}
                </p>
              </div>
              <Button
                type="button"
                variant={hasAppleProvider ? "outline" : "default"}
                className="min-w-24 rounded-xl"
                disabled={hasAppleProvider || isLinkingApple || identityLinkingDisabled}
                onClick={handleLinkApple}
              >
                {isLinkingApple ? <Loader2 className="h-4 w-4 animate-spin" /> : hasAppleProvider ? "Connected" : identityLinkingDisabled ? "Unavailable" : "Connect"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Account</h2>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {profile?.is_admin && (
              <SettingItem
                icon={<Shield className="h-5 w-5" />}
                label="Moderation Reports"
                description="Review and resolve user-generated content reports"
                onClick={() => navigate("/settings/moderation-reports")}
              />
            )}
            <SettingItem
              icon={<Lock className="h-5 w-5" />}
              label="Change Password"
              description="Update your password"
              onClick={() => setShowPasswordDialog(true)}
            />
            <SettingItem
              icon={<Trash2 className="h-5 w-5" />}
              label="Delete Account"
              description="Permanently delete your account and personal data"
              onClick={() => setShowDeleteAccountDialog(true)}
              destructive
            />
          </div>
        </Card>

        {/* Support Section */}
        <Card className="overflow-hidden border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Support</h2>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            <SettingItem
              icon={<HelpCircle className="h-5 w-5" />}
              label="Help Center"
              description="FAQs and support articles"
              onClick={() => navigate("/help-center")}
            />
            <SettingItem
              icon={<MessageSquare className="h-5 w-5" />}
              label="Send Feedback"
              onClick={() => navigate("/feedback")}
            />
            <SettingItem
              icon={<FileText className="h-5 w-5" />}
              label="Terms of Service"
              onClick={() => navigate("/terms-of-service")}
            />
            <SettingItem
              icon={<Shield className="h-5 w-5" />}
              label="Privacy Policy"
              onClick={() => navigate("/privacy-policy")}
            />
          </div>
        </Card>

        <Separator className="my-2" />

        {/* Logout */}
        <Card className="overflow-hidden border-border/50">
          <SettingItem
            icon={<LogOut className="h-5 w-5" />}
            label="Log Out"
            onClick={() => setShowLogoutDialog(true)}
            destructive
            trailing={null}
          />
        </Card>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pt-4 pb-6">
          Version {__APP_VERSION__}
        </p>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and your new password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Current Password</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isChangingPassword}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isChangingPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isChangingPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLinkConflictDialog} onOpenChange={setShowLinkConflictDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{linkConflictProvider} already linked</DialogTitle>
            <DialogDescription>
              This {linkConflictProvider} account is already linked to another user. Sign in with the account that already uses {linkConflictProvider}, or disconnect it there before linking here.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setShowLinkConflictDialog(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteAccountDialog}
        onOpenChange={(open) => {
          setShowDeleteAccountDialog(open);
          if (!open) {
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete account permanently?</DialogTitle>
            <DialogDescription>
              This action permanently deletes your account and cannot be undone. To confirm, type DELETE below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              disabled={isDeletingAccount}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteAccountDialog(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!showParentalPinPage && (
        <Dialog
          open={showSocialPinDialog}
          onOpenChange={(open) => {
            setShowSocialPinDialog(open);
            if (!open) {
              setSocialPinInput("");
              setPendingSocialFeaturesLevel(null);
            }
          }}
        >
        <DialogContent className="sm:max-w-[425px] max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {socialPinMode === "create" ? "Create parental control PIN" : "Enter parental control PIN"}
            </DialogTitle>
            <DialogDescription>
              {socialPinMode === "create"
                ? "Create a 4-digit parental PIN to keep child social settings safe. This PIN is required to change the child’s social access controls and can be reset by email if you forget it."
                : pendingSocialLevelLabel
                  ? `Enter your parental control PIN to change social access to ${pendingSocialLevelLabel}. This keeps child social settings protected until a parent approves the change.`
                  : "Enter your parental control PIN to continue. This keeps child social safety settings locked and prevents changes without parental approval."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border/70 bg-muted p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                The PIN protects child social access controls on this device. It is used only for parental control actions and will not be shown again after setup.
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={socialPinInput}
                onChange={(value) => setSocialPinInput(value.replace(/\D/g, "").slice(0, 4))}
                disabled={isSavingSocialLevel}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} mask />
                  <InputOTPSlot index={1} mask />
                  <InputOTPSlot index={2} mask />
                  <InputOTPSlot index={3} mask />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {isSavingSocialLevel
                ? "Verifying PIN..."
                : "This will continue automatically after 4 digits."}
            </p>

            <div className="flex justify-end">
              <div className="flex items-center gap-2">
                {socialPinMode === "verify" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleForgotSocialPin}
                    disabled={isSavingSocialLevel || isResettingSocialPin}
                    className="h-10 px-4 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-muted-foreground transition-none"
                  >
                    {isResettingSocialPin ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Forgot PIN?"
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSocialPinDialog(false)}
                  disabled={isSavingSocialLevel || isResettingSocialPin}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {!showParentalPinPage && (
        <Dialog
          open={showChangeSocialPinDialog}
          onOpenChange={(open) => {
            setShowChangeSocialPinDialog(open);
            if (!open) {
              setCurrentSocialPinInput("");
              setNewSocialPinInput("");
              setPendingSocialPinHash(null);
              setSocialPinChangeStep("current");
            }
          }}
        >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {socialPinChangeStep === "current" ? "Confirm parental PIN" : "Choose a new parental PIN"}
            </DialogTitle>
            <DialogDescription>
              {socialPinChangeStep === "current"
                ? "Confirm your current 4-digit parental PIN to continue. This ensures only a parent can update the PIN used for child social safety settings."
                : "Choose a new 4-digit parental PIN to replace the current one. This PIN will continue protecting changes to child social access settings."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border/70 bg-muted p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                If you forget your current PIN, use Reset PIN to receive a new one by email. This PIN is only needed for parental control changes.
              </p>
            </div>
            <div className="flex justify-center">
              {socialPinChangeStep === "current" ? (
                <InputOTP
                  maxLength={4}
                  value={currentSocialPinInput}
                  onChange={(value) => setCurrentSocialPinInput(value.replace(/\D/g, "").slice(0, 4))}
                  disabled={isChangingSocialPin}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} mask />
                    <InputOTPSlot index={1} mask />
                    <InputOTPSlot index={2} mask />
                    <InputOTPSlot index={3} mask />
                  </InputOTPGroup>
                </InputOTP>
              ) : (
                <InputOTP
                  maxLength={4}
                  value={newSocialPinInput}
                  onChange={(value) => setNewSocialPinInput(value.replace(/\D/g, "").slice(0, 4))}
                  disabled={isChangingSocialPin}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} mask />
                    <InputOTPSlot index={1} mask />
                    <InputOTPSlot index={2} mask />
                    <InputOTPSlot index={3} mask />
                  </InputOTPGroup>
                </InputOTP>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {isChangingSocialPin
                ? "Updating PIN..."
                : socialPinChangeStep === "current"
                  ? "This will continue automatically after 4 digits."
                  : "This will save automatically after 4 digits."}
            </p>

            <div className="flex justify-end">
              <div className="flex items-center gap-2">
                {socialPinChangeStep === "current" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleForgotSocialPin}
                    disabled={isChangingSocialPin || isResettingSocialPin}
                    className="h-10 px-4 text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-muted-foreground transition-none"
                  >
                    {isResettingSocialPin ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Forgot PIN?"
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowChangeSocialPinDialog(false)}
                  disabled={isChangingSocialPin || isResettingSocialPin}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
