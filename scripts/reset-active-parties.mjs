import { createClient } from "@supabase/supabase-js";

const shouldReset = process.env.RESET_ACTIVE_PARTIES === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Party reset requires NEXT_PUBLIC_SUPABASE_URL and a server-only Supabase secret key.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

function fail(operation, error) {
  if (!error) return;
  console.error(`${operation} failed (${error.code ?? "unknown"}).`);
  process.exit(1);
}

async function inspect() {
  const [parties, members, sessions, commands] = await Promise.all([
    supabase.from("parties").select("id,status").neq("status", "closed"),
    supabase
      .from("party_members")
      .select("party_id,character_id")
      .is("left_at", null),
    supabase
      .from("party_sessions")
      .select("id,party_id,status")
      .in("status", ["forming", "active"]),
    supabase
      .from("party_commands")
      .select("session_id")
      .eq("status", "pending"),
  ]);

  fail("Reading active parties", parties.error);
  fail("Reading active memberships", members.error);
  fail("Reading active sessions", sessions.error);
  fail("Reading pending commands", commands.error);

  const activePartyIds = new Set((parties.data ?? []).map((party) => party.id));
  const activeSessionIds = new Set((sessions.data ?? []).map((session) => session.id));
  const activeMemberships = members.data ?? [];
  const activeSessionCommands = (commands.data ?? []).filter((command) =>
    activeSessionIds.has(command.session_id),
  );

  return {
    partyIds: [...activePartyIds],
    sessionIds: [...activeSessionIds],
    counts: {
      activeParties: activePartyIds.size,
      activeMemberships: activeMemberships.length,
      activeSessions: activeSessionIds.size,
      pendingCommands: activeSessionCommands.length,
    },
  };
}

const before = await inspect();
console.log(`Party reset inspection: ${JSON.stringify(before.counts)}`);

if (!shouldReset) {
  console.log("Dry run only. Set RESET_ACTIVE_PARTIES=1 to perform the reset.");
  process.exit(0);
}

const now = new Date().toISOString();

if (before.sessionIds.length > 0) {
  const abandonedSessions = await supabase
    .from("party_sessions")
    .update({ status: "abandoned", completed_at: now })
    .in("id", before.sessionIds)
    .in("status", ["forming", "active"]);
  fail("Abandoning active party sessions", abandonedSessions.error);

  const rejectedCommands = await supabase
    .from("party_commands")
    .update({
      status: "rejected",
      result: { code: "ADMIN_PARTY_RESET" },
      processed_at: now,
    })
    .in("session_id", before.sessionIds)
    .eq("status", "pending");
  fail("Rejecting pending party commands", rejectedCommands.error);
}

if (before.counts.activeMemberships > 0) {
  const departedMembers = await supabase
    .from("party_members")
    .update({
      left_at: now,
      ready_state: false,
      connection_state: "disconnected",
      last_seen_at: now,
    })
    .is("left_at", null);
  fail("Releasing active party members", departedMembers.error);
}

if (before.partyIds.length > 0) {
  const closedParties = await supabase
    .from("parties")
    .update({ status: "closed", closed_at: now })
    .in("id", before.partyIds)
    .neq("status", "closed");
  fail("Closing active parties", closedParties.error);
}

const after = await inspect();
console.log(`Party reset verification: ${JSON.stringify(after.counts)}`);

if (
  after.counts.activeParties !== 0 ||
  after.counts.activeMemberships !== 0 ||
  after.counts.activeSessions !== 0 ||
  after.counts.pendingCommands !== 0
) {
  console.error("Party reset verification failed: active state remains.");
  process.exit(1);
}

console.log("All active party memberships and sessions were released successfully.");
