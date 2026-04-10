/*
  # Hotfix: ensure guided_trips.agent_id exists

  Fixes runtime errors:
  column guided_trips.agent_id does not exist
*/

ALTER TABLE IF EXISTS public.guided_trips
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.guided_trips
SET
  agent_id = COALESCE(agent_id, creator_id),
  creator_id = COALESCE(creator_id, agent_id)
WHERE
  agent_id IS NULL
  OR creator_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_guided_trips_agent_id ON public.guided_trips(agent_id);

CREATE OR REPLACE FUNCTION public.sync_guided_trips_owner_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.agent_id := COALESCE(NEW.agent_id, NEW.creator_id, auth.uid());
  NEW.creator_id := COALESCE(NEW.creator_id, NEW.agent_id, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_guided_trips_owner_ids ON public.guided_trips;
CREATE TRIGGER trg_sync_guided_trips_owner_ids
  BEFORE INSERT OR UPDATE ON public.guided_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_guided_trips_owner_ids();

NOTIFY pgrst, 'reload schema';
