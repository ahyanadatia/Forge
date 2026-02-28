import { z } from "zod";

const USERNAME_REGEX = /^[a-z0-9][a-z0-9_]*[a-z0-9]$/;
const DOUBLE_UNDERSCORE = /__/;

const RESERVED_USERNAMES = new Set([
  "admin", "api", "app", "auth", "billing", "blog", "dashboard",
  "demo", "dev", "docs", "explore", "forge", "help", "home",
  "invite", "login", "logout", "messages", "new", "null",
  "onboarding", "privacy", "profile", "projects", "root",
  "search", "settings", "signup", "status", "support", "system",
  "team", "teams", "terms", "test", "u", "undefined", "user",
  "users", "www",
]);

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): UsernameValidationResult {
  const username = normalizeUsername(raw);

  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (username.length > 20) {
    return { valid: false, error: "Username must be at most 20 characters" };
  }
  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: "Username must start and end with a letter or number, and contain only lowercase letters, numbers, and underscores",
    };
  }
  if (DOUBLE_UNDERSCORE.test(username)) {
    return { valid: false, error: "Username cannot contain consecutive underscores" };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, error: "This username is reserved" };
  }

  return { valid: true, normalized: username };
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(normalizeUsername(username));
}

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(USERNAME_REGEX, "Only lowercase letters, numbers, and underscores allowed (must start/end with letter or number)")
  .refine((v) => !DOUBLE_UNDERSCORE.test(v), "Cannot contain consecutive underscores")
  .refine((v) => !RESERVED_USERNAMES.has(v), "This username is reserved")
  .transform(normalizeUsername);
