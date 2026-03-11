/**
 * Power overlay HUD — shows grid power status and per-building power info.
 *
 * Displays:
 *   - Total grid power generation vs consumption bar
 *   - Warning indicators for low power / overload
 *   - Per-building power status on hover/select
 *
 * Matches the machine-vision aesthetic of the FPS HUD — terminal green,
 * scan-line compatible, minimal chrome.
 */

import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../ecs/gameState";
import { buildings } from "../ecs/world";
import {
	getPowerAtEntity,
	getPowerGridSnapshot,
	isPowered,
} from "../systems/powerRouting";

const MONO = "'Courier New', monospace";

// ---------------------------------------------------------------------------
// Power status thresholds
// ---------------------------------------------------------------------------

/** Below this ratio (generation/demand), show LOW POWER warning */
const LOW_POWER_RATIO = 1.1;
/** Above this load ratio on any wire, show OVERLOAD warning */
const OVERLOAD_WIRE_THRESHOLD = 0.9;

// ---------------------------------------------------------------------------
// Power bar — total grid generation vs consumption
// ---------------------------------------------------------------------------

function PowerBar() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const gridSnap = getPowerGridSnapshot();

	const generation = gridSnap.totalGeneration;
	const demand = gridSnap.totalDemand;
	const ratio = demand > 0 ? generation / demand : generation > 0 ? 2 : 1;
	const surplus = gridSnap.surplus;

	// Determine bar color
	let barColor = "#00ffaa"; // green — healthy surplus
	let labelColor = "#00ffaa99";
	let statusText = "STABLE";

	if (ratio < 0.8) {
		barColor = "#ff4444";
		labelColor = "#ff444499";
		statusText = "DEFICIT";
	} else if (ratio < LOW_POWER_RATIO) {
		barColor = "#ffaa00";
		labelColor = "#ffaa0099";
		statusText = "LOW";
	} else if (ratio > 3) {
		barColor = "#00ffaa66";
		statusText = "EXCESS";
	}

	// Fill percentage (capped at 100%)
	const fillPercent = demand > 0 ? Math.min(100, (generation / demand) * 100) : 100;

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={`Power grid: ${statusText}. Generation ${generation.toFixed(1)}, demand ${demand.toFixed(1)}`}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "4px",
				minWidth: "180px",
			}}
		>
			{/* Header row */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "11px",
					letterSpacing: "0.08em",
				}}
			>
				<span style={{ color: labelColor }}>POWER GRID</span>
				<span
					style={{
						color: barColor,
						fontWeight: "bold",
						fontSize: "10px",
					}}
				>
					{statusText}
				</span>
			</div>

			{/* Power bar */}
			<div
				style={{
					height: "6px",
					background: "rgba(0, 255, 170, 0.1)",
					borderRadius: "2px",
					border: "1px solid rgba(0, 255, 170, 0.15)",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						height: "100%",
						width: `${fillPercent}%`,
						background: barColor,
						borderRadius: "1px",
						transition: "width 0.3s ease-out, background 0.3s",
						boxShadow: `0 0 4px ${barColor}44`,
					}}
				/>
			</div>

			{/* Numbers row */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					fontSize: "10px",
					color: "#00ffaa66",
				}}
			>
				<span>
					GEN:{generation.toFixed(1)}
				</span>
				<span>
					USE:{demand.toFixed(1)}
				</span>
				<span
					style={{
						color:
							surplus >= 0 ? "#00ffaa88" : "#ff444488",
					}}
				>
					{surplus >= 0 ? "+" : ""}
					{surplus.toFixed(1)}
				</span>
			</div>

			{/* Storm intensity */}
			<div
				style={{
					fontSize: "9px",
					color:
						snap.power.stormIntensity > 1.1
							? "#ffaa00"
							: "#00ffaa44",
					letterSpacing: "0.05em",
				}}
			>
				STORM:{(snap.power.stormIntensity * 100).toFixed(0)}%
				{snap.power.stormIntensity > 1.2 && " SURGE"}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Warnings panel
// ---------------------------------------------------------------------------

function PowerWarnings() {
	const gridSnap = getPowerGridSnapshot();

	const warnings: { text: string; color: string }[] = [];

	// Low power warning
	if (
		gridSnap.totalDemand > 0 &&
		gridSnap.totalGeneration < gridSnap.totalDemand
	) {
		warnings.push({
			text: "POWER DEFICIT — BUILD MORE LIGHTNING RODS",
			color: "#ff4444",
		});
	} else if (
		gridSnap.totalDemand > 0 &&
		gridSnap.totalGeneration / gridSnap.totalDemand < LOW_POWER_RATIO
	) {
		warnings.push({
			text: "LOW POWER MARGIN",
			color: "#ffaa00",
		});
	}

	// Overloaded wires
	let overloadedCount = 0;
	for (const [, flow] of gridSnap.wireFlows) {
		if (flow > OVERLOAD_WIRE_THRESHOLD) {
			overloadedCount++;
		}
	}
	if (overloadedCount > 0) {
		warnings.push({
			text: `${overloadedCount} WIRE${overloadedCount > 1 ? "S" : ""} OVERLOADED`,
			color: "#ff6644",
		});
	}

	// Unpowered buildings
	let unpoweredCount = 0;
	for (const building of buildings) {
		if (building.building.type === "lightning_rod") continue;
		if (!building.building.powered) {
			unpoweredCount++;
		}
	}
	if (unpoweredCount > 0) {
		warnings.push({
			text: `${unpoweredCount} BUILDING${unpoweredCount > 1 ? "S" : ""} UNPOWERED`,
			color: "#ffaa00",
		});
	}

	if (warnings.length === 0) return null;

	return (
		<div
			role="alert"
			aria-live="assertive"
			aria-label="Power grid warnings"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "2px",
				marginTop: "4px",
			}}
		>
			{warnings.map((w, i) => (
				<div
					key={i}
					style={{
						fontSize: "9px",
						color: w.color,
						letterSpacing: "0.05em",
						textShadow: `0 0 4px ${w.color}44`,
					}}
				>
					{w.text}
				</div>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Selected building power detail
// ---------------------------------------------------------------------------

function SelectedBuildingPower() {
	// Subscribe for reactivity
	useSyncExternalStore(subscribe, getSnapshot);

	// Find selected building
	let selectedBuilding: typeof buildings extends Iterable<infer T> ? T : never;
	let found = false;
	for (const b of buildings) {
		if (b.building.selected) {
			selectedBuilding = b;
			found = true;
			break;
		}
	}

	if (!found) return null;
	// TypeScript needs the assertion after the loop pattern
	const building = selectedBuilding!;

	const entityId = building.id;
	const powerReceived = getPowerAtEntity(entityId);
	const entityPowered = isPowered(entityId);
	const gridSnap = getPowerGridSnapshot();
	const alloc = gridSnap.allocations.get(entityId);

	const demand = alloc?.demand ?? 0;
	const hops = alloc?.hops ?? -1;

	return (
		<div
			style={{
				position: "absolute",
				bottom: "120px",
				left: "16px",
				background: "rgba(0, 8, 4, 0.85)",
				border: `1px solid ${entityPowered ? "#00ffaa33" : "#ff444433"}`,
				borderRadius: "6px",
				padding: "8px 12px",
				pointerEvents: "none",
				minWidth: "160px",
				fontFamily: MONO,
			}}
		>
			<div
				style={{
					color: entityPowered ? "#00ffaa" : "#ff4444",
					fontSize: "11px",
					fontWeight: "bold",
					marginBottom: "4px",
					letterSpacing: "0.08em",
				}}
			>
				{building.building.type.replace(/_/g, " ").toUpperCase()}
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					marginBottom: "4px",
				}}
			>
				<div
					style={{
						width: "6px",
						height: "6px",
						borderRadius: "50%",
						background: entityPowered ? "#00ff88" : "#ff4444",
						boxShadow: entityPowered
							? "0 0 4px #00ff88"
							: "0 0 6px #ff4444",
					}}
				/>
				<span
					style={{
						fontSize: "10px",
						color: entityPowered ? "#00ffaa88" : "#ff444488",
					}}
				>
					{entityPowered ? "POWERED" : "UNPOWERED"}
				</span>
			</div>

			<div
				style={{
					fontSize: "10px",
					color: "#00ffaa66",
					display: "flex",
					flexDirection: "column",
					gap: "2px",
				}}
			>
				<span>
					RECV: {powerReceived.toFixed(1)} / NEED: {demand.toFixed(1)}
				</span>
				{hops >= 0 && (
					<span>
						HOPS: {hops}
					</span>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main overlay
// ---------------------------------------------------------------------------

export function PowerOverlay() {
	return (
		<div
			style={{
				position: "absolute",
				top: "48px",
				left: "16px",
				background: "rgba(0, 8, 4, 0.7)",
				border: "1px solid #00ffaa22",
				borderRadius: "6px",
				padding: "8px 12px",
				pointerEvents: "none",
				fontFamily: MONO,
				color: "#00ffaa",
				zIndex: 10,
			}}
		>
			<PowerBar />
			<PowerWarnings />
			<SelectedBuildingPower />
		</div>
	);
}
