import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const disconnectSchema = z.object({
  connectionId: z.uuid(),
});

export async function POST(request: Request) {
  try {
    const input = disconnectSchema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const { error } = await supabase.rpc("disconnect_player_presence", {
      p_connection_id: input.data.connectionId,
    });
    if (error) return NextResponse.json({ ok: false }, { status: 409 });

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
