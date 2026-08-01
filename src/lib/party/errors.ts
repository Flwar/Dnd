import type { PartyActionErrorCode, PartyActionFailure } from "@/lib/party/types";

type ErrorLike = { code?: string; message?: string; details?: string | null };

const databaseErrorMap: ReadonlyArray<{
  markers: string[];
  code: PartyActionErrorCode;
  message: string;
}> = [
  {
    markers: ["AUTHENTICATION_REQUIRED", "JWT", "NO AUTHORIZATION"],
    code: "AUTH_REQUIRED",
    message: "החיבור לחשבון פג. יש להתחבר מחדש.",
  },
  {
    markers: ["CHARACTER_NOT_OWNED"],
    code: "CHARACTER_NOT_OWNED",
    message: "הדמות שנבחרה אינה שייכת לחשבון הזה.",
  },
  {
    markers: ["CHARACTER_ALREADY_IN_PARTY"],
    code: "CHARACTER_ALREADY_IN_PARTY",
    message: "הדמות כבר נמצאת בחבורה אחרת.",
  },
  {
    markers: ["PARTY_NOT_FOUND"],
    code: "PARTY_NOT_FOUND",
    message: "לא נמצאה חבורה עם קוד החדר הזה.",
  },
  {
    markers: ["PARTY_NOT_OPEN"],
    code: "PARTY_NOT_OPEN",
    message: "החבורה כבר יצאה למסע או נסגרה.",
  },
  {
    markers: ["PARTY_FULL"],
    code: "PARTY_FULL",
    message: "החבורה מלאה. אפשר לבקש מהמוביל לפנות מקום.",
  },
  {
    markers: ["NOT_A_PARTY_MEMBER"],
    code: "NOT_A_PARTY_MEMBER",
    message: "הדמות אינה חברה פעילה בחבורה הזאת.",
  },
  {
    markers: ["LEADER_REQUIRED"],
    code: "LEADER_REQUIRED",
    message: "רק מוביל החבורה יכול לבצע את הפעולה הזאת.",
  },
  {
    markers: ["PARTY_NOT_READY"],
    code: "PARTY_NOT_READY",
    message: "אי אפשר להתחיל עד שכל חברי החבורה יהיו מוכנים.",
  },
  {
    markers: ["PARTY_REQUIRES_TWO_MEMBERS"],
    code: "PARTY_REQUIRES_TWO_MEMBERS",
    message: "משחק מקוון דורש לפחות שני חברי חבורה.",
  },
  {
    markers: ["TRANSFER_LEADERSHIP_BEFORE_LEAVING"],
    code: "TRANSFER_LEADERSHIP_REQUIRED",
    message: "לפני היציאה יש להעביר את הנהגת החבורה לחבר אחר.",
  },
  {
    markers: ["NEW_LEADER_NOT_IN_PARTY", "LEADER_CANNOT_REMOVE_SELF"],
    code: "INVALID_MEMBER",
    message: "לא ניתן לבצע את הפעולה על חבר החבורה שנבחר.",
  },
  {
    markers: ["VERSION_CONFLICT", "SESSION_COMMAND_PENDING"],
    code: "SESSION_CONFLICT",
    message: "מצב החבורה השתנה. רעננו את המצב ונסו שוב.",
  },
  {
    markers: ["INVALID_", "23514", "22P02"],
    code: "INVALID_INPUT",
    message: "אחד הפרטים שנשלחו אינו תקין.",
  },
];

function asErrorLike(error: unknown): ErrorLike {
  if (error && typeof error === "object") return error as ErrorLike;
  return { message: typeof error === "string" ? error : undefined };
}

export function mapPartyError(error: unknown): PartyActionFailure {
  const candidate = asErrorLike(error);
  const searchable = `${candidate.code ?? ""} ${candidate.message ?? ""} ${candidate.details ?? ""}`.toUpperCase();
  const mapped = databaseErrorMap.find(({ markers }) =>
    markers.some((marker) => searchable.includes(marker)),
  );

  if (mapped) return { ok: false, code: mapped.code, message: mapped.message };
  if (
    searchable.includes("FETCH") ||
    searchable.includes("NETWORK") ||
    searchable.includes("ECONN") ||
    searchable.includes("PGRST000")
  ) {
    return {
      ok: false,
      code: "CONNECTION_FAILED",
      message: "לא הצלחנו להגיע לשרת. בדקו את החיבור ונסו שוב.",
    };
  }

  return {
    ok: false,
    code: "UNKNOWN",
    message: "לא הצלחנו לבצע את הפעולה. אפשר לנסות שוב בעוד רגע.",
  };
}

export class PartyQueryError extends Error {
  readonly actionResult: PartyActionFailure;

  constructor(error: unknown) {
    const actionResult = mapPartyError(error);
    super(actionResult.message);
    this.name = "PartyQueryError";
    this.actionResult = actionResult;
  }
}
