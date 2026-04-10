import GuidedApp from "@/guided-revamp/App";
import { AuthProvider as GuidedAuthProvider } from "@/guided-revamp/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

export default function GuidedRevamp() {
  return (
    <AppLayout fullWidth>
      <GuidedAuthProvider>
        <GuidedApp />
      </GuidedAuthProvider>
    </AppLayout>
  );
}
