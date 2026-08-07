"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Shield, UsersRound } from "lucide-react";
import { Atmosphere } from "@/components/shell/Atmosphere";
import { getAssetPath } from "@/lib/assets/manifest";
import { PartyCharacterPicker } from "@/components/party/PartyCharacterPicker";
import { PartyEntryPanel } from "@/components/party/PartyEntryPanel";
import { PartyRoomPanel } from "@/components/party/PartyRoomPanel";
import {
  closePartyAction,
  createPartyAction,
  joinPartyAction,
  leavePartyAction,
  removePartyMemberAction,
  setPartyReadyAction,
  startPartySessionAction,
  transferPartyLeadershipAction,
  updatePartyConnectionAction,
} from "@/lib/actions/party";
import { PartyQueryError } from "@/lib/party/errors";
import {
  fetchPartyLobbySnapshot,
  findActivePartyMembership,
} from "@/lib/party/queries";
import { subscribeToPartyLobby } from "@/lib/party/realtime";
import type {
  PartyActionResult,
  PartyCharacterOption,
  PartyConnectionState,
  PartyLobbySnapshot,
} from "@/lib/party/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type BusyAction =
  | "select"
  | "create"
  | "join"
  | "ready"
  | "start"
  | "leave"
  | "remove"
  | "transfer"
  | "close";

type Notice = { kind: "success" | "info"; message: string } | null;

type Props = {
  characters: PartyCharacterOption[];
  initialSelectedCharacterId: string;
  initialSnapshot: PartyLobbySnapshot | null;
  initialError?: string | null;
};

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const element = document.createElement("textarea");
  element.value = value;
  element.style.position = "fixed";
  element.style.opacity = "0";
  document.body.append(element);
  element.select();
  const copied = document.execCommand("copy");
  element.remove();
  if (!copied) throw new Error("COPY_FAILED");
}

export function PartyLobbyClient({
  characters,
  initialSelectedCharacterId,
  initialSnapshot,
  initialError = null,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [selectedCharacterId, setSelectedCharacterId] = useState(initialSelectedCharacterId);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connectionState, setConnectionState] = useState<PartyConnectionState>(initialSnapshot ? "connecting" : "idle");
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<Notice>(null);
  const refreshSequence = useRef(0);

  const selectedCharacter =
    characters.find((character) => character.id === selectedCharacterId) ?? characters[0] ?? null;
  const activePartyId = snapshot?.party.id ?? null;

  const refreshLobby = useCallback(async (partyId: string) => {
    const sequence = ++refreshSequence.current;
    try {
      const nextSnapshot = await fetchPartyLobbySnapshot(supabase, partyId);
      if (sequence !== refreshSequence.current) return;
      if (!nextSnapshot) {
        setSnapshot(null);
        setConnectionState("idle");
        setNotice({ kind: "info", message: "החבורה נסגרה או שהחברות בחדר הסתיימה." });
        return;
      }
      setSnapshot(nextSnapshot);
      setErrorMessage(null);
    } catch (error) {
      if (sequence !== refreshSequence.current) return;
      const message = error instanceof PartyQueryError
        ? error.actionResult.message
        : "לא הצלחנו לרענן את מצב החבורה.";
      setErrorMessage(message);
    }
  }, [supabase]);

  useEffect(() => {
    if (!activePartyId || !selectedCharacterId) {
      queueMicrotask(() => setConnectionState("idle"));
      return;
    }

    let active = true;
    let refreshTimer: number | null = null;
    let reportedState: PartyConnectionState | null = null;

    const scheduleRefresh = () => {
      if (!active || refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshLobby(activePartyId);
      }, 120);
    };

    const reportConnection = (state: PartyConnectionState) => {
      if (!active) return;
      setConnectionState(state);
      if (state === reportedState || state === "idle" || state === "connecting") return;
      reportedState = state;
      void updatePartyConnectionAction({
        partyId: activePartyId,
        characterId: selectedCharacterId,
        connectionState: state === "connected" ? "connected" : state === "reconnecting" ? "reconnecting" : "disconnected",
      }).then((result) => {
        if (active && !result.ok && result.code === "AUTH_REQUIRED") setErrorMessage(result.message);
      });
    };

    const unsubscribe = subscribeToPartyLobby(supabase, activePartyId, {
      onChange: scheduleRefresh,
      onConnectionChange: reportConnection,
    });
    const handleOffline = () => reportConnection("disconnected");
    const handleOnline = () => {
      reportConnection("reconnecting");
      scheduleRefresh();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const fallbackRefresh = window.setInterval(scheduleRefresh, 15_000);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.clearInterval(fallbackRefresh);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubscribe();
    };
  }, [activePartyId, refreshLobby, selectedCharacterId, supabase]);

  async function performAction<T>(
    action: BusyAction,
    operation: () => Promise<PartyActionResult<T>>,
    onSuccess: (data: T) => void | Promise<void>,
  ) {
    setBusyAction(action);
    setErrorMessage(null);
    setNotice(null);
    try {
      const result = await operation();
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      await onSuccess(result.data);
    } catch {
      setErrorMessage("לא הצלחנו להשלים את הפעולה. בדקו את החיבור ונסו שוב.");
    } finally {
      setBusyAction(null);
    }
  }

  const selectCharacter = async (characterId: string) => {
    if (snapshot || busyAction) return;
    setSelectedCharacterId(characterId);
    setBusyAction("select");
    setErrorMessage(null);
    setNotice(null);
    router.replace(`/party?character=${encodeURIComponent(characterId)}`, { scroll: false });
    try {
      const membership = await findActivePartyMembership(supabase, characterId);
      if (membership) {
        const nextSnapshot = await fetchPartyLobbySnapshot(supabase, membership.partyId);
        setSnapshot(nextSnapshot);
        if (nextSnapshot) setNotice({ kind: "info", message: "החבורה הפעילה של הדמות שוחזרה." });
      } else {
        setSnapshot(null);
        setConnectionState("idle");
      }
    } catch (error) {
      setErrorMessage(error instanceof PartyQueryError ? error.actionResult.message : "לא הצלחנו לבדוק את מצב הדמות.");
    } finally {
      setBusyAction(null);
    }
  };

  const createParty = (name: string, maximumMembers: number) => {
    if (!selectedCharacter) return;
    void performAction(
      "create",
      () => createPartyAction({ characterId: selectedCharacter.id, name, maximumMembers }),
      async ({ partyId }) => {
        await refreshLobby(partyId);
        setNotice({ kind: "success", message: "החבורה נוצרה וקוד החדר מוכן לשיתוף." });
        router.refresh();
      },
    );
  };

  const joinParty = (roomCode: string) => {
    if (!selectedCharacter) return;
    void performAction(
      "join",
      () => joinPartyAction({ characterId: selectedCharacter.id, roomCode }),
      async ({ partyId }) => {
        await refreshLobby(partyId);
        setNotice({ kind: "success", message: "הצטרפת לחבורה." });
        router.refresh();
      },
    );
  };

  const setReady = (ready: boolean) => {
    if (!snapshot || !selectedCharacter) return;
    void performAction(
      "ready",
      () => setPartyReadyAction({ partyId: snapshot.party.id, characterId: selectedCharacter.id, ready }),
      async () => {
        await refreshLobby(snapshot.party.id);
        setNotice({ kind: "success", message: ready ? "סומנת כמוכן/ה למסע." : "המוכנות בוטלה." });
      },
    );
  };

  const startSession = () => {
    if (!snapshot || !selectedCharacter) return;
    void performAction(
      "start",
      () => startPartySessionAction({ partyId: snapshot.party.id }),
      ({ sessionId }) => {
        router.push(`/game/${encodeURIComponent(selectedCharacter.id)}?partySession=${encodeURIComponent(sessionId)}`);
      },
    );
  };

  const leaveParty = () => {
    if (!snapshot || !selectedCharacter) return;
    void performAction(
      "leave",
      () => leavePartyAction({ partyId: snapshot.party.id, characterId: selectedCharacter.id }),
      () => {
        setSnapshot(null);
        setConnectionState("idle");
        setNotice({ kind: "info", message: "יצאת מהחבורה." });
        router.refresh();
      },
    );
  };

  const closeParty = () => {
    if (!snapshot) return;
    void performAction(
      "close",
      () => closePartyAction({ partyId: snapshot.party.id }),
      () => {
        setSnapshot(null);
        setConnectionState("idle");
        setNotice({ kind: "info", message: "החבורה נסגרה." });
        router.refresh();
      },
    );
  };

  const removeMember = (characterId: string) => {
    if (!snapshot) return;
    void performAction(
      "remove",
      () => removePartyMemberAction({ partyId: snapshot.party.id, characterId }),
      async () => {
        await refreshLobby(snapshot.party.id);
        setNotice({ kind: "success", message: "החבר הוסר מהחבורה." });
      },
    );
  };

  const transferLeadership = (characterId: string) => {
    if (!snapshot) return;
    void performAction(
      "transfer",
      () => transferPartyLeadershipAction({ partyId: snapshot.party.id, newLeaderCharacterId: characterId }),
      async () => {
        await refreshLobby(snapshot.party.id);
        setNotice({ kind: "success", message: "הנהגת החבורה הועברה." });
      },
    );
  };

  const copyRoomCode = async () => {
    if (!snapshot) return;
    try {
      await copyText(snapshot.party.roomCode);
      setNotice({ kind: "success", message: "קוד החדר הועתק." });
      setErrorMessage(null);
    } catch {
      setErrorMessage("לא הצלחנו להעתיק את הקוד. אפשר לסמן אותו ולהעתיק ידנית.");
    }
  };

  return (
    <main id="main-content" className="screen-shell min-h-dvh px-4 py-6 sm:px-8 sm:py-8">
      <Atmosphere image={getAssetPath("background-arfelon-square")} mobileImage={getAssetPath("background-arfelon-square-mobile")} priority />
      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/menu" className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm text-[#b9ad9c] hover:text-[#f0cf82] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0cf82]">
              <ArrowRight className="size-4" />חזרה לתפריט
            </Link>
            <p className="text-xs font-bold tracking-[0.22em] text-[#62c6df]">מסע משותף בארצות ואלדר</p>
            <h1 className="display-font text-5xl text-[#f0cf82] sm:text-6xl">החבורה המקוונת</h1>
            <p className="mt-2 max-w-2xl text-[#b9ad9c]">צרו חדר לשניים עד ארבעה שחקנים, התכוננו יחד והמשיכו לאותו פרק מסונכרן.</p>
          </div>
          <span className="hidden size-16 place-items-center border border-[#c6a15b]/35 bg-black/30 text-[#c6a15b] sm:grid"><UsersRound className="size-8" /></span>
        </header>

        <div className="mb-5 min-h-12" aria-live="polite" aria-atomic="true">
          {errorMessage ? (
            <div className="flex items-start gap-3 border border-[#a43b4e]/45 bg-[#35131a]/90 p-3 text-sm text-[#ffe7e4]" role="alert">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#e87972]" /><span>{errorMessage}</span>
            </div>
          ) : notice ? (
            <div className={`flex items-start gap-3 border p-3 text-sm ${notice.kind === "success" ? "border-[#5ca77a]/40 bg-[#183324]/90 text-[#c9f1d4]" : "border-[#62c6df]/35 bg-[#102b32]/90 text-[#c9edf4]"}`}>
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" /><span>{notice.message}</span>
            </div>
          ) : null}
        </div>

        <div className="stone-panel mb-5 p-5 sm:p-6">
          <PartyCharacterPicker
            characters={characters}
            selectedCharacterId={selectedCharacter?.id ?? ""}
            disabled={Boolean(snapshot) || Boolean(busyAction)}
            onSelect={(characterId) => void selectCharacter(characterId)}
          />
          {snapshot ? <p className="mt-3 text-xs text-[#d4aa70]">כדי להחליף דמות יש לצאת תחילה מהחבורה.</p> : null}
        </div>

        {!selectedCharacter ? (
          <section className="stone-panel grid min-h-64 place-items-center p-8 text-center">
            <div><Shield className="mx-auto mb-4 size-12 text-[#c6a15b]" /><h2 className="display-font text-3xl text-[#f0cf82]">דרושה דמות למסע</h2><p className="mt-2 text-[#a89f91]">צרו דמות לפני כניסה למשחק המקוון.</p><Link href="/characters/new" className="mt-5 inline-flex min-h-12 items-center border border-[#c6a15b]/70 bg-[#6d4e26] px-5 font-semibold text-[#fff3d2] hover:border-[#f0cf82]">יצירת דמות</Link></div>
          </section>
        ) : snapshot ? (
          <PartyRoomPanel
            snapshot={snapshot}
            selectedCharacterId={selectedCharacter.id}
            busyAction={busyAction}
            connectionState={connectionState}
            onCopyCode={() => void copyRoomCode()}
            onReady={setReady}
            onStart={startSession}
            onLeave={leaveParty}
            onClose={closeParty}
            onRemove={removeMember}
            onTransfer={transferLeadership}
          />
        ) : (
          <PartyEntryPanel
            character={selectedCharacter}
            busyAction={busyAction}
            onCreate={createParty}
            onJoin={joinParty}
          />
        )}
      </div>
    </main>
  );
}
