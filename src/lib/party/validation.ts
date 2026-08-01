import { z } from "zod";

const uuidSchema = z.string().uuid("מזהה הדמות אינו תקין.");

export const createPartyInputSchema = z.object({
  characterId: uuidSchema,
  name: z.string().trim().min(2, "יש להזין לפחות שני תווים.").max(40, "שם החבורה ארוך מדי."),
  maximumMembers: z.number().int().min(2).max(4),
});

export const joinPartyInputSchema = z.object({
  characterId: uuidSchema,
  roomCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "קוד החדר חייב להכיל שישה תווים."),
});

export const partyCharacterInputSchema = z.object({
  partyId: uuidSchema,
  characterId: uuidSchema,
});

export const readyPartyInputSchema = partyCharacterInputSchema.extend({
  ready: z.boolean(),
});

export const partyIdInputSchema = z.object({ partyId: uuidSchema });

export const transferLeadershipInputSchema = z.object({
  partyId: uuidSchema,
  newLeaderCharacterId: uuidSchema,
});

export const connectionInputSchema = partyCharacterInputSchema.extend({
  connectionState: z.enum(["connected", "reconnecting", "disconnected"]),
});

export type CreatePartyInput = z.input<typeof createPartyInputSchema>;
export type JoinPartyInput = z.input<typeof joinPartyInputSchema>;
export type PartyCharacterInput = z.input<typeof partyCharacterInputSchema>;
export type ReadyPartyInput = z.input<typeof readyPartyInputSchema>;
export type PartyIdInput = z.input<typeof partyIdInputSchema>;
export type TransferLeadershipInput = z.input<typeof transferLeadershipInputSchema>;
export type ConnectionInput = z.input<typeof connectionInputSchema>;

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}
