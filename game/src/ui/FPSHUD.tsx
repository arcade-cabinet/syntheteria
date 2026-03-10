/**
 * FPS heads-up display — minimal, immersive overlay.
 *
 * Shows: crosshair, bot status, resources, power, component health.
 * Replaces the top-down GameUI with panels designed for first-person play.
 *
 * The HUD has a machine-vision aesthetic — scan lines, terminal green,
 * glitch effects when components are damaged.
 */

import { useSyncExternalStore } from "react";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../ecs/gameState";
import type { UnitComponent } from "../ecs/types";
import { buildings, getActivePlayerBot, units } from "../ecs/world";

// Building/fabrication imports reserved for future build-mode HUD panels

const MONO = "'Courier New', monospace";

function Crosshair() {
	return (
		<div
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				pointerEvents: "none",
			}}
		>
			{/* Simple cross */}
			<div
				style={{
					width: "20px",
					height: "2px",
					background: "#00ffaa88",
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
				}}
			/>
			<div
				style={{
					width: "2px",
					height: "20px",
					background: "#00ffaa88",
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
				}}
			/>
			{/* Center dot */}
			<div
				style={{
					width: "3px",
					height: "3px",
					borderRadius: "50%",
					background: "#00ffaa",
					position: "absolute",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
				}}
			/>
		</div>
	);
}

function ComponentBar({ comp }: { comp: UnitComponent }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "6px",
				fontSize: "11px",
				opacity: comp.functional ? 0.8 : 1,
			}}
		>
			<div
				style={{
					width: "6px",
					height: "6px",
					borderRadius: "50%",
					background: comp.functional ? "#00ff88" : "#ff4444",
					boxShadow: comp.functional ? "0 0 4px #00ff88" : "0 0 6px #ff4444",
				}}
			/>
			<span
				style={{
					color: comp.functional ? "#00ffaa88" : "#ff444488",
					textTransform: "uppercase",
					letterSpacing: "0.05em",
				}}
			>
				{comp.name.replace(/_/g, " ")}
			</span>
			{!comp.functional && (
				<span style={{ color: "#ff4444", fontSize: "9px" }}>OFFLINE</span>
			)}
		</div>
	);
}

function BotStatus() {
	const bot = getActivePlayerBot();
	if (!bot) return null;

	return (
		<div
			style={{
				position: "absolute",
				bottom: "16px",
				left: "16px",
				background: "rgba(0, 8, 4, 0.75)",
				border: "1px solid #00ffaa33",
				borderRadius: "6px",
				padding: "10px 14px",
				pointerEvents: "none",
				minWidth: "140px",
			}}
		>
			<div
				style={{
					color: "#00ffaa",
					fontSize: "13px",
					fontWeight: "bold",
					marginBottom: "6px",
					letterSpacing: "0.1em",
				}}
			>
				{bot.unit.displayName}
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
				{bot.unit.components.map((comp, i) => (
					<ComponentBar key={i} comp={comp} />
				))}
			</div>
		</div>
	);
}

function ResourceBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<div
			style={{
				position: "absolute",
				top: "12px",
				left: "50%",
				transform: "translateX(-50%)",
				display: "flex",
				gap: "18px",
				fontSize: "12px",
				color: "#00ffaa99",
				background: "rgba(0, 8, 4, 0.6)",
				padding: "6px 16px",
				borderRadius: "4px",
				border: "1px solid #00ffaa22",
				pointerEvents: "none",
				letterSpacing: "0.05em",
			}}
		>
			<span>SCRAP:{snap.resources.scrapMetal}</span>
			<span>E-WASTE:{snap.resources.eWaste}</span>
			<span>PARTS:{snap.resources.intactComponents}</span>
			<span
				style={{
					color:
						snap.power.stormIntensity > 1.1
							? "#ffaa00"
							: snap.power.stormIntensity > 0.8
								? "#00ffaa"
								: "#00ffaa66",
				}}
			>
				STORM:{(snap.power.stormIntensity * 100).toFixed(0)}%
			</span>
			<span>
				PWR:{snap.power.totalGeneration.toFixed(0)}/
				{snap.power.totalDemand.toFixed(0)}
			</span>
		</div>
	);
}

function SpeedControls() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<div
			style={{
				position: "absolute",
				top: "12px",
				right: "16px",
				display: "flex",
				gap: "4px",
				pointerEvents: "auto",
			}}
		>
			{([0.5, 1, 2] as const).map((s) => (
				<button
					key={s}
					onClick={() => setGameSpeed(s)}
					style={{
						background:
							snap.gameSpeed === s && !snap.paused
								? "#00ffaa"
								: "rgba(0,0,0,0.6)",
						color: snap.gameSpeed === s && !snap.paused ? "#000" : "#00ffaa",
						border: "1px solid #00ffaa44",
						borderRadius: "3px",
						padding: "3px 8px",
						fontSize: "11px",
						cursor: "pointer",
						fontFamily: MONO,
						minWidth: "36px",
						minHeight: "28px",
					}}
				>
					{s}x
				</button>
			))}
			<button
				onClick={togglePause}
				style={{
					background: snap.paused ? "#ffaa00" : "rgba(0,0,0,0.6)",
					color: snap.paused ? "#000" : "#00ffaa",
					border: "1px solid #00ffaa44",
					borderRadius: "3px",
					padding: "3px 8px",
					fontSize: "11px",
					cursor: "pointer",
					fontFamily: MONO,
					minWidth: "36px",
					minHeight: "28px",
				}}
			>
				{snap.paused ? "PLAY" : "PAUSE"}
			</button>
		</div>
	);
}

function Hints() {
	const bot = getActivePlayerBot();
	if (!bot) return null;

	return (
		<div
			style={{
				position: "absolute",
				bottom: "16px",
				right: "16px",
				color: "#00ffaa44",
				fontSize: "10px",
				textAlign: "right",
				lineHeight: "1.8",
				pointerEvents: "none",
				letterSpacing: "0.05em",
			}}
		>
			<div>WASD move</div>
			<div>MOUSE look</div>
			<div>E interact</div>
			<div>F harvest</div>
			<div>C compress</div>
			<div>G grab/drop</div>
			<div>Q switch bot</div>
			<div>CLICK select</div>
		</div>
	);
}

function SelectedInfo() {
	// Subscribe to trigger re-renders on state changes
	useSyncExternalStore(subscribe, getSnapshot);
	const selectedUnit = Array.from(units).find((u) => u.unit.selected);
	const selectedBuilding = Array.from(buildings).find(
		(b) => b.building.selected && !b.unit,
	);

	if (!selectedUnit && !selectedBuilding) return null;

	if (selectedUnit) {
		return (
			<div
				style={{
					position: "absolute",
					top: "50%",
					right: "16px",
					transform: "translateY(-50%)",
					background: "rgba(0, 8, 4, 0.8)",
					border: "1px solid #00ffaa33",
					borderRadius: "6px",
					padding: "10px 14px",
					pointerEvents: "none",
					maxWidth: "200px",
					fontSize: "12px",
					color: "#00ffaa",
				}}
			>
				<div style={{ fontWeight: "bold", marginBottom: "4px" }}>
					{selectedUnit.unit.displayName}
				</div>
				<div
					style={{ fontSize: "10px", color: "#00ffaa66", marginBottom: "6px" }}
				>
					{selectedUnit.unit.type.replace(/_/g, " ").toUpperCase()}
					{selectedUnit.faction !== "player" && (
						<span style={{ color: "#ff4444", marginLeft: "8px" }}>HOSTILE</span>
					)}
				</div>
				{selectedUnit.unit.components.map((comp, i) => (
					<ComponentBar key={i} comp={comp} />
				))}
			</div>
		);
	}

	if (selectedBuilding) {
		return (
			<div
				style={{
					position: "absolute",
					top: "50%",
					right: "16px",
					transform: "translateY(-50%)",
					background: "rgba(0, 8, 4, 0.8)",
					border: "1px solid #aa884433",
					borderRadius: "6px",
					padding: "10px 14px",
					pointerEvents: "none",
					maxWidth: "200px",
					fontSize: "12px",
					color: "#aa8844",
				}}
			>
				<div style={{ fontWeight: "bold", marginBottom: "4px" }}>
					{selectedBuilding.building.type.replace(/_/g, " ").toUpperCase()}
				</div>
				<div style={{ fontSize: "10px", color: "#aa884466" }}>
					{selectedBuilding.building.powered ? "POWERED" : "UNPOWERED"}
				</div>
			</div>
		);
	}

	return null;
}

function CombatNotifications() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	if (snap.combatEvents.length === 0) return null;

	return (
		<div
			style={{
				position: "absolute",
				top: "60px",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(40, 0, 0, 0.85)",
				border: "1px solid #ff444466",
				borderRadius: "6px",
				padding: "6px 14px",
				fontSize: "12px",
				color: "#ff6644",
				pointerEvents: "none",
			}}
		>
			{snap.combatEvents.slice(0, 3).map((e, i) => (
				<div key={i}>
					{e.targetDestroyed
						? `${e.targetId} DESTROYED`
						: `${e.targetId}: ${e.componentDamaged} hit`}
				</div>
			))}
		</div>
	);
}

// --- Scan line overlay for machine-vision aesthetic ---
function ScanLines() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				background:
					"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
				zIndex: 100,
			}}
		/>
	);
}

export function FPSHUD() {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				pointerEvents: "none",
				fontFamily: MONO,
				color: "#00ffaa",
			}}
		>
			<Crosshair />
			<ResourceBar />
			<SpeedControls />
			<BotStatus />
			<Hints />
			<SelectedInfo />
			<CombatNotifications />
			<ScanLines />
		</div>
	);
}
