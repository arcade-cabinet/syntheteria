/**
 * AI & Behavior ECS Traits — hacking, signal networks, automation routines,
 * wildlife, holograms, and civilization-level AI governance.
 *
 * Koota features used:
 *   - trait() with callback → AoS storage for complex/nested data (arrays, maps)
 *   - trait() with schema object → SoA storage for flat numerics/booleans
 *   - relation() → entity-to-entity references for follow/work targets
 *
 * Migration notes:
 *   - HackableComponent → Hackable trait (SoA)
 *   - SignalRelayComponent → SignalRelay trait (AoS, has array)
 *   - AutomationComponent → Automation trait (AoS, has arrays + extended routines)
 *   - OtterComponent → Otter trait (AoS, has arrays)
 *   - HologramComponent → Hologram trait (AoS) + HologramSource relation
 *   - CivilizationGovernor is new — AI director for NPC factions
 */

import type { PositionSchema } from "./core";

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/**
 * All automation routines a bot can follow.
 *
 * Extended from the original 5 routines to include factory-planet behaviors:
 *   - "carry_cubes"  — pick up material cubes and deliver to target hopper/stack
 *   - "build_wall"   — take cubes from a hopper and place them on the build grid
 */
export type AutomationRoutine =
  | "idle"
  | "patrol"
  | "guard"
  | "follow"
  | "work"
  | "carry_cubes"
  | "build_wall";

// ---------------------------------------------------------------------------
// Hacking system
// ---------------------------------------------------------------------------

/**
 * Hackable — marks an entity as a target for the player's hacking ability.
 *
 * Koota: `trait({ ... })` — SoA storage (all flat numerics/booleans).
 *
 * Hacking is the core mechanic for expanding the player's force: you send a
 * signal link to a machine, apply a hacking technique, and spend compute
 * to take it over. Difficulty scales with the target's value/power.
 *
 * Replaces `HackableComponent` from the Miniplex types.
 */
export interface HackableSchema {
  /**
   * Compute cost to fully hack this entity.
   * Higher = more powerful machines, boss enemies.
   */
  difficulty: number;
  /**
   * Current hack progress as a fraction 0..1.
   * Advances each tick while beingHacked is true, at a rate
   * determined by the player's available compute.
   */
  progress: number;
  /** Whether a hacking attempt is currently in progress */
  beingHacked: boolean;
  /**
   * Whether this entity has been fully hacked and is now player-controlled.
   * Once hacked, the entity's Faction switches to "player" and it can be
   * given automation routines.
   */
  hacked: boolean;
}

// ---------------------------------------------------------------------------
// Signal network
// ---------------------------------------------------------------------------

/**
 * SignalRelay — a node in the signal/compute network.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `connectedTo` is a variable-length array.
 *
 * Signal relays extend the player's hacking and control range. The signal
 * network is a BFS graph: entities can only be hacked if they are within
 * range of a relay connected to the player's network.
 *
 * Replaces `SignalRelayComponent` from the Miniplex types.
 *
 * Note: `connectedTo` uses string IDs for now. Future optimization could
 * replace this with a `ConnectedTo` relation, but BFS traversal with
 * relations requires more Koota API exploration.
 */
export interface SignalRelaySchema {
  /** Maximum signal range in world units */
  range: number;
  /**
   * Entity IDs of other relays this node is connected to.
   * Connections are bidirectional — if A connects to B, B connects to A.
   */
  connectedTo: string[];
  /**
   * Signal strength at this node as a fraction 0..1.
   * Degrades with distance from the source. Below a threshold,
   * hacking speed is reduced.
   */
  signalStrength: number;
}

// ---------------------------------------------------------------------------
// Automation (bot behavior)
// ---------------------------------------------------------------------------

/**
 * Automation — defines the behavioral routine a bot follows when not
 * directly commanded by the player.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `patrolPoints` is a variable-length array.
 *
 * Replaces `AutomationComponent` from the Miniplex types.
 * Extended with "carry_cubes" and "build_wall" routines for the factory layer.
 *
 * Target references (followTarget, workTarget) use relations instead of
 * string IDs — see FollowTarget and WorkTarget relations below.
 */
export interface AutomationSchema {
  /** Current behavioral routine */
  routine: AutomationRoutine;
  /**
   * Entity ID of the target to follow (for "follow" routine).
   *
   * Note: This is kept as a string for the schema definition, but in the
   * actual Koota implementation this would be replaced by the FollowTarget
   * relation. Kept here for documentation clarity.
   */
  followTarget: string | null;
  /**
   * Waypoints for the "patrol" routine.
   * The bot visits each point in sequence, then loops back to the first.
   */
  patrolPoints: PositionSchema[];
  /**
   * Entity ID of the work target (for "work", "carry_cubes", "build_wall" routines).
   * Could be a miner to tend, a hopper to fill, or a grid position to build at.
   *
   * Note: Like followTarget, this would be a WorkTarget relation in practice.
   */
  workTarget: string | null;
}

/**
 * FollowTarget — relation from a bot to the entity it is following.
 *
 * Koota: `relation({ exclusive: true })` — a bot follows at most one target.
 *
 * Usage: `botEntity.add(FollowTarget(leaderEntity))`
 * Traverse: `entity.targetsFor(FollowTarget)[0]`
 *
 * Replaces `AutomationComponent.followTarget: string | null`.
 */
export type FollowTargetRelation = "relation({ exclusive: true })";

/**
 * WorkTarget — relation from a bot to the entity it is working on/at.
 *
 * Koota: `relation({ exclusive: true })` — a bot works on at most one target.
 *
 * Usage: `botEntity.add(WorkTarget(minerEntity))`
 * Traverse: `entity.targetsFor(WorkTarget)[0]`
 *
 * Replaces `AutomationComponent.workTarget: string | null`.
 */
export type WorkTargetRelation = "relation({ exclusive: true })";

// ---------------------------------------------------------------------------
// Wildlife — otters
// ---------------------------------------------------------------------------

/**
 * Otter — small furry wildlife that wanders the ruins.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `lines` is a variable-length array.
 *
 * Otters serve as ambient wildlife and quest-givers during the onboarding
 * tutorial. Stationary otters display dialogue lines when a player unit
 * is nearby.
 *
 * Replaces `OtterComponent` from the Miniplex types.
 * Added `questIndex` to track multi-step quest progression.
 */
export interface OtterSchema {
  /** Movement speed in world units per second */
  speed: number;
  /**
   * Timer for wander behavior — counts down and picks a new direction
   * when it reaches 0. In seconds.
   */
  wanderTimer: number;
  /**
   * When true, the otter stays in place. Used for quest-giver otters
   * that stand at fixed locations.
   */
  stationary: boolean;
  /**
   * Dialogue lines shown in a speech bubble when a player unit is nearby.
   * Displayed sequentially as the player interacts.
   */
  lines: string[];
  /**
   * Current quest step index for quest-giver otters.
   * Advances when the player completes the associated task.
   * -1 or 0 for non-quest otters.
   */
  questIndex: number;
}

// ---------------------------------------------------------------------------
// Holograms
// ---------------------------------------------------------------------------

/**
 * Hologram — a holographic projection displayed by an emitter entity.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form).
 *
 * Holograms are visual-only entities that render as translucent, flickering
 * sprites or 3D meshes. They are linked to a source emitter entity via
 * the HologramSource relation.
 *
 * Simplified from the Miniplex HologramComponent — animation state and
 * flicker are now handled by the rendering system, not stored as ECS data.
 */
export interface HologramSchema {
  /**
   * Entity ID of the emitter that projects this hologram.
   *
   * Note: In the Koota implementation, this would be replaced by the
   * HologramSource relation. Kept as a string here for schema clarity.
   */
  sourceEmitterId: string;
  /**
   * Emissive color as a CSS hex string (e.g., "#00ff88").
   * Determines the hologram's glow color.
   */
  emissiveColor: string;
}

/**
 * HologramSource — relation from a hologram entity to its emitter.
 *
 * Koota: `relation({ exclusive: true })` — a hologram has exactly one source.
 *
 * Usage: `hologramEntity.add(HologramSource(emitterEntity))`
 * Traverse: `entity.targetsFor(HologramSource)[0]`
 *
 * Replaces `HologramComponent.linkedEntityId: string | null`.
 */
export type HologramSourceRelation = "relation({ exclusive: true })";

// ---------------------------------------------------------------------------
// Civilization-level AI
// ---------------------------------------------------------------------------

/**
 * CivilizationGovernor — AI director trait for NPC faction entities.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `evaluatorWeights` is a dynamic map.
 *
 * Each NPC faction (reclaimers, volt_collective, signal_choir, iron_creed)
 * has one CivilizationGovernor entity that makes high-level strategic
 * decisions: where to expand, what to build, who to attack or trade with.
 *
 * This is a new trait with no Miniplex predecessor. It enables emergent
 * faction behavior: the AI evaluates weighted goals and issues directives
 * to its subordinate units.
 *
 * The governor entity itself does not need a Position — it is a logical
 * entity that could be implemented as a world trait per faction, but
 * keeping it as an entity allows the governor to be "hacked" or disrupted
 * by the player (destroying a faction's command center disables its governor).
 */
export interface CivilizationGovernorSchema {
  /**
   * Which faction this governor controls.
   * Must match a FactionId from core.ts.
   */
  civId: string;
  /**
   * Weighted importance of different strategic goals.
   * Keys are goal names (e.g., "expand_territory", "gather_resources",
   * "attack_player", "defend_base", "trade", "research").
   * Values are 0..1 weights that shift based on game state.
   *
   * The AI evaluation loop scores each possible action against these weights
   * and picks the highest-scoring option.
   */
  evaluatorWeights: Record<string, number>;
  /**
   * Currently active high-level goal, or null if idle.
   * E.g., "expand_territory", "attack_player", "defend_base".
   * Subordinate units receive directives derived from this goal.
   */
  currentGoal: string | null;
}

// ---------------------------------------------------------------------------
// Koota trait + relation declarations (pseudocode)
// ---------------------------------------------------------------------------
//
// import { trait, relation } from 'koota';
//
// // --- Hacking ---
// export const Hackable = trait({
//   difficulty: 5,
//   progress: 0,
//   beingHacked: false,
//   hacked: false,
// });
//
// // --- Signal ---
// export const SignalRelay = trait(() => ({
//   range: 10,
//   connectedTo: [] as string[],
//   signalStrength: 1,
// }));
//
// // --- Automation ---
// export const Automation = trait(() => ({
//   routine: 'idle' as AutomationRoutine,
//   followTarget: null as string | null,
//   patrolPoints: [] as PositionSchema[],
//   workTarget: null as string | null,
// }));
//
// export const FollowTarget = relation({ exclusive: true });
// export const WorkTarget   = relation({ exclusive: true });
//
// // --- Otter ---
// export const Otter = trait(() => ({
//   speed: 1.5,
//   wanderTimer: 4,
//   stationary: false,
//   lines: [] as string[],
//   questIndex: 0,
// }));
//
// // --- Hologram ---
// export const Hologram = trait(() => ({
//   sourceEmitterId: '' as string,
//   emissiveColor: '#00ff88',
// }));
//
// export const HologramSource = relation({ exclusive: true });
//
// // --- Civilization ---
// export const CivilizationGovernor = trait(() => ({
//   civId: '' as string,
//   evaluatorWeights: {} as Record<string, number>,
//   currentGoal: null as string | null,
// }));

// ---------------------------------------------------------------------------
// Queries that would use these traits
// ---------------------------------------------------------------------------
//
// --- Hacking ---
//
// All hackable entities (for UI overlay showing hack difficulty):
//   world.query(Hackable, Position)
//
// Entities currently being hacked (for progress tick):
//   world.query(Hackable, Position)
//     .updateEach(([h, p]) => { if (h.beingHacked) h.progress += ... })
//
// Entities whose hack state changed (for UI/SFX update):
//   world.query(Changed(Hackable))
//
// Newly hacked entities (for faction-switch + celebration):
//   world.query(Hackable)
//     .updateEach(([h]) => { if (h.hacked && h.progress >= 1) ... })
//
// --- Signal ---
//
// All signal relays (for network BFS):
//   world.query(SignalRelay, Position)
//
// Relays with degraded signal (for visual indicator):
//   world.query(SignalRelay, Position)
//     .updateEach(([sr, p]) => { if (sr.signalStrength < 0.5) ... })
//
// --- Automation ---
//
// All bots with automation (for behavior tick):
//   world.query(Automation, Position)
//
// Bots following a target (for follow-behavior system):
//   world.query(Automation, FollowTarget('*'), Position)
//
// Idle bots (for reassignment by the governor or player):
//   world.query(Automation)
//     .updateEach(([a]) => { if (a.routine === 'idle') ... })
//
// Bots carrying cubes (for logistics system):
//   world.query(Automation, Position)
//     .updateEach(([a, p]) => { if (a.routine === 'carry_cubes') ... })
//
// --- Otters ---
//
// All otters (for wander behavior tick):
//   world.query(Otter, Position)
//
// Quest-giver otters (for dialogue proximity check):
//   world.query(Otter, Position)
//     .updateEach(([o, p]) => { if (o.stationary && o.lines.length > 0) ... })
//
// --- Holograms ---
//
// All holograms (for flicker rendering):
//   world.query(Hologram, Position)
//
// Holograms linked to a source (for visibility toggle when emitter is destroyed):
//   world.query(Hologram, HologramSource('*'))
//
// --- Civilization ---
//
// All faction governors (for strategic AI tick):
//   world.query(CivilizationGovernor)
//
// Governor whose goal changed (for directive propagation):
//   world.query(Changed(CivilizationGovernor))
//
// Bots belonging to a specific governor's faction (for directive execution):
//   world.query(Automation, Faction)
//     .updateEach(([a, f]) => { if (f.value === governor.civId) ... })
