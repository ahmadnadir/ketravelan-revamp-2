import { createContext, useContext, ReactNode } from "react";
import { useNetworkStatus, NetworkStatus } from "@/hooks/useNetworkStatus";

const NetworkStatusContext = createContext<NetworkStatus>({
  isOnline: true,
  wasOffline: false,
});

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const status = useNetworkStatus();
  return (
    <NetworkStatusContext.Provider value={status}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkStatusContext);
}
