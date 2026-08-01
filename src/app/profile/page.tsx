import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "פרופיל השחקן" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser("/profile");
  const { data } = await supabase.from("profiles").select("display_name,avatar_key,created_at,last_active_at,total_playtime_seconds,highest_character_level,completed_chapter_count").eq("id", user.id).single();
  if (!data) return null;
  return <ProfileClient profile={data} />;
}
