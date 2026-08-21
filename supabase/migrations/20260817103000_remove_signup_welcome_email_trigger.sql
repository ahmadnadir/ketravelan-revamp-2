/*
  Remove legacy signup-time welcome email trigger.

  Root cause: some environments still have a trigger that sends welcome email
  on profile creation, which duplicates onboarding-completion welcome sends.
*/

DROP TRIGGER IF EXISTS trigger_send_welcome_email ON public.profiles;
DROP FUNCTION IF EXISTS public.send_welcome_email_on_signup();
