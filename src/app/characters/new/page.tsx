import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CharacterCreator } from "@/components/character-creation/CharacterCreator";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "יצירת דמות" };

export default async function NewCharacterPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_role,is_king")
    .eq("id", data.user.id)
    .maybeSingle();
  const isKing = profile?.account_role === "administrator" && profile.is_king === true;
  return <CharacterCreator isKing={isKing} />;
}
