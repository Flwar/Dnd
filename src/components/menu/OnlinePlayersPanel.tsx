"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Crown, UserRound, UsersRound, Wifi, WifiOff } from "lucide-react";
import { assetManifestByKey } from "@/lib/assets/manifest";
import {
  useOnlinePresence,
  type PresenceConnectionStatus,
} from "@/components/providers/OnlinePresenceProvider";

const statusLabels: Record<PresenceConnectionStatus, string> = {
  connecting: "מתחבר לשרת…",
  connected: "מחובר לשרת",
  reconnecting: "מחדש את החיבור…",
  disconnected: "החיבור נותק",
};

export function OnlinePlayersPanel() {
  const { currentUserId, players, status } = useOnlinePresence();
  const [open, setOpen] = useState(false);
  const connected = status === "connected";

  return (
    <section className="mb-4 border border-[#62c6df]/20 bg-[#0a1014]/88 shadow-lg backdrop-blur" aria-labelledby="online-players-title">
      <button
        type="button"
        className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-white/[0.035] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf82] sm:px-4"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="online-players-list"
      >
        <span className="relative grid size-8 shrink-0 place-items-center border border-[#62c6df]/25 bg-[#10202a] text-[#62c6df]">
          <UsersRound className="size-4" aria-hidden="true" />
          <span className={`absolute -end-1 -top-1 size-2.5 rounded-full border-2 border-[#0a1014] ${connected ? "bg-[#6ecb8f]" : "bg-[#c67467]"}`} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="online-players-title" className="block text-sm font-bold text-[#e7dfd2]">שחקנים מחוברים</span>
          <span className="block truncate text-xs text-[#9eabb0]">
            {statusLabels[status]}
            <span aria-hidden="true"> · </span>
            <bdi>{players.length}</bdi> {players.length === 1 ? "שחקן/ית" : "שחקנים"}
          </span>
        </span>
        {connected ? <Wifi className="size-4 shrink-0 text-[#6ecb8f]" aria-hidden="true" /> : <WifiOff className="size-4 shrink-0 text-[#c67467]" aria-hidden="true" />}
        <ChevronDown className={`size-4 shrink-0 text-[#9e968a] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div id="online-players-list" className="border-t border-[#62c6df]/15 px-3 py-3 sm:px-4">
          {players.length ? (
            <ul className="grid max-h-44 gap-2 overflow-y-auto overscroll-contain pe-1 sm:grid-cols-2" aria-label="רשימת השחקנים המחוברים">
              {players.map((player) => {
                const avatarPath = assetManifestByKey[player.avatarKey]?.path;
                return (
                  <li key={player.userId} className="flex min-w-0 items-center gap-2 border border-white/[0.07] bg-black/20 p-2">
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden border border-[#c6a15b]/25 bg-[#151719]">
                      {avatarPath ? (
                        <Image src={avatarPath} alt="" width={36} height={36} sizes="36px" className="size-full object-cover" />
                      ) : (
                        <UserRound className="size-4 text-[#9e968a]" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <bdi className="truncate text-sm font-bold text-[#e7dfd2]">{player.displayName}</bdi>
                        {player.userId === currentUserId ? <span className="shrink-0 text-[0.68rem] text-[#62c6df]">(את/ה)</span> : null}
                      </span>
                      <span className="flex items-center gap-1 truncate text-xs text-[#a89f91]">
                        {player.isKing ? <Crown className="size-3 shrink-0 text-[#f0cf82]" aria-hidden="true" /> : null}
                        <span className="truncate">{player.accountTitle ?? "הרפתקן/ית"}</span>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 text-center text-sm text-[#9e968a]" role="status">
              {status === "disconnected" ? "לא ניתן לטעון כעת את רשימת השחקנים." : "עוד אין שחקנים מחוברים."}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
