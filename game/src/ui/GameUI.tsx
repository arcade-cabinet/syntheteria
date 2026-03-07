/**
 * DOM overlay UI: resource bar, power info, speed controls, build toolbar,
 * unit info, combat log, minimap.
 */
import { useState } from "react"
import { useSyncExternalStore } from "react"
import {
  subscribe,
  getSnapshot,
  setGameSpeed,
  togglePause,
} from "../ecs/gameState"
import { units, buildings } from "../ecs/world"
import { WORLD_HALF } from "../ecs/terrain"
import {
  getActivePlacement,
  setActivePlacement,
  BUILDING_COSTS,
  type PlaceableType,
} from "../systems/buildingPlacement"
import { startRepair } from "../systems/repair"
import { startFabrication, RECIPES } from "../systems/fabrication"
import type { UnitComponent, Entity } from "../ecs/types"

function ComponentStatus({ comp }: { comp: UnitComponent }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: comp.functional ? "#00ff88" : "#ff4444",
          boxShadow: comp.functional
            ? "0 0 4px #00ff88"
            : "0 0 4px #ff4444",
        }}
      />
      <span style={{ textTransform: "capitalize" }}>
        {comp.name.replace(/_/g, " ")}
      </span>
      {!comp.functional && (
        <span style={{ color: "#ff4444", fontSize: "11px" }}>BROKEN</span>
      )}
    </div>
  )
}

function BuildToolbar() {
  const active = getActivePlacement()
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  const items: { type: PlaceableType; label: string }[] = [
    { type: "lightning_rod", label: "ROD" },
    { type: "fabrication_unit", label: "FAB" },
  ]

  return (
    <div
      style={{
        position: "absolute",
        right: "16px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "auto",
      }}
    >
      {items.map(({ type, label }) => {
        const isActive = active === type
        const costs = BUILDING_COSTS[type!]
        const canAfford = costs.every(c => snap.resources[c.type] >= c.amount)

        return (
          <button
            key={type}
            onClick={() => setActivePlacement(isActive ? null : type)}
            title={costs.map(c => `${c.amount} ${c.type}`).join(", ")}
            style={{
              background: isActive ? "rgba(0,255,170,0.2)" : "rgba(0,0,0,0.7)",
              color: canAfford ? "#00ffaa" : "#00ffaa44",
              border: isActive ? "2px solid #00ffaa" : "1px solid #00ffaa44",
              borderRadius: "6px",
              padding: "10px 8px",
              fontSize: "11px",
              fontFamily: "'Courier New', monospace",
              cursor: canAfford ? "pointer" : "default",
              minWidth: "50px",
              textAlign: "center",
              letterSpacing: "0.1em",
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function RepairPanel({ selectedUnit }: { selectedUnit: Entity }) {
  const brokenComps = selectedUnit.unit.components.filter(c => !c.functional)
  if (brokenComps.length === 0) return null

  // Find a nearby unit with arms to be the repairer
  const allUnits = Array.from(units)
  const repairer = allUnits.find(u => {
    if (u.id === selectedUnit.id) return false
    if (u.faction !== "player") return false
    if (!u.unit.components.some(c => c.name === "arms" && c.functional)) return false
    const dx = u.worldPosition.x - selectedUnit.worldPosition.x
    const dz = u.worldPosition.z - selectedUnit.worldPosition.z
    return Math.sqrt(dx * dx + dz * dz) < 3.0
  })

  if (!repairer) return null

  return (
    <div style={{ marginTop: "8px", borderTop: "1px solid #00ffaa22", paddingTop: "6px" }}>
      <div style={{ fontSize: "11px", color: "#00ffaa88", marginBottom: "4px" }}>
        REPAIR ({repairer.unit.displayName} nearby)
      </div>
      {brokenComps.map((comp, i) => (
        <button
          key={i}
          onClick={() => startRepair(repairer, selectedUnit, comp.name)}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: "rgba(255,68,68,0.1)",
            color: "#ff8866",
            border: "1px solid #ff444444",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            fontFamily: "'Courier New', monospace",
            cursor: "pointer",
            marginBottom: "3px",
          }}
        >
          Fix {comp.name.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  )
}

function BuildingRepairPanel({ selectedBuilding }: { selectedBuilding: Entity }) {
  const brokenComps = selectedBuilding.building.components.filter(c => !c.functional)
  if (brokenComps.length === 0) return null

  // Find a nearby player unit with arms to be the repairer
  const allUnits = Array.from(units)
  const repairer = allUnits.find(u => {
    if (u.faction !== "player") return false
    if (!u.unit.components.some(c => c.name === "arms" && c.functional)) return false
    const dx = u.worldPosition.x - selectedBuilding.worldPosition.x
    const dz = u.worldPosition.z - selectedBuilding.worldPosition.z
    return Math.sqrt(dx * dx + dz * dz) < 3.0
  })

  return (
    <div style={{ marginTop: "8px", borderTop: "1px solid #00ffaa22", paddingTop: "6px" }}>
      <div style={{ fontSize: "11px", color: "#00ffaa88", marginBottom: "4px" }}>
        REPAIR {repairer ? `(${repairer.unit.displayName} nearby)` : "(no unit with arms nearby)"}
      </div>
      {brokenComps.map((comp, i) => (
        <button
          key={i}
          onClick={() => repairer && startRepair(repairer, selectedBuilding, comp.name)}
          disabled={!repairer}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            background: repairer ? "rgba(255,68,68,0.1)" : "transparent",
            color: repairer ? "#ff8866" : "#ff886644",
            border: "1px solid #ff444444",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "11px",
            fontFamily: "'Courier New', monospace",
            cursor: repairer ? "pointer" : "default",
            marginBottom: "3px",
          }}
        >
          Fix {comp.name.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  )
}

function InlineFabricationPanel({ fabricator }: { fabricator: Entity }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  const [expanded, setExpanded] = useState(false)
  const isPowered = fabricator.building?.powered && fabricator.building?.operational

  // Active jobs for this fabricator
  const myJobs = snap.fabricationJobs.filter(j => j.fabricatorId === fabricator.id)

  return (
    <div style={{ marginTop: "8px", borderTop: "1px solid #aa884422", paddingTop: "6px" }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", color: "#aa8844", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}
      >
        FABRICATION {expanded ? "[-]" : "[+]"}
      </div>

      {myJobs.length > 0 && (
        <div style={{ color: "#00ffaa88", fontSize: "11px", marginBottom: "4px" }}>
          {myJobs.map((job, i) => (
            <div key={i}>
              {job.recipe.name}: {job.ticksRemaining}t remaining
            </div>
          ))}
        </div>
      )}

      {expanded && isPowered && (
        <div style={{ marginTop: "4px" }}>
          {RECIPES.map((recipe) => {
            const canAfford = recipe.costs.every(c => snap.resources[c.type] >= c.amount)
            return (
              <button
                key={recipe.name}
                onClick={() => startFabrication(fabricator, recipe.name)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: canAfford ? "rgba(170,136,68,0.1)" : "transparent",
                  color: canAfford ? "#aa8844" : "#aa884444",
                  border: "1px solid #aa884433",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontFamily: "'Courier New', monospace",
                  cursor: canAfford ? "pointer" : "default",
                  marginBottom: "3px",
                }}
                title={recipe.costs.map(c => `${c.amount} ${c.type}`).join(", ")}
              >
                {recipe.name} ({recipe.buildTime}t)
              </button>
            )
          })}
        </div>
      )}

      {expanded && !isPowered && (
        <div style={{ color: "#ff444488", fontSize: "11px" }}>
          Requires power to fabricate
        </div>
      )}
    </div>
  )
}

function FabricationPanel() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  const [expanded, setExpanded] = useState(false)

  // Find a powered fabrication unit
  const fabricator = Array.from(buildings).find(
    b => b.building.type === "fabrication_unit" && b.building.powered && b.building.operational
  )

  if (!fabricator) return null

  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        left: "250px",
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid #aa884444",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "12px",
        pointerEvents: "auto",
        minWidth: "180px",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: "pointer", color: "#aa8844", fontWeight: "bold", marginBottom: "4px" }}
      >
        FABRICATOR {expanded ? "[-]" : "[+]"}
      </div>

      {/* Active jobs */}
      {snap.fabricationJobs.length > 0 && (
        <div style={{ color: "#00ffaa88", fontSize: "11px", marginBottom: "4px" }}>
          {snap.fabricationJobs.map((job, i) => (
            <div key={i}>
              {job.recipe.name}: {job.ticksRemaining}t remaining
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: "4px" }}>
          {RECIPES.map((recipe) => {
            const canAfford = recipe.costs.every(c => snap.resources[c.type] >= c.amount)
            return (
              <button
                key={recipe.name}
                onClick={() => startFabrication(fabricator, recipe.name)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: canAfford ? "rgba(170,136,68,0.1)" : "transparent",
                  color: canAfford ? "#aa8844" : "#aa884444",
                  border: "1px solid #aa884433",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontFamily: "'Courier New', monospace",
                  cursor: canAfford ? "pointer" : "default",
                  marginBottom: "3px",
                }}
                title={recipe.costs.map(c => `${c.amount} ${c.type}`).join(", ")}
              >
                {recipe.name} ({recipe.buildTime}t)
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function GameUI() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  const selectedUnit = Array.from(units).find((u) => u.unit.selected)
  // Only show building panel for pure buildings (not fabrication units, which show in unit panel)
  const selectedBuilding = Array.from(buildings).find(
    (b) => b.building.selected && !("unit" in b)
  )
  const fragmentCount = snap.fragments.length
  const buildingCount = Array.from(buildings).length

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "'Courier New', monospace",
        color: "#00ffaa",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 12px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
          pointerEvents: "auto",
          flexWrap: "wrap",
          gap: "4px 0",
        }}
      >
        <div style={{ display: "flex", gap: "16px", fontSize: "13px", alignItems: "center" }}>
          <span>UNITS: {snap.unitCount}</span>
          <span>BLDG: {buildingCount}</span>
          {snap.enemyCount > 0 && (
            <span style={{ color: "#ff4444" }}>HOSTILE: {snap.enemyCount}</span>
          )}
          <span>FRAG: {fragmentCount}</span>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button onClick={() => setGameSpeed(0.5)} style={speedButtonStyle(snap.gameSpeed === 0.5)}>0.5x</button>
          <button onClick={() => setGameSpeed(1)} style={speedButtonStyle(snap.gameSpeed === 1)}>1x</button>
          <button onClick={() => setGameSpeed(2)} style={speedButtonStyle(snap.gameSpeed === 2)}>2x</button>
          <button onClick={togglePause} style={speedButtonStyle(snap.paused)}>
            {snap.paused ? "PLAY" : "PAUSE"}
          </button>
        </div>
      </div>

      {/* Resource bar */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          padding: "4px 12px 8px",
          fontSize: "11px",
          color: "#00ffaa99",
          pointerEvents: "auto",
        }}
      >
        <span title="Scrap Metal">SCRAP: {snap.resources.scrapMetal}</span>
        <span title="Electronic Waste">E-WASTE: {snap.resources.eWaste}</span>
        <span title="Intact Components">PARTS: {snap.resources.intactComponents}</span>
        <span style={{ color: stormColor(snap.power.stormIntensity) }} title="Storm Intensity">
          STORM: {(snap.power.stormIntensity * 100).toFixed(0)}%
        </span>
        <span title="Power Generation / Demand">
          PWR: {snap.power.totalGeneration.toFixed(0)}/{snap.power.totalDemand.toFixed(0)}
        </span>
      </div>

      {/* Selected unit info */}
      {selectedUnit && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid #00ffaa44",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            lineHeight: "1.6",
            minWidth: "220px",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "4px" }}>
            {selectedUnit.unit.displayName}
          </div>
          <div style={{ color: "#00ffaa88", fontSize: "11px", marginBottom: "6px" }}>
            {selectedUnit.unit.type.replace(/_/g, " ").toUpperCase()}
            {selectedUnit.faction !== "player" && (
              <span style={{ color: "#ff4444", marginLeft: "8px" }}>HOSTILE</span>
            )}
          </div>
          {selectedUnit.unit.speed > 0 && (
            <div>Speed: {selectedUnit.unit.speed.toFixed(1)}</div>
          )}
          {"building" in selectedUnit && (
            <div style={{ color: selectedUnit.building.powered ? "#00ff88" : "#ff4444" }}>
              {selectedUnit.building.powered ? "POWERED" : "UNPOWERED"}
              {" / "}
              {selectedUnit.building.operational ? "OPERATIONAL" : "OFFLINE"}
            </div>
          )}
          <div>
            Pos: ({selectedUnit.worldPosition.x.toFixed(1)},{" "}
            {selectedUnit.worldPosition.z.toFixed(1)})
          </div>

          <div
            style={{
              marginTop: "8px",
              borderTop: "1px solid #00ffaa22",
              paddingTop: "8px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#00ffaa88", marginBottom: "4px" }}>
              COMPONENTS
            </div>
            {selectedUnit.unit.components.map((comp, i) => (
              <ComponentStatus key={i} comp={comp} />
            ))}
          </div>

          {selectedUnit.faction === "player" && (
            <RepairPanel selectedUnit={selectedUnit} />
          )}

          {selectedUnit.unit.type === "fabrication_unit" && "building" in selectedUnit && (
            <InlineFabricationPanel fabricator={selectedUnit} />
          )}

          <div style={{ fontSize: "11px", color: "#00ffaa88", marginTop: "8px" }}>
            {selectedUnit.unit.speed > 0
              ? "Tap to select \u2022 Tap ground to move"
              : "Tap to select"}
          </div>
        </div>
      )}

      {/* Selected building info */}
      {selectedBuilding && (
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid #aa884444",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            lineHeight: "1.6",
            minWidth: "220px",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "4px", color: "#aa8844" }}>
            {selectedBuilding.building.type.replace(/_/g, " ").toUpperCase()}
          </div>
          <div style={{ color: "#aa884488", fontSize: "11px", marginBottom: "6px" }}>
            {selectedBuilding.building.powered ? "POWERED" : "UNPOWERED"}
            {" / "}
            {selectedBuilding.building.operational ? "OPERATIONAL" : "OFFLINE"}
          </div>
          <div>
            Pos: ({selectedBuilding.worldPosition.x.toFixed(1)},{" "}
            {selectedBuilding.worldPosition.z.toFixed(1)})
          </div>

          {selectedBuilding.building.components.length > 0 && (
            <div
              style={{
                marginTop: "8px",
                borderTop: "1px solid #aa884422",
                paddingTop: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#aa884488", marginBottom: "4px" }}>
                COMPONENTS
              </div>
              {selectedBuilding.building.components.map((comp, i) => (
                <ComponentStatus key={i} comp={comp} />
              ))}
            </div>
          )}

          {selectedBuilding.building.type === "lightning_rod" && selectedBuilding.lightningRod && (
            <div style={{ marginTop: "8px", borderTop: "1px solid #aa884422", paddingTop: "8px" }}>
              <div>Output: {selectedBuilding.lightningRod.currentOutput.toFixed(1)} / {selectedBuilding.lightningRod.rodCapacity}</div>
              <div>Radius: {selectedBuilding.lightningRod.protectionRadius}</div>
            </div>
          )}

          <BuildingRepairPanel selectedBuilding={selectedBuilding} />

          <div style={{ fontSize: "11px", color: "#aa884488", marginTop: "8px" }}>
            Tap to select
          </div>
        </div>
      )}

      {/* Combat notifications */}
      {snap.combatEvents.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "80px",
            right: "80px",
            background: "rgba(40, 0, 0, 0.85)",
            border: "1px solid #ff444466",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "11px",
            color: "#ff6644",
            maxWidth: "220px",
            pointerEvents: "none",
          }}
        >
          {snap.combatEvents.slice(0, 3).map((e, i) => (
            <div key={i}>
              {e.targetDestroyed
                ? `${e.targetId} DESTROYED`
                : `${e.targetId}: ${e.componentDamaged} damaged`}
            </div>
          ))}
        </div>
      )}

      {/* Merge event notification */}
      {snap.mergeEvents.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.9)",
            border: "2px solid #00ffaa",
            borderRadius: "12px",
            padding: "20px 32px",
            fontSize: "18px",
            textAlign: "center",
          }}
        >
          MAP FRAGMENTS MERGED
        </div>
      )}

      {/* Build toolbar */}
      <BuildToolbar />

      {/* Fabrication panel */}
      <FabricationPanel />

      {/* Minimap */}
      <Minimap />
    </div>
  )
}

function stormColor(intensity: number): string {
  if (intensity > 1.1) return "#ffaa00"
  if (intensity > 0.8) return "#00ffaa"
  return "#00ffaa66"
}

function Minimap() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        right: "16px",
        width: "120px",
        height: "120px",
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid #00ffaa44",
        borderRadius: "8px",
        overflow: "hidden",
        pointerEvents: "auto",
      }}
    >
      <canvas
        ref={(canvas) => {
          if (!canvas) return
          const ctx = canvas.getContext("2d")
          if (!ctx) return
          canvas.width = 120
          canvas.height = 120
          ctx.fillStyle = "#000"
          ctx.fillRect(0, 0, 120, 120)

          ctx.fillStyle = "#aa8844"
          for (const entity of buildings) {
            const x = 60 + (entity.worldPosition.x / WORLD_HALF) * 50
            const y = 60 + (entity.worldPosition.z / WORLD_HALF) * 50
            ctx.fillRect(x - 2, y - 2, 5, 5)
          }

          for (const entity of units) {
            const isEnemy = entity.faction !== "player"
            ctx.fillStyle = isEnemy ? "#ff3333" : "#ffaa00"
            const x = 60 + (entity.worldPosition.x / WORLD_HALF) * 50
            const y = 60 + (entity.worldPosition.z / WORLD_HALF) * 50
            ctx.fillRect(x - 1, y - 1, 3, 3)
          }
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}

function speedButtonStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "#00ffaa" : "transparent",
    color: active ? "#000" : "#00ffaa",
    border: "1px solid #00ffaa",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    minWidth: "44px",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }
}
