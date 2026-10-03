import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { bootstrapProfile, getMe } from "@/lib/stop/api";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const pendingCode =
    typeof window !== "undefined" ? sessionStorage.getItem("stop.join") : null;

  useQuery({
    queryKey: ["me", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      await bootstrapProfile({
        data: {
          displayName: user?.displayName ?? undefined,
          email: user?.primaryEmail ?? undefined,
        },
      });
      return getMe();
    },
  });

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-fg">
        <div className="h-10 w-10 animate-pulse rounded-2xl bg-elevated" />
      </div>
    );
  }
  if (!user) {
    return <RedirectToSignIn to={pendingCode ? `/login?next=/join/${pendingCode}` : "/login"} />;
  }
  return <>{children}</>;
}
