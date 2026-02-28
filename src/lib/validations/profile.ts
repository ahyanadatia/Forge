import { z } from "zod";

export const profileSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(60, "First name must be 60 characters or fewer"),
  middle_names: z
    .string()
    .max(100, "Middle names must be 100 characters or fewer")
    .optional()
    .transform((v) => v || null),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(60, "Last name must be 60 characters or fewer"),
  display_name: z
    .string()
    .max(120, "Display name must be 120 characters or fewer")
    .optional()
    .transform((v) => v || null),
  role_descriptor: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || null),
  location: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || null),
  bio: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v || null),
  university_or_company: z
    .string()
    .max(120)
    .optional()
    .transform((v) => v || null),
  primary_stack: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || null),
  secondary_stack: z
    .string()
    .max(100)
    .optional()
    .transform((v) => v || null),
  availability: z.enum([
    "available",
    "open_to_opportunities",
    "busy",
    "unavailable",
  ]),
  commitment_preferences: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v || null),
  website_url: z
    .string()
    .url("Must be a valid URL")
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  linkedin_url: z
    .string()
    .url("Must be a valid URL")
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
