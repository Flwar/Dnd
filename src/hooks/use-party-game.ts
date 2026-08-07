"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitPartyGameCommandAction } from "@/lib/actions/party-game";
import type {
  PartyGameActionResult,
  PartyGameCommandInput,
  PartyGameCommandPayloadMap,
  PartyGameCommandType,
} from "@/lib/actions/party-game";
import {
  fetchPartyGameSnapshot,
  PartyGameQueryError,
  subscribeToPartyGame,
} from "@/lib/party/game-realtime";
import type {
  PartyGameCombatState,
  PartyGameConnectionState,
  PartyGameEvent,
  PartyGameSceneState,
  PartyGameSession,
  PartyGameSnapshot,
  PartyGameVote,
  PartyGameVoteState,
} from "@/lib/party/game-realtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const REFRESH_DEBOUNCE_MS = 100;
const FALLBACK_REFRESH_MS = 15_000;
const PARTY_HEARTBEAT_MS = 20_000;

const CONNECTION_MESSAGES: Record<PartyGameConnectionState, string> = {
  connecting: "מתחברים למשחק המשותף…",
  connected: "מחוברים למשחק המשותף.",
  reconnecting: "החיבור נותק. מנסים להתחבר מחדש.",
  disconnected: "החיבור למשחק המשותף נותק.",
};

export type PartyGameLocalFailure = {
  ok: false;
  code: "NO_SESSION" | "STALE_VERSION" | "COMMAND_IN_FLIGHT";
  message: string;
};

export type PartyGameSubmitResult = PartyGameActionResult | PartyGameLocalFailure;

export type PartyGameSubmitOptions = {
  commandId?: string;
  expectedVersion?: number;
};

export type SubmitPartyGameCommand = <T extends PartyGameCommandType>(
  type: T,
  payload: PartyGameCommandPayloadMap[T],
  options?: PartyGameSubmitOptions,
) => Promise<PartyGameSubmitResult>;

export type UsePartyGameOptions = {
  sessionId: string;
  characterId: string;
  initialState?: PartyGameSnapshot | null;
  enabled?: boolean;
};

export type UsePartyGameResult = {
  state: PartyGameSnapshot | null;
  session: PartyGameSession | null;
  scene: PartyGameSceneState | null;
  combat: PartyGameCombatState | null;
  events: readonly PartyGameEvent[];
  votes: readonly PartyGameVote[];
  voteState: PartyGameVoteState;
  connectionState: PartyGameConnectionState;
  connectionMessage: string;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  refresh: () => Promise<PartyGameSnapshot | null>;
  submit: SubmitPartyGameCommand;
};

const EMPTY_VOTE_STATE: PartyGameVoteState = {
  currentSceneVotes: [],
  decisions: [],
};

function localFailure(
  code: PartyGameLocalFailure["code"],
  message: string,
): PartyGameLocalFailure {
  return { ok: false, code, message };
}

function queryErrorMessage(error: unknown): string {
  if (error instanceof PartyGameQueryError) return error.message;
  return "לא הצלחנו לרענן את מצב המשחק המשותף. בדקו את החיבור ונסו שוב.";
}

export function usePartyGame({
  sessionId,
  characterId,
  initialState = null,
  enabled = true,
}: UsePartyGameOptions): UsePartyGameResult {
  const [supabase] = useState(() => enabled ? createBrowserSupabaseClient() : null);
  const [state, setState] = useState<PartyGameSnapshot | null>(() =>
    initialState?.session.id === sessionId ? initialState : null,
  );
  const [connectionState, setConnectionState] =
    useState<PartyGameConnectionState>(enabled ? "connecting" : "disconnected");
  const [isLoading, setIsLoading] = useState(enabled && !initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const stateRef = useRef(state);
  const refreshSequenceRef = useRef(0);
  const submittingRef = useRef(false);
  const submittedVersionRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      refreshSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (
      state &&
      submittedVersionRef.current !== null &&
      state.session.version > submittedVersionRef.current
    ) {
      submittedVersionRef.current = null;
    }
  }, [state]);

  const refresh = useCallback(async (): Promise<PartyGameSnapshot | null> => {
    if (!enabled || !supabase || !sessionId) return null;
    const sequence = ++refreshSequenceRef.current;
    if (mountedRef.current) setIsLoading(stateRef.current === null);

    try {
      const nextState = await fetchPartyGameSnapshot(supabase, sessionId);
      if (!mountedRef.current || sequence !== refreshSequenceRef.current) return nextState;

      if (!nextState) {
        stateRef.current = null;
        setState(null);
        setError("המשחק המשותף לא נמצא, הסתיים או שאינכם עוד חברים בחבורה.");
        return null;
      }

      stateRef.current = nextState;
      setState(nextState);
      setError(null);
      return nextState;
    } catch (refreshError) {
      if (mountedRef.current && sequence === refreshSequenceRef.current) {
        setError(queryErrorMessage(refreshError));
      }
      return null;
    } finally {
      if (mountedRef.current && sequence === refreshSequenceRef.current) setIsLoading(false);
    }
  }, [enabled, sessionId, supabase]);

  useEffect(() => {
    if (!enabled || !supabase || !sessionId) {
      return;
    }
    let active = true;
    let refreshTimer: number | null = null;
    submittedVersionRef.current = null;

    const scheduleRefresh = () => {
      if (!active || refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const reportConnection = (nextState: PartyGameConnectionState) => {
      if (!active) return;
      setConnectionState(nextState);
    };

    const unsubscribe = subscribeToPartyGame(supabase, sessionId, {
      onChange: scheduleRefresh,
      onConnectionChange: reportConnection,
    });
    const handleOffline = () => reportConnection("disconnected");
    const handleOnline = () => {
      reportConnection("reconnecting");
      scheduleRefresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const fallbackTimer = window.setInterval(scheduleRefresh, FALLBACK_REFRESH_MS);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void refresh();

    return () => {
      active = false;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.clearInterval(fallbackTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [enabled, refresh, sessionId, supabase]);

  const activePartyId = state?.session.partyId ?? null;

  useEffect(() => {
    if (!enabled || !supabase || !activePartyId || !characterId) return;
    let active = true;

    const reportPresence = async (connectionState: "connected" | "disconnected") => {
      const result = await supabase.rpc("update_party_connection", {
        p_party_id: activePartyId,
        p_character_id: characterId,
        p_connection_state: connectionState,
      });
      if (
        active &&
        result.error &&
        (result.error.message.includes("AUTHENTICATION_REQUIRED") ||
          result.error.message.includes("JWT"))
      ) {
        setError("החיבור לחשבון פג. יש להתחבר מחדש כדי להמשיך במשחק המשותף.");
      }
    };

    const heartbeat = () => {
      if (navigator.onLine && document.visibilityState === "visible") {
        void reportPresence("connected");
      }
    };
    const handleOnline = () => heartbeat();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") heartbeat();
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, PARTY_HEARTBEAT_MS);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      void reportPresence("disconnected");
    };
  }, [activePartyId, characterId, enabled, supabase]);

  const submit = useCallback(
    async <T extends PartyGameCommandType>(
      type: T,
      payload: PartyGameCommandPayloadMap[T],
      options: PartyGameSubmitOptions = {},
    ): Promise<PartyGameSubmitResult> => {
      const currentState = stateRef.current;
      if (!enabled || !currentState || currentState.session.id !== sessionId) {
        const failure = localFailure(
          "NO_SESSION",
          "מצב המשחק המשותף עדיין לא נטען. המתינו לחיבור ונסו שוב.",
        );
        setError(failure.message);
        return failure;
      }

      const expectedVersion = options.expectedVersion ?? currentState.session.version;
      if (expectedVersion !== currentState.session.version) {
        const failure = localFailure(
          "STALE_VERSION",
          "מצב החבורה השתנה מאז הפעולה האחרונה. רעננו את המשחק ונסו שוב.",
        );
        setError(failure.message);
        void refresh().then(() => {
          if (mountedRef.current) setError(failure.message);
        });
        return failure;
      }

      if (
        submittingRef.current ||
        submittedVersionRef.current === expectedVersion
      ) {
        const failure = localFailure(
          "COMMAND_IN_FLIGHT",
          "הפעולה הקודמת עדיין נשלחת. המתינו רגע לפני ניסיון נוסף.",
        );
        setError(failure.message);
        return failure;
      }

      submittingRef.current = true;
      submittedVersionRef.current = expectedVersion;
      setIsSubmitting(true);
      setError(null);

      try {
        const input: PartyGameCommandInput<T> = {
          commandId: options.commandId ?? globalThis.crypto.randomUUID(),
          sessionId,
          characterId,
          expectedVersion,
          type,
          payload,
          timestamp: new Date().toISOString(),
        };
        const result = await submitPartyGameCommandAction(input);
        if (!result.ok) {
          submittedVersionRef.current = null;
        }
        await refresh();
        if (!result.ok && mountedRef.current) setError(result.message);
        return result;
      } catch {
        const failure = localFailure(
          "NO_SESSION",
          "לא הצלחנו לשלוח את הפעולה. בדקו את החיבור ונסו שוב.",
        );
        if (mountedRef.current) setError(failure.message);
        submittedVersionRef.current = null;
        return failure;
      } finally {
        submittingRef.current = false;
        if (mountedRef.current) setIsSubmitting(false);
      }
    },
    [characterId, enabled, refresh, sessionId],
  ) as SubmitPartyGameCommand;

  const currentState = state?.session.id === sessionId ? state : null;

  return {
    state: currentState,
    session: currentState?.session ?? null,
    scene: currentState?.scene ?? null,
    combat: currentState?.combat ?? null,
    events: currentState?.events ?? [],
    votes: currentState?.votes ?? [],
    voteState: currentState?.voteState ?? EMPTY_VOTE_STATE,
    connectionState,
    connectionMessage: CONNECTION_MESSAGES[connectionState],
    isLoading: enabled && (isLoading || currentState === null),
    isSubmitting,
    error,
    refresh,
    submit,
  };
}
