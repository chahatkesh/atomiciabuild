import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(\+1)?$/;

export const roleRequirementsSchema = z.object({
  doctor: z.number().int().min(0).max(50),
  nurse: z.number().int().min(0).max(50),
  receptionist: z.number().int().min(0).max(50),
});

export const createShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(timePattern, "Start time must be HH:mm"),
  endTime: z.string().regex(timePattern, "End time must be HH:mm"),
  requirements: roleRequirementsSchema,
});

export const updateShiftSchema = createShiftSchema.partial();

export const listShiftsQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CreateShiftPayload = z.infer<typeof createShiftSchema>;
export type UpdateShiftPayload = z.infer<typeof updateShiftSchema>;
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;
