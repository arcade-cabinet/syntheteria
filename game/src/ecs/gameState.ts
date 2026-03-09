/**
 * Global game state and simulation tick manager.
 * Bridges ECS mutable state to React via useSyncExternalStore.
 */
import { explorationSystem } from "../systems/exploration"
import { fragmentMergeSystem, type MergeEvent } from "../systems/fragmentMerge"
import { powerSystem, getPowerSnapshot, type PowerSnapshot } from "../systems/power"
import { resourceSystem, getResources, type ResourcePool } from "../systems/resources"
import { repairSystem } from "../systems/repair"
import { fabricationSystem, getActiveJobs, type FabricationJob } from "../systems/fabrication"
import { enemySystem } from "../systems/enemies"
import { combatSystem, getLastCombatEvents, type CombatEvent } from "../systems/combat"
import { otterSystem } from "../systems/otters"
import { getAllFragments, updateDisplayOffsets, type MapFragment } from "./terrain"
import { units } from "./world"

export interface GameSnapshot {
  tick: number
  gameSpeed: number
  paused: boolean
  fragments: MapFragment[]
  unitCount: number
  enemyCount: number
  mergeEvents: MergeEvent[]
  combatEvents: CombatEvent[]
  power: PowerSnapshot
  resources: ResourcePool
  fabricationJobs: FabricationJob[]
}

let tick = 0
let gameSpeed = 1.0
let paused = false
let lastMergeEvents: MergeEvent[] = []
let listeners = new Set<() => void>()
let snapshot: GameSnapshot | null = null

function buildSnapshot(): GameSnapshot {
  let playerCount = 0
  let enemyCount = 0
  for (const u of units) {
    if (u.faction === "player") playerCount++
    else enemyCount++
  }
  return {
    tick,
    gameSpeed,
    paused,
    fragments: getAllFragments(),
    unitCount: playerCount,
    enemyCount,
    mergeEvents: lastMergeEvents,
    combatEvents: getLastCombatEvents(),
    power: getPowerSnapshot(),
    resources: getResources(),
    fabricationJobs: getActiveJobs(),
  }
}

export function getGameSpeed(): number {
  return paused ? 0 : gameSpeed
}

export function setGameSpeed(speed: number) {
  gameSpeed = Math.max(0.5, Math.min(4, speed))
  snapshot = null
  notify()
}

export function togglePause() {
  paused = !paused
  snapshot = null
  notify()
}

export function isPaused(): boolean {
  return paused
}

/**
 * Run one simulation tick. Called at fixed intervals adjusted by game speed.
 */
export function simulationTick() {
  if (paused) return

  tick++

  explorationSystem()
  lastMergeEvents = fragmentMergeSystem()
  powerSystem(tick)
  resourceSystem()
  repairSystem()
  fabricationSystem()
  enemySystem()
  combatSystem()
  otterSystem()
  updateDisplayOffsets()

  snapshot = null
  notify()
}

function notify() {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): GameSnapshot {
  if (!snapshot) {
    snapshot = buildSnapshot()
  }
  return snapshot
}
