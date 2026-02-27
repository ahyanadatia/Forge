import type { Builder } from "@/types";

type NameSource = Builder | Record<string, any>;

/**
 * Returns the display name for a builder or raw row.
 * Priority: display_name > constructed from name parts > full_name
 */
export function getDisplayName(builder: NameSource): string {
  if (builder.display_name) return builder.display_name;

  const parts = [
    builder.first_name,
    builder.middle_names,
    builder.last_name,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" ");

  return builder.full_name ?? "Builder";
}

/**
 * Returns initials for avatar fallback (max 2 chars).
 */
export function getInitials(builder: NameSource): string {
  const name = getDisplayName(builder);
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Constructs full_name from parts for storage.
 */
export function buildFullName(
  firstName: string,
  middleNames: string | null,
  lastName: string
): string {
  return [firstName, middleNames, lastName].filter(Boolean).join(" ");
}
