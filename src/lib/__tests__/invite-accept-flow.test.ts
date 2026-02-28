import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatCompRange } from "@/lib/compensation";

// ─── Unit tests for compensation formatting ──────────────────────────────────

describe("formatCompRange", () => {
  it("returns TBD for null/tbd type", () => {
    expect(formatCompRange(null, null, null, null, null)).toBe("TBD");
    expect(formatCompRange("tbd", null, null, null, null)).toBe("TBD");
    expect(formatCompRange(undefined, null, null, null, null)).toBe("TBD");
  });

  it("returns Unpaid for unpaid type", () => {
    expect(formatCompRange("unpaid", null, null, null, null)).toBe("Unpaid");
  });

  it("formats hourly range", () => {
    expect(formatCompRange("hourly", "USD", 25, 50, null)).toBe(
      "USD 25–50/hr"
    );
  });

  it("formats fixed range", () => {
    expect(formatCompRange("fixed", "USD", 1000, 5000, null)).toBe(
      "USD 1,000–5,000"
    );
  });

  it("formats min only", () => {
    expect(formatCompRange("fixed", "USD", 500, null, null)).toBe("USD 500");
  });

  it("formats max only", () => {
    expect(formatCompRange("fixed", "USD", null, 2000, null)).toBe(
      "Up to USD 2,000"
    );
  });

  it("formats equity range", () => {
    expect(formatCompRange("equity", null, null, null, "1-5%")).toBe(
      "Equity: 1-5%"
    );
  });

  it("defaults currency to USD", () => {
    expect(formatCompRange("hourly", null, 20, 40, null)).toBe(
      "USD 20–40/hr"
    );
  });
});

// ─── Mock Supabase for transactional tests ───────────────────────────────────

function createMockSupabase(rpcResults: Record<string, any> = {}) {
  return {
    rpc: vi.fn((name: string, args: any) => {
      const result = rpcResults[name];
      if (typeof result === "function") return result(args);
      return Promise.resolve(result ?? { data: null, error: null });
    }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
    })),
  };
}

// ─── Transactional accept tests (service layer) ─────────────────────────────

describe("acceptInviteTransaction", () => {
  let acceptInviteTransaction: typeof import("@/services/membership").acceptInviteTransaction;

  beforeEach(async () => {
    const mod = await import("@/services/membership");
    acceptInviteTransaction = mod.acceptInviteTransaction;
  });

  it("returns accepted status with team and project info on success", async () => {
    const inviteId = "inv-1";
    const userId = "user-1";
    const mockResult = {
      status: "accepted",
      invite_id: inviteId,
      team_id: "team-1",
      team_member_id: "member-1",
      project_id: "proj-1",
    };

    const supabase = createMockSupabase({
      accept_invite: { data: mockResult, error: null },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      inviteId,
      userId
    );
    expect(error).toBeNull();
    expect(data.status).toBe("accepted");
    expect(data.team_member_id).toBe("member-1");
    expect(data.project_id).toBe("proj-1");
  });

  it("is idempotent — accepting twice returns already_accepted", async () => {
    const supabase = createMockSupabase({
      accept_invite: {
        data: { status: "already_accepted", invite_id: "inv-1" },
        error: null,
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBeNull();
    expect(data.status).toBe("already_accepted");
  });

  it("returns already_member when user is already on the team", async () => {
    const supabase = createMockSupabase({
      accept_invite: {
        data: {
          status: "already_member",
          invite_id: "inv-1",
          team_id: "team-1",
        },
        error: null,
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBeNull();
    expect(data.status).toBe("already_member");
  });

  it("returns error when team is at capacity", async () => {
    const supabase = createMockSupabase({
      accept_invite: {
        data: {
          error: "Team is at capacity",
          code: "CAPACITY_FULL",
          current: 4,
          max: 4,
        },
        error: null,
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBe("Team is at capacity");
    expect(data.code).toBe("CAPACITY_FULL");
    expect(data.current).toBe(4);
    expect(data.max).toBe(4);
  });

  it("returns error for expired invite", async () => {
    const supabase = createMockSupabase({
      accept_invite: {
        data: { error: "Invite has expired", code: "EXPIRED" },
        error: null,
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBe("Invite has expired");
    expect(data.code).toBe("EXPIRED");
  });

  it("returns error for non-pending invite", async () => {
    const supabase = createMockSupabase({
      accept_invite: {
        data: { error: "Invite is declined", code: "INVALID_STATUS" },
        error: null,
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBe("Invite is declined");
  });

  it("returns error when invite is not yours", async () => {
    const supabase = createMockSupabase({
      accept_invite: {
        data: { error: "Not your invite", code: "FORBIDDEN" },
        error: null,
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-2"
    );
    expect(error).toBe("Not your invite");
    expect(data.code).toBe("FORBIDDEN");
  });

  it("handles Supabase RPC errors", async () => {
    const supabase = createMockSupabase({
      accept_invite: {
        data: null,
        error: { message: "Database connection failed" },
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBe("Database connection failed");
    expect(data).toBeNull();
  });
});

// ─── Decline transaction tests ──────────────────────────────────────────────

describe("declineInviteTransaction", () => {
  let declineInviteTransaction: typeof import("@/services/membership").declineInviteTransaction;

  beforeEach(async () => {
    const mod = await import("@/services/membership");
    declineInviteTransaction = mod.declineInviteTransaction;
  });

  it("declines a pending invite", async () => {
    const supabase = createMockSupabase({
      decline_invite: {
        data: { status: "declined", invite_id: "inv-1" },
        error: null,
      },
    });

    const { data, error } = await declineInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBeNull();
    expect(data.status).toBe("declined");
  });

  it("returns error for non-pending invite", async () => {
    const supabase = createMockSupabase({
      decline_invite: {
        data: { error: "Invite is accepted", code: "INVALID_STATUS" },
        error: null,
      },
    });

    const { data, error } = await declineInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBe("Invite is accepted");
  });
});

// ─── Owner join tests ───────────────────────────────────────────────────────

describe("joinProjectAsOwner", () => {
  let joinProjectAsOwner: typeof import("@/services/membership").joinProjectAsOwner;

  beforeEach(async () => {
    const mod = await import("@/services/membership");
    joinProjectAsOwner = mod.joinProjectAsOwner;
  });

  it("creates owner membership on toggle ON", async () => {
    const supabase = createMockSupabase({
      join_project_as_owner: {
        data: { team_id: "team-1", member_id: "member-1" },
        error: null,
      },
    });

    const { data, error } = await joinProjectAsOwner(
      supabase,
      "proj-1",
      "owner-1"
    );
    expect(error).toBeNull();
    expect(data.team_id).toBe("team-1");
    expect(data.member_id).toBe("member-1");
  });

  it("is idempotent — calling twice returns existing member", async () => {
    const supabase = createMockSupabase({
      join_project_as_owner: {
        data: { team_id: "team-1", member_id: "member-1" },
        error: null,
      },
    });

    const first = await joinProjectAsOwner(supabase, "proj-1", "owner-1");
    const second = await joinProjectAsOwner(supabase, "proj-1", "owner-1");
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data.team_id).toBe(second.data.team_id);
  });
});

// ─── Accept application tests ───────────────────────────────────────────────

describe("acceptApplicationTransaction", () => {
  let acceptApplicationTransaction: typeof import("@/services/membership").acceptApplicationTransaction;

  beforeEach(async () => {
    const mod = await import("@/services/membership");
    acceptApplicationTransaction = mod.acceptApplicationTransaction;
  });

  it("creates membership when application is accepted", async () => {
    const supabase = createMockSupabase({
      accept_application: {
        data: {
          status: "accepted",
          team_id: "team-1",
          member_id: "member-1",
          project_id: "proj-1",
        },
        error: null,
      },
    });

    const { data, error } = await acceptApplicationTransaction(
      supabase,
      "app-1",
      "owner-1"
    );
    expect(error).toBeNull();
    expect(data.status).toBe("accepted");
    expect(data.member_id).toBe("member-1");
  });

  it("fails when capacity is full", async () => {
    const supabase = createMockSupabase({
      accept_application: {
        data: { error: "Team is at capacity", code: "CAPACITY_FULL" },
        error: null,
      },
    });

    const { error } = await acceptApplicationTransaction(
      supabase,
      "app-1",
      "owner-1"
    );
    expect(error).toBe("Team is at capacity");
  });
});

// ─── Role seat counts ───────────────────────────────────────────────────────

describe("getProjectRoleSeatCounts", () => {
  let getProjectRoleSeatCounts: typeof import("@/services/membership").getProjectRoleSeatCounts;

  beforeEach(async () => {
    const mod = await import("@/services/membership");
    getProjectRoleSeatCounts = mod.getProjectRoleSeatCounts;
  });

  it("returns empty array when no roles defined", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    };

    const result = await getProjectRoleSeatCounts(supabase, "proj-1");
    expect(result).toEqual([]);
  });

  it("computes correct filled counts per role", async () => {
    const roles = [
      { role_name: "Backend Engineer", seats_total: 2 },
      { role_name: "Frontend Engineer", seats_total: 1 },
    ];
    const members = [
      { role: "Backend Engineer" },
      { role: "Backend Engineer" },
      { role: "Frontend Engineer" },
    ];

    let callCount = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "project_roles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({
              data: roles,
              error: null,
            }),
          };
        }
        if (table === "teams") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: "team-1" }, error: null }),
          };
        }
        if (table === "team_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi
              .fn()
              .mockResolvedValue({ data: members, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    const result = await getProjectRoleSeatCounts(supabase, "proj-1");
    expect(result).toEqual([
      { role: "Backend Engineer", filled: 2, total: 2 },
      { role: "Frontend Engineer", filled: 1, total: 1 },
    ]);
  });
});

// ─── Property-based tests ───────────────────────────────────────────────────

describe("property-based: accept flow invariants", () => {
  it("RPC call always includes both invite_id and user_id", async () => {
    const { acceptInviteTransaction } = await import("@/services/membership");
    const spy = vi.fn().mockResolvedValue({
      data: { status: "accepted" },
      error: null,
    });
    const supabase = { rpc: spy };

    await acceptInviteTransaction(supabase, "inv-123", "user-456");

    expect(spy).toHaveBeenCalledWith("accept_invite", {
      p_invite_id: "inv-123",
      p_user_id: "user-456",
    });
  });

  it("decline RPC call always includes both invite_id and user_id", async () => {
    const { declineInviteTransaction } = await import("@/services/membership");
    const spy = vi.fn().mockResolvedValue({
      data: { status: "declined" },
      error: null,
    });
    const supabase = { rpc: spy };

    await declineInviteTransaction(supabase, "inv-123", "user-456");

    expect(spy).toHaveBeenCalledWith("decline_invite", {
      p_invite_id: "inv-123",
      p_user_id: "user-456",
    });
  });

  it("successful accept always returns a project_id and team_id", async () => {
    const { acceptInviteTransaction } = await import("@/services/membership");
    const supabase = createMockSupabase({
      accept_invite: {
        data: {
          status: "accepted",
          invite_id: "inv-1",
          team_id: "team-1",
          team_member_id: "member-1",
          project_id: "proj-1",
        },
        error: null,
      },
    });

    const { data, error } = await acceptInviteTransaction(
      supabase,
      "inv-1",
      "user-1"
    );
    expect(error).toBeNull();
    expect(data).toHaveProperty("project_id");
    expect(data).toHaveProperty("team_id");
    expect(data).toHaveProperty("team_member_id");
  });

  it("error responses always include a code field", async () => {
    const errorCases = [
      { error: "Not found", code: "NOT_FOUND" },
      { error: "Not your invite", code: "FORBIDDEN" },
      { error: "Team is at capacity", code: "CAPACITY_FULL" },
      { error: "Invite has expired", code: "EXPIRED" },
      { error: "Invite is declined", code: "INVALID_STATUS" },
    ];

    const { acceptInviteTransaction } = await import("@/services/membership");

    for (const ec of errorCases) {
      const supabase = createMockSupabase({
        accept_invite: { data: ec, error: null },
      });

      const { data, error } = await acceptInviteTransaction(
        supabase,
        "inv-1",
        "user-1"
      );
      expect(error).toBeTruthy();
      expect(data).toHaveProperty("code");
    }
  });
});
