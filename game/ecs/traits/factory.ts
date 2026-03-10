/**
 * Factory ECS Traits — conveyor belts, wires, miners, and processors.
 *
 * This is the core of the factory-planet automation layer. Entities in this
 * file form the logistic and processing backbone: belts carry material cubes,
 * wires distribute power and signal, miners extract ore, and processors
 * transform raw materials.
 *
 * Koota features used:
 *   - trait() with callback → AoS storage for complex data
 *   - trait() with schema object → SoA storage for flat numerics
 *   - relation() → first-class entity-to-entity references
 *     - { exclusive: true }   — at most one target per relation per entity
 *     - { autoRemoveTarget: true } — destroying source also destroys target
 *
 * Migration notes:
 *   - BeltComponent.nextBeltId/prevBeltId (string IDs) → NextBelt/PrevBelt relations
 *   - WireComponent.fromEntityId/toEntityId (string IDs) → ConnectsFrom/ConnectsTo relations
 *   - MinerComponent.outputBeltId (string ID) → OutputBelt relation
 *   - ProcessorComponent.inputBeltId/outputBeltId → InputBelt/OutputBelt relations
 */

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/** Cardinal direction a belt segment pushes items toward */
export type BeltDirection = "north" | "south" | "east" | "west";

/** Belt speed tier — determines items-per-second throughput */
export type BeltTier = "basic" | "fast" | "express";

/** Wire purpose — power cables vs. signal/data cables */
export type WireType = "power" | "signal";

/** Processor archetype — determines which recipes it can run */
export type ProcessorType = "smelter" | "refiner" | "separator";

// ---------------------------------------------------------------------------
// Belt traits + relations
// ---------------------------------------------------------------------------

/**
 * Belt — a single conveyor belt segment.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `carrying` is a nullable reference.
 *
 * Belts form chains via NextBelt/PrevBelt relations. Items (material cubes)
 * ride on belts and progress from 0 to 1 before transferring to the next
 * segment. If there is no NextBelt, items pile up at the end.
 *
 * Replaces `BeltComponent` from the Miniplex types.
 */
export interface BeltSchema {
  /** Direction this belt pushes items */
  direction: BeltDirection;
  /** Transport speed in items per second (from belt tier config) */
  speed: number;
  /** Speed/quality tier of this belt segment */
  tier: BeltTier;
  /**
   * Material type string of the item currently on this segment,
   * or null if the belt is empty. E.g., "scrap_metal", "copper_ingot".
   */
  carrying: string | null;
  /**
   * Progress of the carried item along this segment, 0..1.
   * When it reaches 1, the item transfers to the NextBelt (if any).
   */
  itemProgress: number;
}

/**
 * NextBelt — relation from a belt entity to the next belt in the chain.
 *
 * Koota: `relation({ exclusive: true })` — a belt has at most one "next".
 *
 * Usage: `beltEntity.add(NextBelt(nextBeltEntity))`
 * Query: `world.query(Belt, NextBelt('*'))` — all belts that have a successor
 * Traverse: `entity.targetsFor(NextBelt)[0]` — get the next belt entity
 *
 * Replaces `BeltComponent.nextBeltId: string | null`.
 */
export type NextBeltRelation = "relation({ exclusive: true })";

/**
 * PrevBelt — relation from a belt entity to the previous belt in the chain.
 *
 * Koota: `relation({ exclusive: true })` — a belt has at most one predecessor.
 *
 * Usage: `beltEntity.add(PrevBelt(prevBeltEntity))`
 * Traverse: `entity.targetsFor(PrevBelt)[0]`
 *
 * Replaces `BeltComponent.prevBeltId: string | null`.
 */
export type PrevBeltRelation = "relation({ exclusive: true })";

/**
 * InputFrom — relation from a machine (processor, hopper) to a belt that
 * feeds items into it.
 *
 * Koota: `relation({ exclusive: true })` — one input source per machine.
 *
 * Usage: `processorEntity.add(InputFrom(beltEntity))`
 * Traverse: `entity.targetsFor(InputFrom)[0]`
 *
 * Replaces `ProcessorComponent.inputBeltId: string | null`.
 */
export type InputFromRelation = "relation({ exclusive: true })";

/**
 * OutputTo — relation from a machine (miner, processor) to a belt that
 * receives its output.
 *
 * Koota: `relation({ exclusive: true })` — one output destination per machine.
 *
 * Usage: `minerEntity.add(OutputTo(beltEntity))`
 * Traverse: `entity.targetsFor(OutputTo)[0]`
 *
 * Replaces `MinerComponent.outputBeltId: string | null` and
 * `ProcessorComponent.outputBeltId: string | null`.
 */
export type OutputToRelation = "relation({ exclusive: true })";

// ---------------------------------------------------------------------------
// Wire traits + relations
// ---------------------------------------------------------------------------

/**
 * Wire — a power or signal cable connecting two entities.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form).
 *
 * Wires are their own entities with ConnectsFrom/ConnectsTo relations
 * pointing to the source and target entities. The power system BFS
 * traverses the wire graph via these relations.
 *
 * Replaces `WireComponent` from the Miniplex types.
 */
export interface WireSchema {
  /** Whether this wire carries power or signal data */
  type: WireType;
  /** Physical length in world units (affects power loss) */
  length: number;
  /** Maximum energy/signal throughput */
  maxCapacity: number;
  /** Current load as an absolute value (0..maxCapacity) */
  currentLoad: number;
}

/**
 * ConnectsFrom — relation from a wire entity to its source endpoint.
 *
 * Koota: `relation({ exclusive: true })` — a wire has exactly one source.
 *
 * Usage: `wireEntity.add(ConnectsFrom(sourceEntity))`
 * Traverse: `entity.targetsFor(ConnectsFrom)[0]`
 *
 * Replaces `WireComponent.fromEntityId: string`.
 */
export type ConnectsFromRelation = "relation({ exclusive: true })";

/**
 * ConnectsTo — relation from a wire entity to its target endpoint.
 *
 * Koota: `relation({ exclusive: true })` — a wire has exactly one target.
 *
 * Usage: `wireEntity.add(ConnectsTo(targetEntity))`
 * Traverse: `entity.targetsFor(ConnectsTo)[0]`
 *
 * Replaces `WireComponent.toEntityId: string`.
 */
export type ConnectsToRelation = "relation({ exclusive: true })";

// ---------------------------------------------------------------------------
// Miner trait
// ---------------------------------------------------------------------------

/**
 * Miner — a mining drill that extracts ore from terrain deposits.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form).
 *
 * Miners must be placed on an OreDeposit location. Their output goes
 * to a belt via the OutputTo relation. Drill health degrades over time
 * and must be repaired by a unit with arms.
 *
 * Replaces `MinerComponent` from the Miniplex types.
 * The `active` field moved into the Building trait's `operational` flag.
 */
export interface MinerSchema {
  /**
   * What resource this miner extracts (e.g., "scrap_metal", "copper", "rare_alloy").
   * Determined by the OreDeposit it is placed on.
   */
  resourceType: string;
  /**
   * Extraction rate in items per game tick.
   * Pulled from config/mining.json based on resourceType.
   */
  extractionRate: number;
  /**
   * Drill component health as a fraction 0..1.
   * Degrades with each extraction cycle; at 0 the miner stops until repaired.
   */
  drillHealth: number;
}

/**
 * InputBelt — relation from a processor to the belt that feeds raw materials in.
 *
 * Koota: `relation({ exclusive: true })` — a processor has one input belt.
 *
 * Alias for InputFrom, kept explicit for processor context.
 * Usage: `processorEntity.add(InputBelt(beltEntity))`
 */
export type InputBeltRelation = "relation({ exclusive: true })";

/**
 * OutputBelt — relation from a processor/miner to the belt that receives output.
 *
 * Koota: `relation({ exclusive: true })` — a machine has one output belt.
 *
 * Alias for OutputTo, kept explicit for processor context.
 * Usage: `processorEntity.add(OutputBelt(beltEntity))`
 */
export type OutputBeltRelation = "relation({ exclusive: true })";

// ---------------------------------------------------------------------------
// Processor trait
// ---------------------------------------------------------------------------

/**
 * Processor — transforms raw materials into refined products.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form).
 *
 * Processors pull items from InputBelt, process them over `speed` ticks,
 * and push the result to OutputBelt. Requires power (via Building.powered).
 *
 * Replaces `ProcessorComponent` from the Miniplex types.
 */
export interface ProcessorSchema {
  /** Processor archetype — determines available recipes */
  type: ProcessorType;
  /**
   * Currently active recipe key (e.g., "smelt_scrap", "refine_ewaste"),
   * or null if no recipe is set.
   * Maps to a key in config/processing.json.
   */
  recipe: string | null;
  /** Processing progress as a fraction 0..1 */
  progress: number;
  /** Number of game ticks to complete one recipe cycle */
  speed: number;
  /** Whether this processor is actively running a recipe */
  active: boolean;
}

// ---------------------------------------------------------------------------
// Koota trait + relation declarations (pseudocode)
// ---------------------------------------------------------------------------
//
// import { trait, relation } from 'koota';
//
// // --- Belt ---
// export const Belt = trait(() => ({
//   direction: 'north' as BeltDirection,
//   speed: 1,
//   tier: 'basic' as BeltTier,
//   carrying: null as string | null,
//   itemProgress: 0,
// }));
//
// export const NextBelt   = relation({ exclusive: true });
// export const PrevBelt   = relation({ exclusive: true });
// export const InputFrom  = relation({ exclusive: true });
// export const OutputTo   = relation({ exclusive: true });
//
// // --- Wire ---
// export const Wire = trait(() => ({
//   type: 'power' as WireType,
//   length: 0,
//   maxCapacity: 10,
//   currentLoad: 0,
// }));
//
// export const ConnectsFrom = relation({ exclusive: true });
// export const ConnectsTo   = relation({ exclusive: true });
//
// // --- Miner ---
// export const Miner = trait(() => ({
//   resourceType: 'scrap_metal' as string,
//   extractionRate: 1,
//   drillHealth: 1,
// }));
//
// // --- Processor ---
// export const Processor = trait(() => ({
//   type: 'smelter' as ProcessorType,
//   recipe: null as string | null,
//   progress: 0,
//   speed: 60,
//   active: false,
// }));
//
// // Shared relations for processor I/O
// export const InputBelt  = relation({ exclusive: true });
// export const OutputBelt = relation({ exclusive: true });

// ---------------------------------------------------------------------------
// Queries that would use these traits
// ---------------------------------------------------------------------------
//
// All belt segments:
//   world.query(Belt, Position)
//
// Belts carrying items (for transport system tick):
//   world.query(Belt, Position)
//     .updateEach(([belt, pos]) => { if (belt.carrying) ... })
//
// Belt chain traversal (belts with a successor):
//   world.query(Belt, NextBelt('*'))
//
// Terminal belts (no successor — items pile up here):
//   world.query(Belt, Not(NextBelt('*')))
//
// All wires in the power network:
//   world.query(Wire, ConnectsFrom('*'), ConnectsTo('*'))
//     .updateEach(([wire], entity) => {
//       const src = entity.targetsFor(ConnectsFrom)[0];
//       const dst = entity.targetsFor(ConnectsTo)[0];
//       // BFS power distribution
//     })
//
// Power wires only:
//   world.query(Wire).updateEach(([w]) => { if (w.type === 'power') ... })
//
// Active miners (for extraction tick):
//   world.query(Miner, Building, Position)
//     .updateEach(([miner, building, pos]) => {
//       if (!building.powered || !building.operational) return;
//       // extract resources
//     })
//
// Processors currently running a recipe:
//   world.query(Processor, Building)
//     .updateEach(([proc, building]) => {
//       if (proc.active && building.powered) { proc.progress += ... }
//     })
//
// Processors whose progress changed (for UI update):
//   world.query(Changed(Processor))
//
// Miners with degraded drill health (for repair prioritization):
//   world.query(Miner, Position)
//     .updateEach(([m, p]) => { if (m.drillHealth < 0.3) ... })
