/**
 * Inventory / component view overlay.
 *
 * Toggle with Tab key. Shows current bot components, resources,
 * equipped tool, and global compute power in a machine-vision
 * terminal aesthetic (cyan/green monospace).
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../ecs/gameState";
import type { UnitComponent } from "../ecs/types";
import { getActivePlayerBot } from "../ecs/world";
import {
	getEquippedTool,
	subscribeToolChange,
	type ToolType,
} from "./RadialToolMenu";

const MONO = "'Courier New', monospace";

// ---------------------------------------------------------------------------
// Toggle state
// ---------------------------------------------------------------------------

let inventoryOpen = false;
const inventoryListeners = new Set<() => void>();

function toggleInventory() {
	inventoryOpen = !inventoryOpen;
	for (const fn of inventoryListeners) fn();
}

function subscribeInventory(fn: () => void) {
	inventoryListeners.add(fn);
	return () => {
		inventoryListeners.delete(fn);
	};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function StatusDot({ ok }: { ok: boolean }) {
	return (
		<span
			style={{
				display: "inline-block",
				width: "6px",
				height: "6px",
				borderRadius: "50%",
				background: ok ? "#00ff88" : "#ff4444",
				boxShadow: ok ? "0 0 4px #00ff88" : "0 0 6px #ff4444",
				marginRight: "6px",
			}}
		/>
	);
}

function ComponentRow({ comp }: { comp: UnitComponent }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				padding: "3px 0",
				borderBottom: "1px solid #00ffaa11",
			}}
		>
			<StatusDot ok={comp.functional} />
			<span
				style={{
					flex: 1,
					color: comp.functional ? "#00ffaacc" : "#ff4444aa",
					textTransform: "uppercase",
					letterSpacing: "0.08em",
					fontSize: "11px",
				}}
			>
				{comp.name.replace(/_/g, " ")}
			</span>
			<span
				style={{
					color: "#00ffaa66",
					fontSize: "9px",
					textTransform: "uppercase",
				}}
			>
				{comp.material}
			</span>
			<span
				style={{
					color: comp.functional ? "#00ff88" : "#ff4444",
					fontSize: "9px",
					marginLeft: "8px",
					width: "50px",
					textAlign: "right",
				}}
			>
				{comp.functional ? "ONLINE" : "OFFLINE"}
			</span>
		</div>
	);
}

const TOOL_LABELS: Record<ToolType, string> = {
	scanner: "SCANNER",
	repair: "REPAIR ARM",
	welder: "WELDER",
	fabricate: "FABRICATOR",
	build: "BUILDER",
	scavenge: "SALVAGER",
};

export function InventoryView() {
	const [open, setOpen] = useState(inventoryOpen);
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const [tool, setTool] = useState(getEquippedTool());

	// Subscribe to inventory toggle
	useEffect(() => {
		return subscribeInventory(() => setOpen(inventoryOpen));
	}, []);

	// Subscribe to tool changes
	useEffect(() => {
		return subscribeToolChange(() => setTool(getEquippedTool()));
	}, []);

	// Tab / Escape key handling
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Tab") {
				e.preventDefault();
				toggleInventory();
			} else if (e.key === "Escape" && inventoryOpen) {
				inventoryOpen = false;
				for (const fn of inventoryListeners) fn();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	if (!open) return null;

	const bot = getActivePlayerBot();
	const components = bot?.unit.components ?? [];
	const resources = snap.resources;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				background: "rgba(0, 4, 2, 0.85)",
				zIndex: 200,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontFamily: MONO,
				color: "#00ffaa",
				pointerEvents: "auto",
			}}
			onClick={(e) => {
				// Click background to close
				if (e.target === e.currentTarget) toggleInventory();
			}}
		>
			<div
				style={{
					width: "420px",
					maxWidth: "95vw",
					maxHeight: "85vh",
					overflow: "auto",
					background: "rgba(0, 8, 4, 0.95)",
					border: "1px solid #00ffaa33",
					borderRadius: "8px",
					padding: "20px 24px",
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "16px",
						borderBottom: "1px solid #00ffaa22",
						paddingBottom: "8px",
					}}
				>
					<span
						style={{
							fontSize: "14px",
							fontWeight: "bold",
							letterSpacing: "0.15em",
						}}
					>
						SYSTEM INVENTORY
					</span>
					<span style={{ fontSize: "10px", color: "#00ffaa44" }}>
						[TAB] CLOSE
					</span>
				</div>

				{/* Bot name */}
				{bot && (
					<div
						style={{
							fontSize: "12px",
							color: "#00ffaa88",
							marginBottom: "12px",
							letterSpacing: "0.1em",
						}}
					>
						UNIT: {bot.unit.displayName} (
						{bot.unit.type.replace(/_/g, " ").toUpperCase()})
					</div>
				)}

				{/* Components grid */}
				<div style={{ marginBottom: "16px" }}>
					<div
						style={{
							fontSize: "10px",
							color: "#00ffaa55",
							letterSpacing: "0.15em",
							marginBottom: "6px",
						}}
					>
						COMPONENTS
					</div>
					{components.length === 0 ? (
						<div style={{ color: "#ff444488", fontSize: "11px" }}>
							NO COMPONENTS DETECTED
						</div>
					) : (
						components.map((comp, i) => <ComponentRow key={i} comp={comp} />)
					)}
				</div>

				{/* Resources */}
				<div style={{ marginBottom: "16px" }}>
					<div
						style={{
							fontSize: "10px",
							color: "#00ffaa55",
							letterSpacing: "0.15em",
							marginBottom: "6px",
						}}
					>
						RESOURCES
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "4px 16px",
							fontSize: "11px",
						}}
					>
						<ResourceRow label="SCRAP METAL" value={resources.scrapMetal} />
						<ResourceRow label="E-WASTE" value={resources.eWaste} />
						<ResourceRow
							label="INTACT PARTS"
							value={resources.intactComponents}
						/>
					</div>
				</div>

				{/* Equipped tool */}
				<div style={{ marginBottom: "16px" }}>
					<div
						style={{
							fontSize: "10px",
							color: "#00ffaa55",
							letterSpacing: "0.15em",
							marginBottom: "6px",
						}}
					>
						EQUIPPED TOOL
					</div>
					<div style={{ fontSize: "12px", color: "#00ffaacc" }}>
						{TOOL_LABELS[tool]}
					</div>
				</div>

				{/* Global stats */}
				<div>
					<div
						style={{
							fontSize: "10px",
							color: "#00ffaa55",
							letterSpacing: "0.15em",
							marginBottom: "6px",
						}}
					>
						NETWORK STATUS
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: "4px 16px",
							fontSize: "11px",
						}}
					>
						<span style={{ color: "#00ffaa66" }}>POWER GEN</span>
						<span>{snap.power.totalGeneration.toFixed(1)}</span>
						<span style={{ color: "#00ffaa66" }}>POWER DEMAND</span>
						<span>{snap.power.totalDemand.toFixed(1)}</span>
						<span style={{ color: "#00ffaa66" }}>STORM</span>
						<span>{(snap.power.stormIntensity * 100).toFixed(0)}%</span>
						<span style={{ color: "#00ffaa66" }}>COMPUTE</span>
						<span style={{ color: "#00ffaa44" }}>-- (OFFLINE)</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function ResourceRow({ label, value }: { label: string; value: number }) {
	return (
		<>
			<span style={{ color: "#00ffaa66" }}>{label}</span>
			<span>{value}</span>
		</>
	);
}
