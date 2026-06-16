import { z } from "zod";

/** E.164 phone number, e.g. +14155550123. */
export const e164 = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164, e.g. +14155550123");

export const voiceGenderSchema = z.enum(["female", "male"]);

export const scriptCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  instruction: z.string().trim().min(1).max(8000),
  language: z.string().trim().max(20).optional().nullable(),
  voiceGender: voiceGenderSchema.optional().default("female"),
});

export const scriptUpdateSchema = scriptCreateSchema.partial();

export const contactCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: e164,
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const contactBulkSchema = z.object({
  contacts: z.array(contactCreateSchema).min(1).max(1000),
});

const hour = z.number().int().min(0).max(23);

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scriptId: z.string().uuid(),
  mode: z.enum(["sequential", "parallel"]),
  contactIds: z.array(z.string().uuid()).min(1).max(1000),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  retryDelaySeconds: z.number().int().min(30).max(86400).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  workStartHour: hour.optional().nullable(),
  workEndHour: hour.optional().nullable(),
});

export const adhocCallSchema = z
  .object({
    toNumber: e164.optional(),
    contactId: z.string().uuid().optional(),
    scriptId: z.string().uuid().optional(),
    instruction: z.string().trim().min(1).max(8000).optional(),
    language: z.string().trim().max(20).optional().nullable(),
    voiceGender: voiceGenderSchema.optional(),
  })
  .refine((d) => d.toNumber || d.contactId, {
    message: "Provide a phone number or a contact",
  })
  .refine((d) => d.scriptId || d.instruction, {
    message: "Provide a script or an instruction",
  });

export type ScriptCreate = z.infer<typeof scriptCreateSchema>;
export type ContactCreate = z.infer<typeof contactCreateSchema>;
export type CampaignCreate = z.infer<typeof campaignCreateSchema>;
