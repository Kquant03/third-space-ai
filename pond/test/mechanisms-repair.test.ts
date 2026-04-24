import { describe, it, expect } from "vitest";
import {
  findRecentRupture,
  validateApology, validateForgiveness,
  REPAIR_THRESHOLDS, isClaimValidated,
} from "../src/mechanisms/repair.js";
import { SIM } from "../src/constants.js";

// ─── Event-log stub — returns canned rows for the two queries ───────

type LogEntry = {
  type: "rupture" | "apology";
  actor: string;       // "koi:<id>"
  targets: string[];
  tick: number;
  payload?: Record<string, unknown>;
};

function stubSql(log: LogEntry[]): SqlStorage {
  return {
    exec: (sql: string, ...args: unknown[]): SqlStorageCursor<Record<string, SqlStorageValue>> => {
      if (sql.includes("FROM event") && sql.includes("type = 'rupture'")) {
        const actor = args[0] as string;
        const targetPat = args[1] as string;
        const lower = args[2] as number;
        const targetId = targetPat.replace(/[%"]/g, "");
        const match = log
          .filter((e) => e.type === "rupture")
          .filter((e) => e.actor === actor)
          .filter((e) => e.targets.includes(targetId))
          .filter((e) => e.tick > lower)
          .sort((a, b) => b.tick - a.tick)[0];
        if (!match) return mockCursor([]);
        return mockCursor([{
          tick: match.tick,
          payload_json: JSON.stringify(match.payload ?? {}),
        }]);
      }
      if (sql.includes("FROM event") && sql.includes("type = 'apology'")) {
        const actor = args[0] as string;
        const targetPat = args[1] as string;
        const lower = args[2] as number;
        const targetId = targetPat.replace(/[%"]/g, "");
        const match = log
          .filter((e) => e.type === "apology")
          .filter((e) => e.actor === actor)
          .filter((e) => e.targets.includes(targetId))
          .filter((e) => e.tick > lower)
          .sort((a, b) => b.tick - a.tick)[0];
        if (!match) return mockCursor([]);
        return mockCursor([{ tick: match.tick }]);
      }
      return mockCursor([]);
    },
  } as unknown as SqlStorage;
}

function mockCursor<T extends Record<string, SqlStorageValue>>(rows: T[]): SqlStorageCursor<T> {
  return {
    toArray: () => rows,
  } as unknown as SqlStorageCursor<T>;
}

// ─── findRecentRupture ──────────────────────────────────────────────

describe("repair — findRecentRupture", () => {
  it("returns the most recent rupture within the 14-day window", () => {
    const nowTick = 100_000;
    const sql = stubSql([
      {
        type: "rupture", actor: "koi:alpha", targets: ["beta"],
        tick: 99_500, payload: { valence_drop: 0.45 },
      },
    ]);
    const found = findRecentRupture(sql, "alpha", "beta", nowTick, SIM.tickHz);
    expect(found).not.toBeNull();
    expect(found!.tick).toBe(99_500);
    expect(found!.valenceDrop).toBeCloseTo(0.45);
  });

  it("returns null when rupture is outside the window", () => {
    const nowTick = 100_000;
    const oldTick = nowTick -
      (REPAIR_THRESHOLDS.apologyLookbackSimDays + 1) * 24 * 3600 * SIM.tickHz;
    const sql = stubSql([
      {
        type: "rupture", actor: "koi:alpha", targets: ["beta"],
        tick: oldTick, payload: { valence_drop: 0.45 },
      },
    ]);
    expect(findRecentRupture(sql, "alpha", "beta", nowTick, SIM.tickHz)).toBeNull();
  });

  it("returns null when valence_drop is below the threshold", () => {
    const sql = stubSql([
      {
        type: "rupture", actor: "koi:alpha", targets: ["beta"],
        tick: 99_500, payload: { valence_drop: 0.15 },  // below 0.3
      },
    ]);
    expect(findRecentRupture(sql, "alpha", "beta", 100_000, SIM.tickHz)).toBeNull();
  });

  it("is directional — ruptures by A against B do not qualify B→A apologies", () => {
    const sql = stubSql([
      {
        type: "rupture", actor: "koi:alpha", targets: ["beta"],
        tick: 99_500, payload: { valence_drop: 0.5 },
      },
    ]);
    // β → α apology looks for β's ruptures of α, not α's of β
    expect(findRecentRupture(sql, "beta", "alpha", 100_000, SIM.tickHz))
      .toBeNull();
  });
});

// ─── validateApology — the § IX rupture-first guard ────────────────

describe("repair — validateApology", () => {
  it("HONORS the claim when a rupture exists", () => {
    const sql = stubSql([
      {
        type: "rupture", actor: "koi:alpha", targets: ["beta"],
        tick: 99_500, payload: { valence_drop: 0.45 },
      },
    ]);
    const outcome = validateApology(sql, "alpha", "beta", 100_000, SIM.tickHz);
    expect(outcome.kind).toBe("honored");
    if (outcome.kind === "honored") {
      expect(outcome.firing.mechanism).toBe("apology");
      expect(outcome.firing.payload["ref_rupture_tick"]).toBe(99_500);
      // § VIII: apology_received Δp +0.20 for target
      expect(outcome.firing.participantDelta.p).toBeCloseTo(0.20);
      // § VIII: apology_offered Δp +0.10 for actor
      expect(outcome.firing.actorDelta.p).toBeCloseTo(0.10);
    }
  });

  it("DOWNGRADES the claim when no rupture exists (the agreeable-LLM guard)", () => {
    const sql = stubSql([]);  // no events at all
    const outcome = validateApology(sql, "alpha", "beta", 100_000, SIM.tickHz);
    expect(outcome.kind).toBe("downgraded");
    if (outcome.kind === "downgraded") {
      expect(outcome.reason).toBe("no_rupture_within_window");
      expect(outcome.firingAttempt.actor).toBe("alpha");
      expect(outcome.firingAttempt.target).toBe("beta");
    }
  });

  it("DOWNGRADES when rupture is too old", () => {
    const nowTick = 100_000;
    const oldTick = nowTick -
      (REPAIR_THRESHOLDS.apologyLookbackSimDays + 1) * 24 * 3600 * SIM.tickHz;
    const sql = stubSql([
      {
        type: "rupture", actor: "koi:alpha", targets: ["beta"],
        tick: oldTick, payload: { valence_drop: 0.6 },
      },
    ]);
    const outcome = validateApology(sql, "alpha", "beta", nowTick, SIM.tickHz);
    expect(outcome.kind).toBe("downgraded");
  });
});

// ─── validateForgiveness ────────────────────────────────────────────

describe("repair — validateForgiveness", () => {
  it("requires a prior honored apology by the OTHER direction", () => {
    // α ruptured β, then β apologized to α. α's forgiveness requires
    // β's apology to α to exist.
    const sql = stubSql([
      {
        type: "apology", actor: "koi:beta", targets: ["alpha"],
        tick: 99_800,
      },
    ]);
    // α is now forgiving β
    const outcome = validateForgiveness(sql, "alpha", "beta", 100_000, SIM.tickHz);
    expect(outcome.kind).toBe("honored");
    if (outcome.kind === "honored") {
      expect(outcome.firing.mechanism).toBe("forgiveness");
      expect(outcome.firing.payload["ref_apology_tick"]).toBe(99_800);
    }
  });

  it("DOWNGRADES when no prior apology exists", () => {
    const sql = stubSql([]);
    const outcome = validateForgiveness(sql, "alpha", "beta", 100_000, SIM.tickHz);
    expect(outcome.kind).toBe("downgraded");
  });

  it("DOWNGRADES when the direction is wrong (α apologized, now α forgives β)", () => {
    // α's own apology does not authorize α to forgive β
    const sql = stubSql([
      {
        type: "apology", actor: "koi:alpha", targets: ["beta"],
        tick: 99_800,
      },
    ]);
    const outcome = validateForgiveness(sql, "alpha", "beta", 100_000, SIM.tickHz);
    expect(outcome.kind).toBe("downgraded");
  });
});

// ─── Claim routing ─────────────────────────────────────────────────

describe("repair — isClaimValidated", () => {
  it("flags apology and forgiveness as claim-validated", () => {
    expect(isClaimValidated("apology")).toBe(true);
    expect(isClaimValidated("forgiveness")).toBe(true);
  });

  it("does NOT flag state-based mechanisms", () => {
    expect(isClaimValidated("parallel_presence")).toBe(false);
    expect(isClaimValidated("bearing_witness")).toBe(false);
    expect(isClaimValidated("joyful_reunion")).toBe(false);
  });

  it("does NOT flag scaffolded repair mechanisms (not yet wired)", () => {
    expect(isClaimValidated("cognitive_repair")).toBe(false);
    expect(isClaimValidated("grief_companionship")).toBe(false);
    expect(isClaimValidated("farewell_ritual")).toBe(false);
  });
});
