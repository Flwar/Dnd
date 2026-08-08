import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnvironment } from "@/lib/env";
import {
  buildPublicPortraitUrl,
  CHARACTER_PORTRAIT_BUCKET,
  detectCharacterPortraitFile,
  makeCustomPortraitKey,
  MAX_CHARACTER_PORTRAIT_BYTES,
  normalizeDeclaredPortraitMime,
  parseCustomPortraitKey,
} from "@/lib/portrait-upload";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ErrorStatus = 400 | 401 | 403 | 409 | 413 | 415 | 500 | 503;

function errorResponse(message: string, status: ErrorStatus) {
  return NextResponse.json({ message }, { status });
}

function hasSafeRequestOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

async function authenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}

export async function GET(request: NextRequest) {
  const parsed = parseCustomPortraitKey(request.nextUrl.searchParams.get("portraitKey"));
  if (!parsed) return errorResponse("מפתח הדיוקן אינו תקין.", 400);

  const portraitUrl = buildPublicPortraitUrl(
    getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL,
    parsed.storagePath,
  );
  const response = NextResponse.redirect(portraitUrl, 307);
  response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function POST(request: NextRequest) {
  if (!hasSafeRequestOrigin(request)) return errorResponse("מקור הבקשה אינו מורשה.", 403);

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_CHARACTER_PORTRAIT_BYTES + 65_536) {
    return errorResponse("התמונה המעובדת גדולה מדי. יש לבחור אותה מחדש כדי שהמכשיר יכווץ אותה לפני ההעלאה.", 413);
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) return errorResponse("יש להתחבר כדי להעלות דיוקן.", 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("לא הצלחנו לקרוא את קובץ הדיוקן.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return errorResponse("יש לבחור קובץ תמונה.", 400);
  if (file.size < 1) return errorResponse("קובץ התמונה ריק.", 400);
  if (file.size > MAX_CHARACTER_PORTRAIT_BYTES) {
    return errorResponse("התמונה המעובדת גדולה מדי. יש לבחור אותה מחדש כדי שהמכשיר יכווץ אותה לפני ההעלאה.", 413);
  }

  const declaredMime = normalizeDeclaredPortraitMime(file.type);
  if (!declaredMime) {
    return errorResponse("אפשר להעלות תמונות JPG, PNG או WebP בלבד.", 415);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectCharacterPortraitFile(bytes);
  if (!detected || detected.mimeType !== declaredMime) {
    return errorResponse("תוכן הקובץ אינו תואם לסוג התמונה שנבחר.", 415);
  }

  const objectId = crypto.randomUUID();
  const portraitKey = makeCustomPortraitKey(user.id, objectId, detected.extension);
  const parsed = parseCustomPortraitKey(portraitKey);
  if (!parsed) return errorResponse("לא הצלחנו ליצור מפתח מאובטח לדיוקן.", 500);

  const { error } = await supabase.storage
    .from(CHARACTER_PORTRAIT_BUCKET)
    .upload(parsed.storagePath, bytes, {
      cacheControl: "31536000",
      contentType: detected.mimeType,
      upsert: false,
    });

  if (error) return errorResponse("לא הצלחנו להעלות את הדיוקן. אפשר לנסות שוב.", 503);

  return NextResponse.json({
    portraitKey,
    portraitUrl: buildPublicPortraitUrl(
      getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL,
      parsed.storagePath,
    ),
  }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!hasSafeRequestOrigin(request)) return errorResponse("מקור הבקשה אינו מורשה.", 403);

  const { supabase, user } = await authenticatedClient();
  if (!user) return errorResponse("יש להתחבר כדי למחוק דיוקן.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("בקשת המחיקה אינה תקינה.", 400);
  }

  const portraitKey = input && typeof input === "object" && "portraitKey" in input
    ? (input as { portraitKey?: unknown }).portraitKey
    : null;
  const parsed = parseCustomPortraitKey(portraitKey);
  if (!parsed) return errorResponse("מפתח הדיוקן אינו תקין.", 400);
  if (parsed.ownerId !== user.id) return errorResponse("אין הרשאה למחוק את הדיוקן הזה.", 403);

  const { data: referencedCharacter, error: referenceError } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", user.id)
    .eq("portrait_key", parsed.portraitKey)
    .limit(1)
    .maybeSingle();

  if (referenceError) return errorResponse("לא הצלחנו לוודא אם הדיוקן נמצא בשימוש.", 503);
  if (referencedCharacter) {
    return errorResponse("אי אפשר למחוק דיוקן שנמצא בשימוש של דמות.", 409);
  }

  const { data: referencedProfile, error: profileReferenceError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .eq("avatar_key", parsed.portraitKey)
    .maybeSingle();

  if (profileReferenceError) return errorResponse("לא הצלחנו לוודא אם התמונה נמצאת בשימוש בפרופיל.", 503);
  if (referencedProfile) {
    return errorResponse("אי אפשר למחוק תמונה שנמצאת בשימוש בפרופיל.", 409);
  }

  const { error } = await supabase.storage
    .from(CHARACTER_PORTRAIT_BUCKET)
    .remove([parsed.storagePath]);

  if (error) return errorResponse("לא הצלחנו למחוק את הדיוקן. אפשר לנסות שוב.", 503);
  return NextResponse.json({ ok: true });
}
