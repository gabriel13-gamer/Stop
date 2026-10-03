import { getRoomState } from "@/lib/stop/api";
import { useQuery } from "@tanstack/react-query";

export function useRoom(code: string | undefined) {
  return useQuery({
    queryKey: ["room", code],
    enabled: Boolean(code),
    queryFn: () => getRoomState({ data: { code: code! } }),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status === "playing") return 400;
      if (status === "verifying") return 700;
      if (status === "finished") return 4000;
      return 900;
    },
  });
}
