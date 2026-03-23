/**
 * DOM overlay UI: resource bar, power info, speed controls, build toolbar,
 * unit info, combat log, minimap.
 *
 * All font sizes use CSS custom properties (--ui-xs … --ui-xl) defined in
 * index.css so they scale responsively across phone / tablet / desktop.
 * Panels are clamped to --panel-w so they never overflow a small screen.
 * Safe-area insets (--sat / --sar / --sab / --sal) keep content clear of
 * iPhone notches and home-indicator bars.
 */
import { useState, useSyncExternalStore } from "react";
import {
	getSnapshot,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../ecs/gameState";
import { WORLD_HALF } from "../ecs/terrain";
import type {
	BuildingEntity,
	Entity,
	UnitComponent,
	UnitEntity,
} from "../ecs/types";
import { buildings, units } from "../ecs/world";
import {
	BUILDING_COSTS,
	getActivePlacement,
	type PlaceableType,
	setActivePlacement,
} from "../systems/buildingPlacement";
import { RECIPES, startFabrication } from "../systems/fabrication";
import { startRepair } from "../systems/repair";

// ── helpers ─────────────────────────────────────────────────────────────────

/** Shared monospace font family */
const MONO = "'Courier New', monospace";

function ComponentStatus({ comp }: { comp: UnitComponent }) {
	return (
		<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
			<span
				style={{
					display: "inline-block",
					width: "9px",
					height: "9px",
					borderRadius: "50%",
					flexShrink: 0,
					background: comp.functional ? "#00ff88" : "#ff4444",
					boxShadow: comp.functional ? "0 0 4px #00ff88" : "0 0 4px #ff4444",
				}}
			/>
			<span style={{ textTransform: "capitalize", fontSize: "var(--ui-sm)" }}>
				{comp.name.replace(/_/g, " ")}
			</span>
			{!comp.functional && (
				<span style={{ color: "#ff4444", fontSize: "var(--ui-xs)" }}>
					BROKEN
				</span>
			)}
		</div>
	);
}

// ── build toolbar ────────────────────────────────────────────────────────────

function BuildToolbar() {
	const active = getActivePlacement();
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	const items: { type: PlaceableType; label: string }[] = [
		{ type: "lightning_rod", label: "ROD" },
		{ type: "fabrication_unit", label: "FAB" },
	];

	return (
		<div
			style={{
				position: "absolute",
				right: "calc(16px + var(--sar))",
				top: "50%",
				transform: "translateY(-50%)",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				pointerEvents: "auto",
			}}
		>
			{items.map(({ type, label }) => {
				const isActive = active === type;
				const costs = BUILDING_COSTS[type!];
				const canAfford = costs.every(
					(c) => snap.resources[c.type] >= c.amount,
				);

				return (
					<button
						key={type}
						onClick={() => setActivePlacement(isActive ? null : type)}
						title={costs.map((c) => `${c.amount} ${c.type}`).join(", ")}
						style={{
							background: isActive ? "rgba(0,255,170,0.2)" : "rgba(0,0,0,0.75)",
							color: canAfford ? "#00ffaa" : "#00ffaa44",
							border: isActive ? "2px solid #00ffaa" : "1px solid #00ffaa44",
							borderRadius: "6px",
							padding: "10px 8px",
							fontSize: "var(--ui-sm)",
							fontFamily: MONO,
							cursor: canAfford ? "pointer" : "default",
							minWidth: "52px",
							minHeight: "48px",
							textAlign: "center",
							letterSpacing: "0.1em",
						}}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}

// ── repair panel (unit) ──────────────────────────────────────────────────────

function RepairPanel({ selectedUnit }: { selectedUnit: UnitEntity }) {
	const brokenComps = selectedUnit.unit.components.filter((c) => !c.functional);
	if (brokenComps.length === 0) return null;

	const allUnits = Array.from(units);
	const repairer = allUnits.find((u) => {
		if (u.id === selectedUnit.id) return false;
		if (u.faction !== "player") return false;
		if (!u.unit.components.some((c) => c.name === "arms" && c.functional))
			return false;
		const dx = u.worldPosition.x - selectedUnit.worldPosition.x;
		const dz = u.worldPosition.z - selectedUnit.worldPosition.z;
		return Math.sqrt(dx * dx + dz * dz) < 3.0;
	});

	if (!repairer) return null;

	return (
		<div
			style={{
				marginTop: "8px",
				borderTop: "1px solid #00ffaa22",
				paddingTop: "6px",
			}}
		>
			<div
				style={{
					fontSize: "var(--ui-xs)",
					color: "#00ffaa88",
					marginBottom: "4px",
				}}
			>
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
						padding: "6px 8px",
						fontSize: "var(--ui-sm)",
						fontFamily: MONO,
						cursor: "pointer",
						marginBottom: "3px",
						minHeight: "36px",
					}}
				>
					Fix {comp.name.replace(/_/g, " ")}
				</button>
			))}
		</div>
	);
}

// ── repair panel (building) ──────────────────────────────────────────────────

function BuildingRepairPanel({
	selectedBuilding,
}: {
	selectedBuilding: BuildingEntity;
}) {
	const brokenComps = selectedBuilding.building.components.filter(
		(c) => !c.functional,
	);
	if (brokenComps.length === 0) return null;

	const allUnits = Array.from(units);
	const repairer = allUnits.find((u) => {
		if (u.faction !== "player") return false;
		if (!u.unit.components.some((c) => c.name === "arms" && c.functional))
			return false;
		const dx = u.worldPosition.x - selectedBuilding.worldPosition.x;
		const dz = u.worldPosition.z - selectedBuilding.worldPosition.z;
		return Math.sqrt(dx * dx + dz * dz) < 3.0;
	});

	return (
		<div
			style={{
				marginTop: "8px",
				borderTop: "1px solid #00ffaa22",
				paddingTop: "6px",
			}}
		>
			<div
				style={{
					fontSize: "var(--ui-xs)",
					color: "#00ffaa88",
					marginBottom: "4px",
				}}
			>
				REPAIR{" "}
				{repairer
					? `(${repairer.unit.displayName} nearby)`
					: "(no unit with arms nearby)"}
			</div>
			{brokenComps.map((comp, i) => (
				<button
					key={i}
					onClick={() =>
						repairer && startRepair(repairer, selectedBuilding, comp.name)
					}
					disabled={!repairer}
					style={{
						display: "block",
						width: "100%",
						textAlign: "left",
						background: repairer ? "rgba(255,68,68,0.1)" : "transparent",
						color: repairer ? "#ff8866" : "#ff886644",
						border: "1px solid #ff444444",
						borderRadius: "4px",
						padding: "6px 8px",
						fontSize: "var(--ui-sm)",
						fontFamily: MONO,
						cursor: repairer ? "pointer" : "default",
						marginBottom: "3px",
						minHeight: "36px",
					}}
				>
					Fix {comp.name.replace(/_/g, " ")}
				</button>
			))}
		</div>
	);
}

// ── inline fabrication panel (inside selected-unit card) ────────────────────

function InlineFabricationPanel({ fabricator }: { fabricator: Entity }) {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const [expanded, setExpanded] = useState(false);
	const isPowered =
		fabricator.building?.powered && fabricator.building?.operational;

	const myJobs = snap.fabricationJobs.filter(
		(j) => j.fabricatorId === fabricator.id,
	);

	return (
		<div
			style={{
				marginTop: "8px",
				borderTop: "1px solid #aa884422",
				paddingTop: "6px",
			}}
		>
			<div
				onClick={() => setExpanded(!expanded)}
				style={{
					cursor: "pointer",
					color: "#aa8844",
					fontSize: "var(--ui-sm)",
					fontWeight: "bold",
					marginBottom: "4px",
				}}
			>
				FABRICATION {expanded ? "[-]" : "[+]"}
			</div>

			{myJobs.length > 0 && (
				<div
					style={{
						color: "#00ffaa88",
						fontSize: "var(--ui-xs)",
						marginBottom: "4px",
					}}
				>
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
						const canAfford = recipe.costs.every(
							(c) => snap.resources[c.type] >= c.amount,
						);
						return (
							<button
								key={recipe.name}
								onClick={() => startFabrication(fabricator, recipe.name)}
								style={{
									display: "block",
									width: "100%",
									textAlign: "left",
									background: canAfford
										? "rgba(170,136,68,0.1)"
										: "transparent",
									color: canAfford ? "#aa8844" : "#aa884444",
									border: "1px solid #aa884433",
									borderRadius: "4px",
									padding: "6px 8px",
									fontSize: "var(--ui-sm)",
									fontFamily: MONO,
									cursor: canAfford ? "pointer" : "default",
									marginBottom: "3px",
									minHeight: "36px",
								}}
								title={recipe.costs
									.map((c) => `${c.amount} ${c.type}`)
									.join(", ")}
							>
								{recipe.name} ({recipe.buildTime}t)
							</button>
						);
					})}
				</div>
			)}

			{expanded && !isPowered && (
				<div style={{ color: "#ff444488", fontSize: "var(--ui-sm)" }}>
					Requires power to fabricate
				</div>
			)}
		</div>
	);
}

// ── standalone fabrication shortcut panel ────────────────────────────────────
// Shown above the unit panel (or standalone) when a powered fab unit exists
// and none is currently selected — lets players queue jobs without selecting it.

function FabricationPanel() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const [expanded, setExpanded] = useState(false);

	const fabricator = Array.from(buildings).find(
		(b) =>
			b.building.type === "fabrication_unit" &&
			b.building.powered &&
			b.building.operational,
	);

	if (!fabricator) return null;

	return (
		<div
			style={{
				position: "absolute",
				bottom: "calc(16px + var(--sab))",
				left: "calc(16px + var(--sal))",
				background: "rgba(0, 0, 0, 0.82)",
				border: "1px solid #aa884444",
				borderRadius: "8px",
				padding: "10px 14px",
				fontSize: "var(--ui-sm)",
				pointerEvents: "auto",
				width: "var(--panel-w)",
				fontFamily: MONO,
			}}
		>
			<div
				onClick={() => setExpanded(!expanded)}
				style={{
					cursor: "pointer",
					color: "#aa8844",
					fontWeight: "bold",
					marginBottom: "4px",
				}}
			>
				FABRICATOR {expanded ? "[-]" : "[+]"}
			</div>

			{snap.fabricationJobs.length > 0 && (
				<div
					style={{
						color: "#00ffaa88",
						fontSize: "var(--ui-xs)",
						marginBottom: "4px",
					}}
				>
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
						const canAfford = recipe.costs.every(
							(c) => snap.resources[c.type] >= c.amount,
						);
						return (
							<button
								key={recipe.name}
								onClick={() => startFabrication(fabricator, recipe.name)}
								style={{
									display: "block",
									width: "100%",
									textAlign: "left",
									background: canAfford
										? "rgba(170,136,68,0.1)"
										: "transparent",
									color: canAfford ? "#aa8844" : "#aa884444",
									border: "1px solid #aa884433",
									borderRadius: "4px",
									padding: "6px 8px",
									fontSize: "var(--ui-sm)",
									fontFamily: MONO,
									cursor: canAfford ? "pointer" : "default",
									marginBottom: "3px",
									minHeight: "36px",
								}}
								title={recipe.costs
									.map((c) => `${c.amount} ${c.type}`)
									.join(", ")}
							>
								{recipe.name} ({recipe.buildTime}t)
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ── main GameUI ──────────────────────────────────────────────────────────────

export function GameUI() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	const selectedUnit = Array.from(units).find((u) => u.unit.selected);
	const selectedBuilding = Array.from(buildings).find(
		(b) => b.building.selected && !b.unit,
	);
	const fragmentCount = snap.fragments.length;
	const buildingCount = Array.from(buildings).length;

	// Show fabrication shortcut only when fab unit exists but isn't selected
	const showFabShortcut =
		!selectedUnit?.unit.type.includes("fabrication") && !selectedBuilding;

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
			{/* ── Top bar ── */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: `calc(8px + var(--sat)) calc(12px + var(--sar)) 8px calc(12px + var(--sal))`,
					background:
						"linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 100%)",
					pointerEvents: "auto",
					flexWrap: "wrap",
					gap: "6px",
				}}
			>
				{/* Status counts */}
				<div
					style={{
						display: "flex",
						gap: "clamp(10px, 3vw, 18px)",
						fontSize: "var(--ui-md)",
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					<span>UNITS: {snap.unitCount}</span>
					<span>BLDG: {buildingCount}</span>
					{snap.enemyCount > 0 && (
						<span style={{ color: "#ff4444" }}>HOSTILE: {snap.enemyCount}</span>
					)}
					<span>FRAG: {fragmentCount}</span>
				</div>

				{/* Speed controls */}
				<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
					{([0.5, 1, 2] as const).map((s) => (
						<button
							key={s}
							onClick={() => setGameSpeed(s)}
							style={speedButtonStyle(snap.gameSpeed === s && !snap.paused)}
						>
							{s}x
						</button>
					))}
					<button onClick={togglePause} style={speedButtonStyle(snap.paused)}>
						{snap.paused ? "PLAY" : "PAUSE"}
					</button>
				</div>
			</div>

			{/* ── Resource bar ── */}
			<div
				style={{
					display: "flex",
					gap: "clamp(10px, 3vw, 18px)",
					padding: `4px calc(12px + var(--sal)) 8px`,
					fontSize: "var(--ui-sm)",
					color: "#00ffaa99",
					pointerEvents: "none",
					flexWrap: "wrap",
				}}
			>
				<span title="Scrap Metal">SCRAP: {snap.resources.scrapMetal}</span>
				<span title="Electronic Waste">E-WASTE: {snap.resources.eWaste}</span>
				<span title="Intact Components">
					PARTS: {snap.resources.intactComponents}
				</span>
				<span
					style={{ color: stormColor(snap.power.stormIntensity) }}
					title="Storm Intensity"
				>
					STORM: {(snap.power.stormIntensity * 100).toFixed(0)}%
				</span>
				<span title="Power Generation / Demand">
					PWR: {snap.power.totalGeneration.toFixed(0)}/
					{snap.power.totalDemand.toFixed(0)}
				</span>
			</div>

			{/* ── Selected unit info ── */}
			{selectedUnit && (
				<div
					style={{
						position: "absolute",
						bottom: `calc(16px + var(--sab))`,
						left: `calc(16px + var(--sal))`,
						background: "rgba(0, 0, 0, 0.85)",
						border: "1px solid #00ffaa44",
						borderRadius: "8px",
						padding: "12px 16px",
						fontSize: "var(--ui-md)",
						lineHeight: "1.6",
						width: "var(--panel-w)",
						maxHeight: "55vh",
						overflowY: "auto",
						pointerEvents: "auto",
					}}
				>
					<div
						style={{
							fontSize: "var(--ui-lg)",
							fontWeight: "bold",
							marginBottom: "4px",
						}}
					>
						{selectedUnit.unit.displayName}
					</div>
					<div
						style={{
							color: "#00ffaa88",
							fontSize: "var(--ui-xs)",
							marginBottom: "6px",
						}}
					>
						{selectedUnit.unit.type.replace(/_/g, " ").toUpperCase()}
						{selectedUnit.faction !== "player" && (
							<span style={{ color: "#ff4444", marginLeft: "8px" }}>
								HOSTILE
							</span>
						)}
					</div>
					{selectedUnit.unit.speed > 0 && (
						<div>Speed: {selectedUnit.unit.speed.toFixed(1)}</div>
					)}
					{selectedUnit.building && (
						<div
							style={{
								color: selectedUnit.building.powered ? "#00ff88" : "#ff4444",
							}}
						>
							{selectedUnit.building.powered ? "POWERED" : "UNPOWERED"}
							{" / "}
							{selectedUnit.building.operational ? "OPERATIONAL" : "OFFLINE"}
						</div>
					)}
					<div style={{ fontSize: "var(--ui-xs)", color: "#00ffaa66" }}>
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
						<div
							style={{
								fontSize: "var(--ui-xs)",
								color: "#00ffaa88",
								marginBottom: "4px",
							}}
						>
							COMPONENTS
						</div>
						{selectedUnit.unit.components.map((comp, i) => (
							<ComponentStatus key={i} comp={comp} />
						))}
					</div>

					{selectedUnit.faction === "player" && (
						<RepairPanel selectedUnit={selectedUnit} />
					)}

					{selectedUnit.unit.type === "fabrication_unit" &&
						selectedUnit.building && (
							<InlineFabricationPanel fabricator={selectedUnit} />
						)}

					<div
						style={{
							fontSize: "var(--ui-xs)",
							color: "#00ffaa88",
							marginTop: "8px",
						}}
					>
						{selectedUnit.unit.speed > 0
							? "Tap to select \u2022 Tap ground to move"
							: "Tap to select"}
					</div>
				</div>
			)}

			{/* ── Selected building info ── */}
			{selectedBuilding && (
				<div
					style={{
						position: "absolute",
						bottom: `calc(16px + var(--sab))`,
						left: `calc(16px + var(--sal))`,
						background: "rgba(0, 0, 0, 0.85)",
						border: "1px solid #aa884444",
						borderRadius: "8px",
						padding: "12px 16px",
						fontSize: "var(--ui-md)",
						lineHeight: "1.6",
						width: "var(--panel-w)",
						maxHeight: "55vh",
						overflowY: "auto",
						pointerEvents: "auto",
					}}
				>
					<div
						style={{
							fontSize: "var(--ui-lg)",
							fontWeight: "bold",
							marginBottom: "4px",
							color: "#aa8844",
						}}
					>
						{selectedBuilding.building.type.replace(/_/g, " ").toUpperCase()}
					</div>
					<div
						style={{
							color: "#aa884488",
							fontSize: "var(--ui-xs)",
							marginBottom: "6px",
						}}
					>
						{selectedBuilding.building.powered ? "POWERED" : "UNPOWERED"}
						{" / "}
						{selectedBuilding.building.operational ? "OPERATIONAL" : "OFFLINE"}
					</div>
					<div style={{ fontSize: "var(--ui-xs)", color: "#aa884466" }}>
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
							<div
								style={{
									fontSize: "var(--ui-xs)",
									color: "#aa884488",
									marginBottom: "4px",
								}}
							>
								COMPONENTS
							</div>
							{selectedBuilding.building.components.map((comp, i) => (
								<ComponentStatus key={i} comp={comp} />
							))}
						</div>
					)}

					{selectedBuilding.building.type === "lightning_rod" &&
						selectedBuilding.lightningRod && (
							<div
								style={{
									marginTop: "8px",
									borderTop: "1px solid #aa884422",
									paddingTop: "8px",
									fontSize: "var(--ui-sm)",
								}}
							>
								<div>
									Output:{" "}
									{selectedBuilding.lightningRod.currentOutput.toFixed(1)} /{" "}
									{selectedBuilding.lightningRod.rodCapacity}
								</div>
								<div>
									Radius: {selectedBuilding.lightningRod.protectionRadius}
								</div>
							</div>
						)}

					<BuildingRepairPanel selectedBuilding={selectedBuilding} />

					<div
						style={{
							fontSize: "var(--ui-xs)",
							color: "#aa884488",
							marginTop: "8px",
						}}
					>
						Tap to select
					</div>
				</div>
			)}

			{/* ── Combat notifications ── */}
			{snap.combatEvents.length > 0 && (
				<div
					style={{
						position: "absolute",
						top: "90px",
						right: `calc(72px + var(--sar))`,
						background: "rgba(40, 0, 0, 0.88)",
						border: "1px solid #ff444466",
						borderRadius: "8px",
						padding: "8px 14px",
						fontSize: "var(--ui-sm)",
						color: "#ff6644",
						maxWidth: "min(220px, 45vw)",
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

			{/* ── Fragment merge notification ── */}
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
						fontSize: "var(--ui-xl)",
						textAlign: "center",
					}}
				>
					MAP FRAGMENTS MERGED
				</div>
			)}

			{/* ── Build toolbar ── */}
			<BuildToolbar />

			{/* ── Fabrication shortcut ── */}
			{showFabShortcut && <FabricationPanel />}

			{/* ── Minimap ── */}
			<Minimap />
		</div>
	);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function stormColor(intensity: number): string {
	if (intensity > 1.1) return "#ffaa00";
	if (intensity > 0.8) return "#00ffaa";
	return "#00ffaa66";
}

function Minimap() {
	return (
		<div
			style={{
				position: "absolute",
				bottom: `calc(16px + var(--sab))`,
				right: `calc(16px + var(--sar))`,
				width: "clamp(90px, 22vw, 130px)",
				height: "clamp(90px, 22vw, 130px)",
				background: "rgba(0, 0, 0, 0.82)",
				border: "1px solid #00ffaa44",
				borderRadius: "8px",
				overflow: "hidden",
				pointerEvents: "auto",
			}}
		>
			<canvas
				ref={(canvas) => {
					if (!canvas) return;
					const ctx = canvas.getContext("2d");
					if (!ctx) return;
					const sz = canvas.offsetWidth || 100;
					canvas.width = sz;
					canvas.height = sz;
					ctx.fillStyle = "#000";
					ctx.fillRect(0, 0, sz, sz);

					const half = sz / 2;
					const scale = (sz * 0.45) / WORLD_HALF;

					ctx.fillStyle = "#aa8844";
					for (const entity of buildings) {
						const x = half + entity.worldPosition.x * scale;
						const y = half + entity.worldPosition.z * scale;
						ctx.fillRect(x - 2, y - 2, 5, 5);
					}

					for (const entity of units) {
						const isEnemy = entity.faction !== "player";
						ctx.fillStyle = isEnemy ? "#ff3333" : "#ffaa00";
						const x = half + entity.worldPosition.x * scale;
						const y = half + entity.worldPosition.z * scale;
						ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
					}
				}}
				style={{ width: "100%", height: "100%" }}
			/>
		</div>
	);
}

function speedButtonStyle(active: boolean): React.CSSProperties {
	return {
		background: active ? "#00ffaa" : "rgba(0,0,0,0.6)",
		color: active ? "#000" : "#00ffaa",
		border: "1px solid #00ffaa",
		borderRadius: "4px",
		padding: "4px 10px",
		fontSize: "var(--ui-sm)",
		cursor: "pointer",
		fontFamily: MONO,
		minWidth: "48px",
		minHeight: "44px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		letterSpacing: "0.05em",
	};
}
