import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type PostgrestLikeError = {
  code?: string;
  message?: string;
};

function getLocalAcceptanceKey(userId: string) {
  return `ketravelan-ugc-terms-accepted:${userId}`;
}

function isMissingUgcColumnError(err: unknown): boolean {
  const e = err as PostgrestLikeError | null;
  const message = String(e?.message || '').toLowerCase();
  return e?.code === 'PGRST204' && message.includes('ugc_terms_accepted_at');
}

/**
 * TermsAcceptanceModal
 *
 * Shows on first access to user-generated content (stories, discussions, comments).
 * Requires explicit acceptance of community guidelines before proceeding.
 * Stores acceptance date in user profile.
 */
export function TermsAcceptanceModal() {
  const { user, profile, refreshProfile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Show modal on first load if user hasn't accepted terms for community features
  useEffect(() => {
    const hasLocalAcceptance = Boolean(
      user?.id && localStorage.getItem(getLocalAcceptanceKey(user.id))
    );
    const shouldShow = user && profile && !profile.ugc_terms_accepted_at && !hasLocalAcceptance;
    setShowModal(!!shouldShow);
  }, [user, profile]);

  const handleAccept = async () => {
    if (!hasAccepted || !user) return;

    setIsAccepting(true);
    const acceptedAt = new Date().toISOString();
    const localKey = getLocalAcceptanceKey(user.id);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ugc_terms_accepted_at: acceptedAt })
        .eq('id', user.id);

      if (error) {
        if (isMissingUgcColumnError(error)) {
          localStorage.setItem(localKey, acceptedAt);
          toast.success('Terms Accepted', {
            description: 'Accepted on this device. Backend sync will resume once schema refresh completes.',
          });
          setShowModal(false);
          return;
        }
        throw error;
      }

      localStorage.setItem(localKey, acceptedAt);

      // Refresh profile to reflect new acceptance date
      await refreshProfile?.();
      
      toast.success('Terms Accepted', {
        description: 'You can now access community content',
      });
      setShowModal(false);
    } catch (error) {
      console.error('Failed to accept terms:', error);
      toast.error('Error', {
        description: 'Failed to accept terms. Please try again.',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <AlertDialog open={showModal} onOpenChange={setShowModal}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Community Guidelines & Terms</AlertDialogTitle>
          <AlertDialogDescription>
            Before accessing user-generated content, please review and accept our community guidelines
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="h-96 w-full border rounded-md p-4 bg-muted/50">
          <div className="space-y-6 pr-4">
            {/* Community Standards Section */}
            <section>
              <h3 className="font-semibold text-base mb-3">Community Standards</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Our community is built on respect, safety, and authenticity. By participating, you agree to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
                <li>Be respectful and kind to all community members</li>
                <li>Not post hateful, abusive, discriminatory, or harassing content</li>
                <li>Not share personal information of others without explicit consent</li>
                <li>Not engage in spam or excessive commercial promotion</li>
                <li>Report inappropriate content to our moderation team</li>
                <li>Accept that your content may be removed if it violates these guidelines</li>
              </ul>
            </section>

            {/* Safety & Moderation Section */}
            <section>
              <h3 className="font-semibold text-base mb-3">Safety & Moderation</h3>
              <p className="text-sm text-muted-foreground mb-3">
                We maintain community standards through:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
                <li>Reviewing reported content within 24 hours</li>
                <li>Removing violations of our guidelines promptly</li>
                <li>Temporarily or permanently suspending users who violate these rules</li>
                <li>Providing transparency in our moderation decisions</li>
                <li>Allowing users to appeal moderation actions</li>
              </ul>
            </section>

            {/* User Rights Section */}
            <section>
              <h3 className="font-semibold text-base mb-3">Your Rights</h3>
              <p className="text-sm text-muted-foreground mb-3">
                As a community member, you have the right to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
                <li>Report inappropriate content or users</li>
                <li>Block users who harass or violate your privacy</li>
                <li>Delete your own content anytime</li>
                <li>Appeal moderation decisions</li>
                <li>Request your data in accordance with privacy laws</li>
              </ul>
            </section>

            {/* Account Suspension Section */}
            <section>
              <h3 className="font-semibold text-base mb-3">Account Suspension</h3>
              <p className="text-sm text-muted-foreground">
                We reserve the right to suspend or permanently delete accounts that:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2 mt-2">
                <li>Repeatedly violate community guidelines</li>
                <li>Engage in harassment or threats</li>
                <li>Share illegal content</li>
                <li>Attempt to manipulate the platform or other users</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        {/* Acceptance Checkbox */}
        <div className="flex items-start space-x-2 py-4">
          <Checkbox 
            id="accept-ugc-terms"
            checked={hasAccepted}
            onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
            className="mt-1"
          />
          <label 
            htmlFor="accept-ugc-terms" 
            className="text-sm cursor-pointer leading-relaxed"
          >
            I have read and agree to the Community Guidelines and Terms of Use
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline"
            onClick={() => setShowModal(false)}
            disabled={isAccepting}
          >
            Decline
          </Button>
          <Button 
            onClick={handleAccept}
            disabled={!hasAccepted || isAccepting}
          >
            {isAccepting ? 'Accepting...' : 'Accept & Continue'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
