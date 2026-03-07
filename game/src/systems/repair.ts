/**
 * Unit repair system.
 *
 * A unit with functional arms can repair broken components on
 * an adjacent unit, consuming resources from the global pool.
 *
 * Repair costs depend on the component's material type.
 */
import { units } from "../ecs/world"
import { hasArms } from "../ecs/types"
import { spendResource, type ResourcePool } from "./resources"
import type { Entity, UnitComponent } from "../ecs/types"

/** Repair range — units must be within this distance */
const REPAIR_RANGE = 3.0

/** Material cost to repair one component */
const REPAIR_COSTS: Record<UnitComponent["material"], { type: keyof ResourcePool; amount: number }> = {
  metal: { type: "scrapMetal", amount: 3 },
  plastic: { type: "scrapMetal", amount: 1 },
  electronic: { type: "eWaste", amount: 2 },
}

export interface RepairAction {
  repairerId: string
  targetId: string
  componentName: string
  ticksRemaining: number
  totalTicks: number
}

const activeRepairs: RepairAction[] = []

export function getActiveRepairs(): RepairAction[] {
  return [...activeRepairs]
}

/**
 * Start repairing a component on a target unit.
 * Returns true if repair was started successfully.
 */
export function startRepair(
  repairer: Entity,
  target: Entity,
  componentName: string
): boolean {
  // Validate repairer has arms
  if (!hasArms(repairer)) return false

  // Validate distance
  const dx = repairer.worldPosition.x - target.worldPosition.x
  const dz = repairer.worldPosition.z - target.worldPosition.z
  const dist = Math.sqrt(dx * dx + dz * dz)
  if (dist > REPAIR_RANGE) return false

  // Find the broken component
  const comp = target.unit.components.find(
    c => c.name === componentName && !c.functional
  )
  if (!comp) return false

  // Check and spend resources
  const cost = REPAIR_COSTS[comp.material]
  if (!spendResource(cost.type, cost.amount)) return false

  // Already repairing?
  const existing = activeRepairs.find(
    r => r.targetId === target.id && r.componentName === componentName
  )
  if (existing) return false

  // Start repair (takes 5 ticks)
  activeRepairs.push({
    repairerId: repairer.id,
    targetId: target.id,
    componentName,
    ticksRemaining: 5,
    totalTicks: 5,
  })

  return true
}

/**
 * Repair system tick. Advances active repairs.
 */
export function repairSystem() {
  for (let i = activeRepairs.length - 1; i >= 0; i--) {
    const repair = activeRepairs[i]
    repair.ticksRemaining--

    if (repair.ticksRemaining <= 0) {
      // Find target and fix the component
      for (const unit of units) {
        if (unit.id === repair.targetId) {
          const comp = unit.unit.components.find(
            c => c.name === repair.componentName && !c.functional
          )
          if (comp) {
            comp.functional = true
          }
          break
        }
      }
      activeRepairs.splice(i, 1)
    }
  }
}
