"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserMinus, UserPlus, X } from "lucide-react";
import {
  canSendPresenceHeartbeat,
  getPresenceHeartbeatDelay,
  PRESENCE_ROSTER_REFRESH_INTERVAL_MS,
} from "@/lib/presence/heartbeat-schedule";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { PlayerPresenceEventRow } from "@/types/database";

export type OnlinePlayer = {
  userId: string;
  displayName: string;
  avatarKey: string;
  accountTitle: string | null;
  isKing: boolean;
  connectionCount: number;
  lastSeenAt: string;
};

export type PresenceConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

type PresenceToast = {
  id: string;
  kind: "joined" | "left";
  displayName: string;
};

type OnlinePresenceContextValue = {
  currentUserId: string | null;
  players: OnlinePlayer[];
  status: PresenceConnectionStatus;
  refresh: () => Promise<void>;
};

const OnlinePresenceContext = createContext<OnlinePresenceContextValue>({
  currentUserId: null,
  players: [],
  status: "disconnected",
  refresh: async () => undefined,
});

function mapOnlinePlayer(row: {
  user_id: string;
  display_name: string;
  avatar_key: string;
  account_title: string | null;
  is_king: boolean;
  connection_count: number;
  last_seen_at: string;
}): OnlinePlayer {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    avatarKey: row.avatar_key,
    accountTitle: row.account_title,
    isKing: row.is_king,
    connectionCount: row.connection_count,
    lastSeenAt: row.last_seen_at,
  };
}

export function OnlinePresenceProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [status, setStatus] = useState<PresenceConnectionStatus>("disconnected");
  const [toasts, setToasts] = useState<PresenceToast[]>([]);
  const seenEventIds = useRef(new Set<number>());
  const toastTimers = useRef(new Set<number>());
  const connectionIds = useRef(new Map<string, string>());
  const activeUserId = useRef<string | null>(null);
  const refreshInFlight = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((event: PlayerPresenceEventRow) => {
    if (seenEventIds.current.has(event.id)) return;
    seenEventIds.current.add(event.id);
    if (seenEventIds.current.size > 500) {
      const oldestEventId = seenEventIds.current.values().next().value;
      if (typeof oldestEventId === "number") seenEventIds.current.delete(oldestEventId);
    }

    const id = `presence-${event.id}`;
    setToasts((current) => [
      ...current.filter((toast) => toast.id !== id),
      { id, kind: event.event_type, displayName: event.display_name },
    ].slice(-3));

    const timer = window.setTimeout(() => {
      dismissToast(id);
      toastTimers.current.delete(timer);
    }, 4_500);
    toastTimers.current.add(timer);
  }, [dismissToast]);

  const refresh = useCallback(async () => {
    if (!currentUserId) {
      setPlayers([]);
      return;
    }
    if (!canSendPresenceHeartbeat(document.visibilityState, navigator.onLine)) return;
    if (refreshInFlight.current?.userId === currentUserId) {
      return refreshInFlight.current.promise;
    }

    const operation = (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase.rpc("get_online_players");
        if (error) return;
        if (activeUserId.current !== currentUserId) return;
        setPlayers((data ?? []).map(mapOnlinePlayer));
      } catch {
        // The next heartbeat or realtime event retries the sanitized roster read.
      }
    })();
    const inFlight = { userId: currentUserId, promise: operation };
    refreshInFlight.current = inFlight;
    try {
      await operation;
    } finally {
      if (refreshInFlight.current === inFlight) refreshInFlight.current = null;
    }
  }, [currentUserId]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;
    const synchronizeUser = (userId: string | null) => {
      if (!active) return;
      if (activeUserId.current !== userId) {
        // Do not let an in-flight roster read from the previous account block
        // or populate the first refresh for a newly authenticated account.
        refreshInFlight.current = null;
        setPlayers([]);
      }
      activeUserId.current = userId;
      setCurrentUserId(userId);
      if (!userId) {
        setStatus("disconnected");
      }
    };

    // Presence is display-only client state; the heartbeat RPC still enforces
    // auth.uid() authoritatively. Reading the cached session avoids a duplicate
    // Auth /user database request on every full page load.
    void supabase.auth.getSession()
      .then(({ data }) => synchronizeUser(data.session?.user.id ?? null))
      .catch(() => synchronizeUser(null));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      synchronizeUser(session?.user.id ?? null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createBrowserSupabaseClient();
    let connectionId = connectionIds.current.get(currentUserId);
    if (!connectionId) {
      connectionId = window.crypto.randomUUID();
      connectionIds.current.set(currentUserId, connectionId);
    }
    let active = true;
    let hasConnected = false;
    let heartbeatInFlight = false;
    let consecutiveFailures = 0;
    let heartbeatTimer: number | undefined;
    let rosterRefreshTimer: number | undefined;
    let lastRosterRefreshAt = 0;

    const canUseNetwork = () => canSendPresenceHeartbeat(
      document.visibilityState,
      navigator.onLine,
    );

    const clearHeartbeatTimer = () => {
      if (heartbeatTimer === undefined) return;
      window.clearTimeout(heartbeatTimer);
      heartbeatTimer = undefined;
    };

    const scheduleHeartbeat = (delayMs: number) => {
      clearHeartbeatTimer();
      if (!active || !canUseNetwork()) return;
      heartbeatTimer = window.setTimeout(() => {
        heartbeatTimer = undefined;
        void heartbeat();
      }, delayMs);
    };

    const scheduleRosterRefresh = () => {
      if (!active || !canUseNetwork() || rosterRefreshTimer !== undefined) return;
      rosterRefreshTimer = window.setTimeout(() => {
        rosterRefreshTimer = undefined;
        void refresh();
      }, 150);
    };

    const heartbeat = async () => {
      clearHeartbeatTimer();
      if (!active || heartbeatInFlight || !canUseNetwork()) return;
      heartbeatInFlight = true;
      if (!hasConnected) setStatus("connecting");
      let heartbeatSucceeded = false;
      try {
        const { error } = await supabase.rpc("heartbeat_player_presence", {
          p_connection_id: connectionId,
        });
        if (!active) return;
        if (error) {
          consecutiveFailures += 1;
          setStatus(hasConnected ? "reconnecting" : "disconnected");
          return;
        }
        heartbeatSucceeded = true;
        consecutiveFailures = 0;
        const firstSuccessfulHeartbeat = !hasConnected;
        hasConnected = true;
        setStatus("connected");
        const now = Date.now();
        if (
          canUseNetwork() &&
          (firstSuccessfulHeartbeat || now - lastRosterRefreshAt >= PRESENCE_ROSTER_REFRESH_INTERVAL_MS)
        ) {
          await refresh();
          lastRosterRefreshAt = Date.now();
        }
      } catch {
        if (!active) return;
        consecutiveFailures += 1;
        setStatus(hasConnected ? "reconnecting" : "disconnected");
      } finally {
        heartbeatInFlight = false;
        if (active && canUseNetwork()) {
          scheduleHeartbeat(getPresenceHeartbeatDelay(
            heartbeatSucceeded ? 0 : consecutiveFailures,
          ));
        }
      }
    };

    const resumeHeartbeat = () => {
      if (!active || !canUseNetwork()) return;
      consecutiveFailures = 0;
      clearHeartbeatTimer();
      if (!heartbeatInFlight) void heartbeat();
    };

    const channel = supabase
      .channel(`global-presence:${connectionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "player_presence_events" },
        (payload) => {
          const event = payload.new as PlayerPresenceEventRow;
          if (event.user_id !== currentUserId) addToast(event);
          scheduleRosterRefresh();
        },
      )
      .subscribe((channelStatus) => {
        if (!active) return;
        if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          setStatus("reconnecting");
        }
        if (channelStatus === "SUBSCRIBED" && hasConnected) setStatus("connected");
        if (channelStatus === "CLOSED") setStatus("disconnected");
      });

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        resumeHeartbeat();
      } else {
        clearHeartbeatTimer();
      }
    };
    const handleOnline = () => resumeHeartbeat();
    const handleOffline = () => {
      clearHeartbeatTimer();
      setStatus("disconnected");
    };
    const handlePageHide = () => {
      const body = JSON.stringify({ connectionId });
      if (
        navigator.sendBeacon &&
        navigator.sendBeacon(
          "/api/presence/disconnect",
          new Blob([body], { type: "application/json" }),
        )
      ) {
        return;
      }
      void fetch("/api/presence/disconnect", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pagehide", handlePageHide);
    resumeHeartbeat();

    return () => {
      active = false;
      clearHeartbeatTimer();
      if (rosterRefreshTimer !== undefined) window.clearTimeout(rosterRefreshTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pagehide", handlePageHide);
      void supabase.removeChannel(channel);
    };
  }, [addToast, currentUserId, refresh]);

  useEffect(() => () => {
    for (const timer of toastTimers.current) window.clearTimeout(timer);
    toastTimers.current.clear();
  }, []);

  const value = useMemo<OnlinePresenceContextValue>(() => ({
    currentUserId,
    players,
    status,
    refresh,
  }), [currentUserId, players, refresh, status]);

  return (
    <OnlinePresenceContext.Provider value={value}>
      {children}
      <PresenceToasts toasts={toasts} onDismiss={dismissToast} />
    </OnlinePresenceContext.Provider>
  );
}

export function useOnlinePresence() {
  return useContext(OnlinePresenceContext);
}

function PresenceToasts({
  toasts,
  onDismiss,
}: {
  toasts: PresenceToast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed start-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[140] flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = toast.kind === "joined" ? UserPlus : UserMinus;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="pointer-events-auto border border-[#62c6df]/35 bg-[#0c1217]/96 p-3 shadow-2xl backdrop-blur"
              role="status"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-[#62c6df]" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm text-[#e7dfd2]">
                  <bdi className="font-bold">{toast.displayName}</bdi>{" "}
                  {toast.kind === "joined" ? "התחבר/ה לשרת" : "יצא/ה מהשרת"}
                </p>
                <button
                  type="button"
                  className="-m-1 grid size-8 shrink-0 place-items-center text-[#9e968a] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf82]"
                  onClick={() => onDismiss(toast.id)}
                  aria-label="סגירת ההודעה"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
