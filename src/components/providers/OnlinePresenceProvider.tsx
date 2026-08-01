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
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { PlayerPresenceEventRow } from "@/types/database";

const HEARTBEAT_INTERVAL_MS = 20_000;

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

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.rpc("get_online_players");
      if (error) return;
      if (activeUserId.current !== currentUserId) return;
      setPlayers((data ?? []).map(mapOnlinePlayer));
    } catch {
      // The next heartbeat or realtime event retries the sanitized roster read.
    }
  }, [currentUserId]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;
    const synchronizeUser = (userId: string | null) => {
      if (!active) return;
      activeUserId.current = userId;
      setCurrentUserId(userId);
      if (!userId) {
        setPlayers([]);
        setStatus("disconnected");
      }
    };

    void supabase.auth.getUser()
      .then(({ data }) => synchronizeUser(data.user?.id ?? null))
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

    const heartbeat = async () => {
      if (!active || heartbeatInFlight) return;
      heartbeatInFlight = true;
      if (!hasConnected) setStatus("connecting");
      try {
        const { error } = await supabase.rpc("heartbeat_player_presence", {
          p_connection_id: connectionId,
        });
        if (!active) return;
        if (error) {
          setStatus("disconnected");
          return;
        }
        hasConnected = true;
        setStatus("connected");
        await refresh();
      } catch {
        if (!active) return;
        setStatus("disconnected");
      } finally {
        heartbeatInFlight = false;
      }
    };

    const channel = supabase
      .channel(`global-presence:${connectionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "player_presence_events" },
        (payload) => {
          const event = payload.new as PlayerPresenceEventRow;
          if (event.user_id !== currentUserId) addToast(event);
          void refresh();
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

    void heartbeat();
    const heartbeatTimer = window.setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void heartbeat();
    };
    const handleOnline = () => void heartbeat();
    const handleOffline = () => setStatus("disconnected");
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

    return () => {
      active = false;
      window.clearInterval(heartbeatTimer);
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
