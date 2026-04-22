-- Push tokens table + chat push trigger
CREATE EXTENSION IF NOT EXISTS http;

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE app.settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON TABLE app.settings FROM PUBLIC;
REVOKE ALL ON TABLE app.settings FROM anon, authenticated;

INSERT INTO app.settings (key, value)
VALUES
  ('supabase_url', ''),
  ('service_role_key', '')
ON CONFLICT (key) DO NOTHING;


CREATE TABLE IF NOT EXISTS user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL,
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push tokens" ON user_push_tokens;
CREATE POLICY "Users can view own push tokens"
  ON user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push tokens" ON user_push_tokens;
CREATE POLICY "Users can insert own push tokens"
  ON user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push tokens" ON user_push_tokens;
CREATE POLICY "Users can update own push tokens"
  ON user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push tokens" ON user_push_tokens;
CREATE POLICY "Users can delete own push tokens"
  ON user_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION upsert_push_token(
  p_token text,
  p_platform text,
  p_device_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_push_tokens (user_id, token, platform, device_id)
  VALUES (auth.uid(), p_token, p_platform, p_device_id)
  ON CONFLICT (token)
  DO UPDATE SET
    user_id = auth.uid(),
    platform = EXCLUDED.platform,
    device_id = EXCLUDED.device_id,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION delete_push_token(
  p_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_push_tokens
  WHERE token = p_token
    AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_push_token(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_push_token(text) TO authenticated;

CREATE OR REPLACE FUNCTION send_chat_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  BEGIN
    SELECT value INTO v_supabase_url FROM app.settings WHERE key = 'supabase_url';
    SELECT value INTO v_service_role_key FROM app.settings WHERE key = 'service_role_key';

    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      RAISE WARNING 'Missing app.settings.supabase_url';
      RETURN NEW;
    END IF;

    IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
      RAISE WARNING 'Missing app.settings.service_role_key';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := (v_supabase_url || '/functions/v1/send-chat-push')::text,
      body := jsonb_build_object('messageId', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send chat push for message %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_push_trigger ON messages;

CREATE TRIGGER messages_push_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION send_chat_push();