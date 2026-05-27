

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,       // ← مش بيعمل refetch كل ما المكون يظهر
      refetchOnReconnect: false,   // ← مش بيعمل refetch لما النت يرجع
      staleTime: 1000 * 60 * 5,   // ← الداتا "fresh" لمدة 5 دقايق
    },
  },
});
