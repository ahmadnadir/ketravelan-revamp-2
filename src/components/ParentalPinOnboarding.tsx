import React, { useCallback, useEffect, useState } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

import {
  ArrowRight,
  ChevronLeft,
  Delete,
  Loader2,
  Shield,
  X,
} from "lucide-react";

const hashSocialPin = (pin: string) => {
  let hash = 0;
  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return `social-pin:${Math.abs(hash)}`;
};

type Step = "create" | "confirm";

type PinMode = "create" | "verify";

interface Props {
  mode?: PinMode;
  heading?: string;
  description?: string;
  submitLabel?: string;
  closeLabel?: string;
  closeIcon?: boolean;
  mandatory?: boolean;
  keepBottomNavVisible?: boolean;
  showSafetyFooter?: boolean;
  onForgotPin?: () => void | Promise<void>;
  isResettingPin?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  onVerify?: (pin: string) => Promise<boolean | void>;
}

export default function ParentalPinOnboarding({
  mode = "create",
  heading,
  description,
  submitLabel,
  closeLabel,
  closeIcon = false,
  mandatory = false,
  keepBottomNavVisible = false,
  showSafetyFooter = true,
  onForgotPin,
  isResettingPin = false,
  onComplete,
  onCancel,
  onVerify,
}: Props) {
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState<Step>("create");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const isVerifyMode = mode === "verify";

  const resetInputs = () => {
    setStep("create");
    setPin("");
    setConfirmPin("");
  };

  useEffect(() => {
    resetInputs();
  }, [mode]);

  const handleVerify = useCallback(async (value: string) => {
    if (!onVerify) {
      onComplete?.();
      return true;
    }

    try {
      setIsSaving(true);
      const result = await onVerify(value);
      if (result === false) {
        setStep("create");
        setPin("");
        setConfirmPin("");
        return false;
      }
      onComplete?.();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to verify PIN.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onVerify, onComplete]);

  const savePin = useCallback(async (value: string) => {
    if (!/^\d{4}$/.test(value)) {
      toast.error("PIN must contain exactly 4 digits.");
      return;
    }

    try {
      setIsSaving(true);

      const hashed = hashSocialPin(value);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("profiles")
        .update({
          social_features_pin_hash: hashed,
        })
        .eq("id", user?.id);

      if (error) throw error;

      try {
        await refreshProfile?.();
      } catch (refreshError) {
        console.info("Failed to refresh profile after PIN save", refreshError);
      }

      toast.success("Parental PIN created.");

      onComplete?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to save PIN."
      );
    } finally {
      setIsSaving(false);
    }
  }, [refreshProfile, onComplete]);

  useEffect(() => {
    if (isVerifyMode) return undefined;
    if (step === "create" && pin.length === 4) {
      const timeout = window.setTimeout(() => {
        setStep("confirm");
      }, 180);

      return () => {
        window.clearTimeout(timeout);
      };
    }
    return undefined;
  }, [pin, step, isVerifyMode]);

  useEffect(() => {
    if (isVerifyMode) {
      if (pin.length !== 4) return undefined;
      void handleVerify(pin);
      return undefined;
    }

    if (step !== "confirm") return undefined;

    if (confirmPin.length !== 4) return undefined;

    if (confirmPin !== pin) {
      toast.error("PINs do not match.");

      const timeout = window.setTimeout(() => {
        setConfirmPin("");
      }, 300);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    void savePin(confirmPin);
    return undefined;
  }, [confirmPin, pin, savePin, step, isVerifyMode, handleVerify]);

  const handleDigit = useCallback((digit: string) => {
    if (isSaving) return;

    if (step === "create") {
      if (pin.length >= 4) return;

      setPin((prev) => prev + digit);
      return;
    }

    if (confirmPin.length >= 4) return;

    setConfirmPin((prev) => prev + digit);
  }, [confirmPin.length, isSaving, pin.length, step]);

  const handleBackspace = useCallback(() => {
    if (isSaving) return;

    if (step === "create") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    setConfirmPin((prev) => prev.slice(0, -1));
  }, [isSaving, step]);

  const handleBack = () => {
    if (isSaving) return;

    if (step === "confirm") {
      setStep("create");
      setPin("");
      setConfirmPin("");
      return;
    }

    onComplete?.();
  };

  const handleCancel = useCallback(() => {
    if (isSaving) return;
    onCancel?.();
  }, [isSaving, onCancel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSaving || event.defaultPrevented) return;

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        handleDigit(event.key);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleBackspace();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (isVerifyMode) {
          if (pin.length === 4) void handleVerify(pin);
          return;
        }

        if (step === "create") {
          if (pin.length === 4) setStep("confirm");
          return;
        }

        if (confirmPin.length === 4) {
          if (confirmPin !== pin) {
            toast.error("PINs do not match.");
            setConfirmPin("");
            return;
          }
          void savePin(confirmPin);
        }
      }

      if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmPin, handleBackspace, handleCancel, handleDigit, handleVerify, isSaving, isVerifyMode, pin, savePin, step]);

  const currentValue = isVerifyMode ? pin : step === "create" ? pin : confirmPin;

  const title = heading
    ? heading
    : isVerifyMode
      ? "Enter PIN"
      : step === "create"
        ? "Create PIN"
        : "Confirm PIN";

  const subtitle = description
    ? description
    : isVerifyMode
      ? "Enter your parental control PIN to continue."
      : step === "create"
        ? "Create a 4-digit PIN to protect parental control settings."
        : "Enter the same PIN again to continue.";

  const triggerKeypadFeedback = useCallback(() => {
    void Haptics.impact({ style: ImpactStyle.Medium })
      .catch(() => Haptics.selectionChanged())
      .catch(() => {
        if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
          return;
        }

        navigator.vibrate(10);
      });
  }, []);

  const PinBoxes = () => (
    <div className="mt-6 flex justify-center gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`
            h-16
            w-16
            rounded-2xl
            border-2
            transition-all
            duration-200
            flex
            items-center
            justify-center
            ${
              currentValue[index]
                ? "border-black bg-black text-white"
                : "border-neutral-300 bg-white"
            }
          `}
        >
          <span className="text-2xl font-bold">
            {currentValue[index] ? "•" : ""}
          </span>
        </div>
      ))}
    </div>
  );

  const KeypadButton = ({
    value,
  }: {
    value: string;
  }) => (
    <button
      type="button"
      onPointerDown={triggerKeypadFeedback}
      onClick={() => {
        handleDigit(value);
      }}
      disabled={isSaving}
      className="
        h-12
        w-12
        rounded-full
        text-2xl
        font-medium
        transition-all
        active:scale-95
        disabled:opacity-40
      "
    >
      {value}
    </button>
  );

  return (
    <div
      className="fixed inset-x-0 top-0 z-[120] bg-white text-black flex flex-col min-h-0 overflow-hidden sm:bottom-0"
      style={{
        bottom: keepBottomNavVisible
          ? "calc(var(--tabbar-height) + env(safe-area-inset-bottom, 0px))"
          : "0px",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-safe pt-5 pb-4 border-b border-neutral-200">
        {step === "confirm" ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={isSaving}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-neutral-100 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}

        <h1 className="text-lg font-semibold">{title}</h1>

        {!onCancel && mandatory ? (
          <div className="h-10 w-10" />
        ) : (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Close"
            className={closeIcon
              ? "h-10 w-10 rounded-full flex items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition"
              : "min-w-10 h-10 rounded-full px-3 flex items-center justify-center text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition"
            }
          >
            {closeIcon ? <X className="h-5 w-5" /> : (closeLabel || "Close")}
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-between px-6 overflow-hidden pb-72">

        <div>

          {/* Shield */}
          <div className="mt-10 flex justify-center">
            <div className="h-20 w-20 rounded-full bg-black text-white flex items-center justify-center shadow-lg">
              <Shield className="h-9 w-9" />
            </div>
          </div>

          {/* Title */}
          <div className="mt-8 text-center">

            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-neutral-500">Parental Control</p>

            <p className="mt-3 text-sm text-neutral-500 max-w-sm mx-auto">For your child's safety, please create a 4-digit parental PIN to protect settings.</p>

            

          </div>

          {/* PIN */}
          <PinBoxes />

            {/* Confirm */}
          <Button
            type="button"
            onClick={() => {
              if (isVerifyMode) {
                if (pin.length !== 4) {
                  toast.error("Please enter 4 digits.");
                  return;
                }

                void handleVerify(pin);
                return;
              }

              if (step === "create") {
                if (pin.length !== 4) {
                  toast.error("Please enter 4 digits.");
                  return;
                }

                setStep("confirm");
                return;
              }

              if (confirmPin.length !== 4) {
                toast.error("Please confirm your PIN.");
                return;
              }

              if (confirmPin !== pin) {
                toast.error("PINs do not match.");
                return;
              }

              void savePin(confirmPin);
            }}
            disabled={isSaving}
            className="
              mt-6
              h-14
              rounded-2xl
              bg-black
              hover:bg-black/90
              text-white
              w-full
              text-base
              font-semibold
              flex
              justify-between
              px-6
            "
          >
            <span>{isVerifyMode ? (submitLabel || "Continue") : step === "create" ? "Continue" : "Confirm"}</span>

            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </Button>

          {isVerifyMode && onForgotPin && (
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void onForgotPin();
                }}
                disabled={isSaving || isResettingPin}
                className="h-10 px-4 text-sm font-medium text-neutral-500 hover:bg-transparent hover:text-neutral-500 transition-none"
              >
                {isResettingPin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Forgot PIN?"
                )}
              </Button>
            </div>
          )}

        </div>

        {/* Keypad */}
        <div className="mt-4 pb-8 flex-shrink-0">

          <div className="grid grid-cols-3 gap-y-4 gap-x-4 justify-items-center">

            <KeypadButton value="1" />
            <KeypadButton value="2" />
            <KeypadButton value="3" />

            <KeypadButton value="4" />
            <KeypadButton value="5" />
            <KeypadButton value="6" />

            <KeypadButton value="7" />
            <KeypadButton value="8" />
            <KeypadButton value="9" />

            <div />

            <KeypadButton value="0" />

            <button
              type="button"
              onPointerDown={triggerKeypadFeedback}
              onClick={() => {
                handleBackspace();
              }}
              disabled={isSaving}
              className="
                h-12
                w-12
                rounded-full
                flex
                items-center
                justify-center
                transition
                active:scale-95
              "
            >
              <Delete className="h-5 w-5" />
            </button>

          </div>

          
        </div>

      </main>

      {showSafetyFooter && (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-6 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:static sm:bottom-auto sm:left-auto sm:right-auto sm:px-6 sm:py-6 sm:pb-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-neutral-500 mt-0.5" />

              <div>
                <p className="text-sm font-medium">Your child's safety comes first</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  This PIN is required whenever someone wants to change parental control settings or manage your child's social features in Ketravelan.
                </p>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
