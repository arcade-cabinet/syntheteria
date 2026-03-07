/**
 * DOM overlay UI: resource bar, speed controls, unit info, minimap, narration.
 */
import { useSyncExternalStore } from "react"
import {
  subscribe,
  getSnapshot,
  setGameSpeed,
  togglePause,
} from "../ecs/gameState"
import { units } from "../ecs/world"

export function GameUI() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  const selectedUnit = Array.from(units).find((u) => u.unit.selected)
  const fragmentCount = snap.fragments.length

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
          padding: "12px 16px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
          pointerEvents: "auto",
        }}
      >
        <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
          <span>UNITS: {snap.unitCount}</span>
          <span>FRAGMENTS: {fragmentCount}</span>
          <span>TICK: {snap.tick}</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setGameSpeed(0.5)}
            style={speedButtonStyle(snap.gameSpeed === 0.5)}
          >
            0.5x
          </button>
          <button
            onClick={() => setGameSpeed(1)}
            style={speedButtonStyle(snap.gameSpeed === 1)}
          >
            1x
          </button>
          <button
            onClick={() => setGameSpeed(2)}
            style={speedButtonStyle(snap.gameSpeed === 2)}
          >
            2x
          </button>
          <button
            onClick={togglePause}
            style={speedButtonStyle(snap.paused)}
          >
            {snap.paused ? "PLAY" : "PAUSE"}
          </button>
        </div>
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
            minWidth: "200px",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "4px" }}>
            {selectedUnit.unit.type.replace(/_/g, " ").toUpperCase()}
          </div>
          <div>HP: {selectedUnit.unit.health}/{selectedUnit.unit.maxHealth}</div>
          <div>Speed: {selectedUnit.unit.speed}</div>
          <div>Camera: {selectedUnit.unit.hasCamerasSensor ? "YES" : "NO"}</div>
          <div>Fragment: {selectedUnit.mapFragment.fragmentId}</div>
          <div style={{ fontSize: "11px", color: "#00ffaa88", marginTop: "8px" }}>
            Tap ground → select &bull; Right-click → move
          </div>
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
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          MAP FRAGMENTS MERGED
        </div>
      )}

      {/* Narration / intro text */}
      {snap.tick < 5 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            fontSize: "16px",
            lineHeight: "2",
            textShadow: "0 0 20px rgba(0, 255, 170, 0.5)",
            maxWidth: "400px",
          }}
        >
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>SYNTHETERIA</div>
          <div style={{ opacity: 0.7 }}>
            You awaken in a void.<br />
            Machines respond to your signal.<br />
            The storm rages above.
          </div>
        </div>
      )}

      {/* Minimap (bottom-right) */}
      <Minimap fragments={snap.fragments} />
    </div>
  )
}

function Minimap({ fragments }: { fragments: ReturnType<typeof getSnapshot>["fragments"] }) {
  // Simple canvas-based minimap showing fragment positions and explored areas
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

          // Draw each fragment as a colored dot/area
          for (const frag of fragments) {
            ctx.fillStyle = "#00ffaa"
            for (const chunk of frag.chunks.values()) {
              if (!chunk.hasRevealed) continue
              const x = 60 + (frag.displayOffset.x + chunk.cx * 16) * 0.5
              const y = 60 + (frag.displayOffset.y + chunk.cy * 16) * 0.5
              ctx.fillRect(x, y, 4, 4)
            }
          }

          // Draw units
          ctx.fillStyle = "#ffaa00"
          for (const entity of units) {
            const x = 60 + entity.worldPosition.x * 0.5
            const y = 60 + entity.worldPosition.z * 0.5
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
