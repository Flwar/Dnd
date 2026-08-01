import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { PartyConnectionState } from "@/lib/party/types";
import type { Database } from "@/types/database";

type RealtimeCallbacks = {
  onChange: () => void;
  onConnectionChange: (state: PartyConnectionState) => void;
};

export function subscribeToPartyLobby(
  supabase: SupabaseClient<Database>,
  partyId: string,
  callbacks: RealtimeCallbacks,
): () => void {
  let wasConnected = false;
  callbacks.onConnectionChange("connecting");

  const notifyChange = () => callbacks.onChange();
  const channel: RealtimeChannel = supabase
    .channel(`party-lobby:${partyId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "parties", filter: `id=eq.${partyId}` },
      notifyChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` },
      notifyChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "party_sessions", filter: `party_id=eq.${partyId}` },
      notifyChange,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        wasConnected = true;
        callbacks.onConnectionChange("connected");
        callbacks.onChange();
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        callbacks.onConnectionChange(wasConnected ? "reconnecting" : "disconnected");
      } else if (status === "CLOSED") {
        callbacks.onConnectionChange("disconnected");
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
