"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Clipboard,
  Crown,
  DoorOpen,
  Heart,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserRoundCog,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { classesById } from "@/content/classes";
import type {
  PartyConnectionState,
  PartyLobbySnapshot,
  PartyRosterMember,
} from "@/lib/party/types";
import type { ClassId } from "@/types/game";

type Confirmation =
  | { kind: "close" }
  | { kind: "remove"; characterId: string; characterName: string }
  | null;

type Props = {
  snapshot: PartyLobbySnapshot;
  selectedCharacterId: string;
  busyAction: string | null;
  connectionState: PartyConnectionState;
  onCopyCode: () => void;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onClose: () => void;
  onRemove: (characterId: string) => void;
  onTransfer: (characterId: string) => void;
};

const connectionLabels: Record<PartyConnectionState, string> = {
  idle: "מוכן להתחבר",
  connecting: "מתחבר לשרת…",
  connected: "מחובר בזמן אמת",
  reconnecting: "החיבור נותק. מנסים להתחבר מחדש.",
  disconnected: "אין חיבור לשרת",
};

const memberConnectionLabels: Record<PartyRosterMember["connectionState"], string> = {
  connected: "מחובר/ת",
  reconnecting: "מתחבר/ת מחדש",
  disconnected: "לא מחובר/ת",
};

function ConnectionBadge({ state }: { state: PartyConnectionState }) {
  const connected = state === "connected";
  const reconnecting = state === "connecting" || state === "reconnecting";
  return (
    <span
      className={`inline-flex min-h-9 items-center gap-2 border px-3 py-1.5 text-xs font-semibold ${
        connected
          ? "border-[#5ca77a]/35 bg-[#5ca77a]/10 text-[#a8e5ba]"
          : reconnecting
            ? "border-[#c6a15b]/35 bg-[#c6a15b]/10 text-[#f0cf82]"
            : "border-[#a43b4e]/40 bg-[#a43b4e]/10 text-[#f2aaa5]"
      }`}
      role="status"
    >
      {reconnecting ? <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" /> : connected ? <Wifi className="size-3.5" aria-hidden="true" /> : <WifiOff className="size-3.5" aria-hidden="true" />}
      {connectionLabels[state]}
    </span>
  );
}

export function PartyRoomPanel({
  snapshot,
  selectedCharacterId,
  busyAction,
  connectionState,
  onCopyCode,
  onReady,
  onStart,
  onLeave,
  onClose,
  onRemove,
  onTransfer,
}: Props) {
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const me = snapshot.members.find((member) => member.characterId === selectedCharacterId) ?? null;
  const isLeader = snapshot.party.leaderCharacterId === selectedCharacterId;
  const allReady = snapshot.members.length >= 2 && snapshot.members.every((member) => member.ready);
  const leaderCannotLeave = isLeader && snapshot.members.length > 1;
  const lobbyOpen = snapshot.party.status === "open" && !snapshot.session;
  const sessionHref = snapshot.session
    ? `/game/${encodeURIComponent(selectedCharacterId)}?partySession=${encodeURIComponent(snapshot.session.id)}`
    : null;

  const confirmAction = () => {
    if (confirmation?.kind === "close") onClose();
    if (confirmation?.kind === "remove") onRemove(confirmation.characterId);
    setConfirmation(null);
  };

  return (
    <section className="stone-panel overflow-hidden" aria-labelledby="party-room-title">
      <header className="border-b border-white/8 bg-[linear-gradient(90deg,rgba(98,198,223,.08),transparent_45%,rgba(198,161,91,.09))] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#62c6df]">חבורה מקוונת</p>
            <h2 id="party-room-title" className="display-font text-4xl text-[#f0cf82] sm:text-5xl">{snapshot.party.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-[#b9ad9c]"><UsersRound className="size-4" />
              <span><bdi className="ltr-isolate">{snapshot.members.length}/{snapshot.party.maximumMembers}</bdi> חברים בחדר</span>
            </p>
          </div>
          <ConnectionBadge state={connectionState} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border border-[#c6a15b]/25 bg-black/25 p-3">
          <div className="min-w-0 flex-1">
            <span className="block text-xs text-[#9d9589]">קוד החדר</span>
            <bdi className="ltr-isolate block font-mono text-2xl font-bold tracking-[0.24em] text-[#fff0c4]">{snapshot.party.roomCode}</bdi>
          </div>
          <GameButton size="sm" variant="secondary" onClick={onCopyCode} aria-label="העתקת קוד החדר">
            <Clipboard className="size-4" aria-hidden="true" />העתקה
          </GameButton>
        </div>
      </header>

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-xs font-bold tracking-[0.18em] text-[#62c6df]">חברי החבורה</p><h3 className="display-font text-3xl text-[#f0cf82]">סביב המדורה</h3></div>
            {lobbyOpen ? <span className="text-xs text-[#8f877a]">ממתינים לכולם</span> : null}
          </div>
          <ul className="space-y-3" aria-label="רשימת חברי החבורה">
            {snapshot.members.map((member) => {
              const memberIsMe = member.characterId === selectedCharacterId;
              const memberIsLeader = member.characterId === snapshot.party.leaderCharacterId;
              const className = classesById[member.classId as ClassId]?.name ?? "הרפתקן";
              return (
                <li key={member.characterId} className={`grid gap-3 border p-3 sm:grid-cols-[4.5rem_1fr_auto] sm:items-center ${memberIsMe ? "border-[#c6a15b]/55 bg-[#c6a15b]/8" : "border-white/10 bg-black/20"}`}>
                  <div className="relative aspect-square overflow-hidden bg-[#101318]">
                    <CharacterPortrait portraitKey={member.portraitKey} alt={`דיוקן הדמות ${member.characterName}`} sizes="72px" className="object-cover object-[center_28%]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-[#f2e7d2]">{member.characterName}</span>
                      {memberIsLeader ? <span className="inline-flex items-center gap-1 border border-[#c6a15b]/35 bg-[#c6a15b]/10 px-2 py-0.5 text-[0.68rem] text-[#f0cf82]"><Crown className="size-3" />מוביל/ה</span> : null}
                      {memberIsMe ? <span className="text-[0.68rem] text-[#62c6df]">הדמות שלך</span> : null}
                    </div>
                    <p className="text-xs text-[#9e968a]">{member.displayName} · {className} · דרגה <bdi className="ltr-isolate">{member.level}</bdi></p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="flex items-center gap-1 text-[#c9bfb0]"><Heart className="size-3.5 text-[#d05b54]" /><bdi className="ltr-isolate">{member.currentHealth}/{member.maximumHealth}</bdi></span>
                      <span className={member.ready ? "text-[#a8e5ba]" : "text-[#c4b8a5]"}>{member.ready ? "מוכן/ה למסע" : "עדיין לא מוכן/ה"}</span>
                      <span className={member.connectionState === "connected" ? "text-[#9dd7c0]" : "text-[#d6ae72]"}>{memberConnectionLabels[member.connectionState]}</span>
                    </div>
                  </div>
                  {isLeader && !memberIsMe && lobbyOpen ? (
                    <div className="flex flex-wrap gap-1 sm:flex-col">
                      <GameButton size="sm" variant="ghost" onClick={() => onTransfer(member.characterId)} disabled={Boolean(busyAction)} aria-label={`העברת ההנהגה אל ${member.characterName}`}>
                        <UserRoundCog className="size-4" />העברת הנהגה
                      </GameButton>
                      <GameButton size="sm" variant="ghost" className="text-[#e99a93]" onClick={() => setConfirmation({ kind: "remove", characterId: member.characterId, characterName: member.characterName })} disabled={Boolean(busyAction)} aria-label={`הסרת ${member.characterName} מהחבורה`}>
                        <UserMinus className="size-4" />הסרה
                      </GameButton>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="glass-inset self-start p-4 sm:p-5" aria-label="פעולות החבורה">
          {snapshot.session && sessionHref ? (
            <div className="mb-5 border border-[#62c6df]/30 bg-[#62c6df]/8 p-4 text-center">
              <ShieldCheck className="mx-auto mb-2 size-9 text-[#78dbef]" />
              <h3 className="display-font text-2xl text-[#f0cf82]">המסע כבר החל</h3>
              <p className="mb-4 text-sm text-[#b9ad9c]">החיבור יחזיר אותך לסצנה ולתור הנוכחיים.</p>
              <Link href={sessionHref} className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-[#c6a15b]/70 bg-gradient-to-b from-[#8b6b34] to-[#4d351b] px-4 font-semibold text-[#fff3d2] hover:border-[#f0cf82]">
                <DoorOpen className="size-5" />כניסה לפרק
              </Link>
            </div>
          ) : (
            <>
              <h3 className="display-font text-2xl text-[#f0cf82]">מוכנים לצאת?</h3>
              <p className="mb-4 text-sm leading-6 text-[#a89f91]">כל חבר מסמן מוכנות. מוביל החבורה מתחיל כשיש לפחות שני שחקנים.</p>
              {me ? (
                <GameButton className="mb-3 w-full" variant={me.ready ? "secondary" : "primary"} loading={busyAction === "ready"} disabled={Boolean(busyAction) || !lobbyOpen} onClick={() => onReady(!me.ready)}>
                  {me.ready ? <RefreshCw className="size-4" /> : <Check className="size-5" />}{me.ready ? "ביטול מוכנות" : "אני מוכן/ה"}
                </GameButton>
              ) : null}
              {isLeader ? (
                <GameButton className="w-full" loading={busyAction === "start"} disabled={Boolean(busyAction) || !allReady || !lobbyOpen} onClick={onStart}>
                  <Play className="size-5" />פתיחת הפרק
                </GameButton>
              ) : (
                <p className="border border-white/8 bg-black/25 p-3 text-center text-xs text-[#a89f91]">ממתינים למוביל החבורה.</p>
              )}
              {!allReady ? <p className="mt-2 text-center text-xs text-[#8f877a]">נדרשים לפחות שני חברים מוכנים.</p> : null}
            </>
          )}

          <div className="my-5 h-px bg-white/8" />
          {!snapshot.session ? (
            <div className="space-y-2">
              <GameButton variant="ghost" className="w-full" onClick={onLeave} loading={busyAction === "leave"} disabled={Boolean(busyAction) || leaderCannotLeave}>
                <LogOut className="size-4" />יציאה מהחבורה
              </GameButton>
              {leaderCannotLeave ? <p className="text-center text-xs text-[#d4aa70]">כדי לצאת, העבירו קודם את ההנהגה.</p> : null}
              {isLeader ? (
                <GameButton variant="danger" className="w-full" onClick={() => setConfirmation({ kind: "close" })} disabled={Boolean(busyAction)}>
                  <Trash2 className="size-4" />סגירת החבורה
                </GameButton>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      {confirmation ? (
        <div className="border-t border-[#a43b4e]/30 bg-[#35131a]/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4" role="alert" aria-live="assertive">
          <p className="mb-3 text-sm text-[#ffe7e4] sm:mb-0">
            {confirmation.kind === "close"
              ? "לסגור את החבורה? כל החברים ינותקו מהחדר."
              : `להסיר את ${confirmation.characterName} מהחבורה?`}
          </p>
          <div className="flex gap-2">
            <GameButton size="sm" variant="danger" onClick={confirmAction}>אישור</GameButton>
            <GameButton size="sm" variant="ghost" onClick={() => setConfirmation(null)}>ביטול</GameButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
