-- Let people receive an invite before registering, then attach it to their account at signup.
CREATE OR REPLACE FUNCTION public.claim_trip_invites_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trip_invites
  SET invitee_user_id = NEW.id
  WHERE invitee_user_id IS NULL
    AND status = 'pending'
    AND lower(invitee_email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_claim_trip_invites ON auth.users;

CREATE TRIGGER on_auth_user_created_claim_trip_invites
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_trip_invites_for_new_user();

CREATE INDEX IF NOT EXISTS idx_trip_invites_pending_email
  ON public.trip_invites (lower(invitee_email))
  WHERE status = 'pending';