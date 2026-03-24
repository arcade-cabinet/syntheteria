/**
 * DOM overlay UI: resource bar, power info, speed controls, build toolbar,
 * unit info, combat log, minimap.
 */
import type { Entity } from "koota";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getMasterVolume, setMasterVolume } from "../audio";
import { BUILDING_DEFS, BUILDING_TYPES } from "../config/buildingDefs";
import { getTemperatureTier } from "../config/humanEncounterDefs";
import { getCityBuildings } from "../ecs/cityLayout";
import {
	getGameSpeed,
	getSnapshot,
	isPaused,
	setGameSpeed,
	subscribe,
	togglePause,
} from "../ecs/gameState";
import { getAllFragments, worldToFogIndex } from "../ecs/terrain";
import {
	BuildingTrait,
	EntityId,
	Faction,
	LightningRod,
	Position,
	Unit,
	UnitComponents,
} from "../ecs/traits";
import { parseComponents, type UnitComponent } from "../ecs/types";
import { world } from "../ecs/world";
import {
	getActivePlacement,
	type PlaceableType,
	setActivePlacement,
} from "../systems/buildingPlacement";
import { RECIPES, startFabrication } from "../systems/fabrication";
import { startRepair } from "../systems/repair";

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
					boxShadow: comp.functional ? "0 0 4px #00ff88" : "0 0 4px #ff4444",
				}}
			/>
			<span style={{ textTransform: "capitalize" }}>
				{comp.name.replace(/_/g, " ")}
			</span>
			{!comp.functional && (
				<span style={{ color: "#ff4444", fontSize: "11px" }}>BROKEN</span>
			)}
		</div>
	);
}

/** Short resource type labels for compact cost display */
const RESOURCE_LABELS: Record<string, string> = {
	scrapMetal: "SCR",
	circuitry: "CIR",
	powerCells: "PWR",
	durasteel: "DUR",
};

/** Unicode icons per building type for quick recognition */
const BUILDING_ICONS: Record<string, string> = {
	lightning_rod: "\u26A1",
	power_conduit: "\u2261",
	fabrication_unit: "\u2692",
	server_rack: "\u25A6",
	relay_station: "\u2637",
	defense_turret: "\u2694",
};

function BuildToolbar() {
	const active = getActivePlacement();
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	return (
		<div
			style={{
				position: "absolute",
				right: "12px",
				top: "50%",
				transform: "translateY(-50%)",
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				pointerEvents: "auto",
			}}
		>
			{BUILDING_TYPES.map((type) => {
				const def = BUILDING_DEFS[type];
				const isActive = active === type;
				const costs = def.costs;
				const canAfford = costs.every(
					(c) => snap.resources[c.type] >= c.amount,
				);
				const icon = BUILDING_ICONS[type] ?? "\u25CB";

				return (
					<button
						type="button"
						key={type}
						onClick={() =>
							setActivePlacement(isActive ? null : (type as PlaceableType))
						}
						style={{
							background: isActive ? "rgba(0,255,170,0.15)" : "rgba(0,0,0,0.8)",
							color: canAfford ? "#00ffaa" : "#00ffaa44",
							border: isActive ? "2px solid #00ffaa" : "1px solid #00ffaa33",
							borderRadius: "6px",
							padding: "6px 10px",
							fontSize: "11px",
							fontFamily: "'Courier New', monospace",
							cursor: canAfford ? "pointer" : "default",
							minWidth: "110px",
							textAlign: "left",
							lineHeight: "1.4",
						}}
					>
						<div style={{ fontWeight: "bold", fontSize: "12px" }}>
							{icon} {def.displayName.toUpperCase()}
						</div>
						<div
							style={{
								fontSize: "10px",
								color: canAfford ? "#00ffaa88" : "#00ffaa33",
								marginTop: "2px",
							}}
						>
							{costs
								.map((c) => `${c.amount}${RESOURCE_LABELS[c.type] ?? c.type}`)
								.join(" ")}
						</div>
					</button>
				);
			})}
		</div>
	);
}

function RepairPanel({ selectedEntity }: { selectedEntity: Entity }) {
	const comps = parseComponents(
		selectedEntity.get(UnitComponents)?.componentsJson ?? "[]",
	);
	const brokenComps = comps.filter((c) => !c.functional);
	if (brokenComps.length === 0) return null;

	const selectedPos = selectedEntity.get(Position)!;
	// EntityId may be absent for dynamically spawned entities — empty string prevents self-match below
	const selectedId = selectedEntity.get(EntityId)?.value ?? "";

	let repairer: Entity | null = null;
	let repairerName = "";
	for (const entity of world.query(Unit, UnitComponents, Faction, Position)) {
		if (entity.get(EntityId)?.value === selectedId) continue;
		if (entity.get(Faction)!.value !== "player") continue;
		const entityComps = parseComponents(
			entity.get(UnitComponents)!.componentsJson,
		);
		if (!entityComps.some((c) => c.name === "arms" && c.functional)) continue;
		const ePos = entity.get(Position)!;
		const dx = ePos.x - selectedPos.x;
		const dz = ePos.z - selectedPos.z;
		if (Math.sqrt(dx * dx + dz * dz) < 3.0) {
			repairer = entity;
			repairerName = entity.get(Unit)!.displayName;
			break;
		}
	}

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
				style={{ fontSize: "11px", color: "#00ffaa88", marginBottom: "4px" }}
			>
				REPAIR ({repairerName} nearby)
			</div>
			{brokenComps.map((comp) => (
				<button
					type="button"
					key={comp.name}
					onClick={() => startRepair(repairer!, selectedEntity, comp.name)}
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
	);
}

function BuildingRepairPanel({
	selectedBuilding,
}: {
	selectedBuilding: Entity;
}) {
	const building = selectedBuilding.get(BuildingTrait)!;
	const brokenComps = parseComponents(building.buildingComponentsJson).filter(
		(c) => !c.functional,
	);
	if (brokenComps.length === 0) return null;

	const buildingPos = selectedBuilding.get(Position)!;

	let repairer: Entity | null = null;
	let repairerName = "";
	for (const entity of world.query(Unit, UnitComponents, Faction, Position)) {
		if (entity.get(Faction)!.value !== "player") continue;
		const entityComps = parseComponents(
			entity.get(UnitComponents)!.componentsJson,
		);
		if (!entityComps.some((c) => c.name === "arms" && c.functional)) continue;
		const ePos = entity.get(Position)!;
		const dx = ePos.x - buildingPos.x;
		const dz = ePos.z - buildingPos.z;
		if (Math.sqrt(dx * dx + dz * dz) < 3.0) {
			repairer = entity;
			repairerName = entity.get(Unit)!.displayName;
			break;
		}
	}

	return (
		<div
			style={{
				marginTop: "8px",
				borderTop: "1px solid #00ffaa22",
				paddingTop: "6px",
			}}
		>
			<div
				style={{ fontSize: "11px", color: "#00ffaa88", marginBottom: "4px" }}
			>
				REPAIR{" "}
				{repairer ? `(${repairerName} nearby)` : "(no unit with arms nearby)"}
			</div>
			{brokenComps.map((comp) => (
				<button
					type="button"
					key={comp.name}
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
	);
}

function InlineFabricationPanel({ fabricator }: { fabricator: Entity }) {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const [expanded, setExpanded] = useState(false);
	const building = fabricator.get(BuildingTrait);
	const isPowered = building?.powered && building?.operational;

	// EntityId may be absent for dynamically spawned fabricators — empty string matches no jobs
	const fabricatorId = fabricator.get(EntityId)?.value ?? "";
	const myJobs = snap.fabricationJobs.filter(
		(j) => j.fabricatorId === fabricatorId,
	);

	return (
		<div
			style={{
				marginTop: "8px",
				borderTop: "1px solid #aa884422",
				paddingTop: "6px",
			}}
		>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				style={{
					background: "none",
					border: "none",
					padding: 0,
					cursor: "pointer",
					color: "#aa8844",
					fontSize: "12px",
					fontWeight: "bold",
					fontFamily: "inherit",
					marginBottom: "4px",
				}}
			>
				FABRICATION {expanded ? "[-]" : "[+]"}
			</button>

			{myJobs.length > 0 && (
				<div
					style={{ color: "#00ffaa88", fontSize: "11px", marginBottom: "4px" }}
				>
					{myJobs.map((job) => (
						<div key={job.recipe.name}>
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
								type="button"
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
									padding: "4px 8px",
									fontSize: "11px",
									fontFamily: "'Courier New', monospace",
									cursor: canAfford ? "pointer" : "default",
									marginBottom: "3px",
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
				<div style={{ color: "#ff444488", fontSize: "11px" }}>
					Requires power to fabricate
				</div>
			)}
		</div>
	);
}

function FabricationPanel() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const [expanded, setExpanded] = useState(false);

	let fabricator: Entity | null = null;
	for (const entity of world.query(BuildingTrait)) {
		const b = entity.get(BuildingTrait)!;
		if (b.buildingType === "fabrication_unit" && b.powered && b.operational) {
			fabricator = entity;
			break;
		}
	}

	if (!fabricator) return null;

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
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				style={{
					background: "none",
					border: "none",
					padding: 0,
					cursor: "pointer",
					color: "#aa8844",
					fontWeight: "bold",
					fontFamily: "inherit",
					marginBottom: "4px",
				}}
			>
				FABRICATOR {expanded ? "[-]" : "[+]"}
			</button>

			{snap.fabricationJobs.length > 0 && (
				<div
					style={{ color: "#00ffaa88", fontSize: "11px", marginBottom: "4px" }}
				>
					{snap.fabricationJobs.map((job) => (
						<div key={job.recipe.name}>
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
								type="button"
								key={recipe.name}
								onClick={() => startFabrication(fabricator!, recipe.name)}
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
									padding: "4px 8px",
									fontSize: "11px",
									fontFamily: "'Courier New', monospace",
									cursor: canAfford ? "pointer" : "default",
									marginBottom: "3px",
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

function AudioControls() {
	const [muted, setMuted] = useState(false);
	const [volume, setVolume] = useState(() => getMasterVolume());

	const toggleMute = useCallback(() => {
		if (muted) {
			setMasterVolume(volume);
			setMuted(false);
		} else {
			setMasterVolume(0);
			setMuted(true);
		}
	}, [muted, volume]);

	const handleVolumeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const v = Number.parseFloat(e.target.value);
			setVolume(v);
			setMasterVolume(v);
			if (v > 0) setMuted(false);
		},
		[],
	);

	return (
		<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
			<button
				type="button"
				onClick={toggleMute}
				style={speedButtonStyle(muted)}
				title={muted ? "Unmute" : "Mute"}
			>
				{muted ? "MUTE" : "SND"}
			</button>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={muted ? 0 : volume}
				onChange={handleVolumeChange}
				style={{
					width: "60px",
					accentColor: "#00ffaa",
					cursor: "pointer",
				}}
				title={`Volume: ${Math.round((muted ? 0 : volume) * 100)}%`}
			/>
		</div>
	);
}

function ResourceBadge({
	icon,
	label,
	value,
	color,
}: {
	icon: string;
	label: string;
	value: number;
	color: string;
}) {
	return (
		<span
			title={label}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "4px",
				background: "rgba(0,0,0,0.4)",
				border: `1px solid ${color}44`,
				borderRadius: "4px",
				padding: "3px 8px",
				fontSize: "14px",
				fontWeight: "bold",
				letterSpacing: "0.03em",
			}}
		>
			<span
				style={{
					color,
					fontSize: "11px",
					fontWeight: "normal",
					opacity: 0.8,
				}}
			>
				{icon}
			</span>
			<span style={{ color }}>{value}</span>
		</span>
	);
}

function TemperatureGauge({ value }: { value: number }) {
	const tierDef = getTemperatureTier(value);
	const pct = Math.max(0, Math.min(100, value));

	return (
		<div
			style={{
				display: "flex",
				gap: "6px",
				alignItems: "center",
				fontSize: "13px",
			}}
			title={tierDef.effect}
		>
			<span style={{ color: tierDef.color, whiteSpace: "nowrap" }}>
				HUMAN: {tierDef.displayName.toUpperCase()}
			</span>
			<div
				style={{
					width: "70px",
					height: "8px",
					background: "rgba(255,255,255,0.1)",
					borderRadius: "4px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: "100%",
						background: tierDef.color,
						borderRadius: "3px",
						transition: "width 0.3s ease",
					}}
				/>
			</div>
			<span style={{ color: tierDef.color, fontSize: "12px" }}>{value}</span>
		</div>
	);
}

const SPEED_STEPS = [0.5, 1, 2, 4];

export function GameUI() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);

	// Keyboard shortcuts: Space = pause, +/= = faster, - = slower
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;

			if (e.code === "Space") {
				e.preventDefault();
				togglePause();
			} else if (e.key === "+" || e.key === "=") {
				e.preventDefault();
				const current = getGameSpeed();
				if (isPaused()) {
					togglePause();
				} else {
					const idx = SPEED_STEPS.indexOf(current);
					if (idx < SPEED_STEPS.length - 1) {
						setGameSpeed(SPEED_STEPS[idx + 1]);
					}
				}
			} else if (e.key === "-") {
				e.preventDefault();
				const current = getGameSpeed();
				const idx = SPEED_STEPS.indexOf(current);
				if (idx > 0) {
					setGameSpeed(SPEED_STEPS[idx - 1]);
				}
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	let selectedUnit: Entity | null = null;
	for (const entity of world.query(Unit)) {
		if (entity.get(Unit)!.selected) {
			selectedUnit = entity;
			break;
		}
	}

	let selectedBuilding: Entity | null = null;
	for (const entity of world.query(BuildingTrait)) {
		const b = entity.get(BuildingTrait)!;
		if (b.selected && !entity.has(Unit)) {
			selectedBuilding = entity;
			break;
		}
	}

	const fragmentCount = snap.fragments.length;
	const buildingCount = Array.from(world.query(BuildingTrait)).length;

	const unitData = selectedUnit?.get(Unit);
	const unitComps = selectedUnit
		? parseComponents(selectedUnit.get(UnitComponents)?.componentsJson ?? "[]")
		: [];
	const unitPos = selectedUnit?.get(Position);
	const unitFaction = selectedUnit?.get(Faction)?.value ?? "player";
	const unitBuilding = selectedUnit?.get(BuildingTrait);

	const buildingData = selectedBuilding?.get(BuildingTrait);
	const buildingPos = selectedBuilding?.get(Position);
	const buildingComps = selectedBuilding
		? parseComponents(buildingData?.buildingComponentsJson ?? "[]")
		: [];
	const buildingRod = selectedBuilding?.get(LightningRod);

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
			{/* Top bar — status + speed controls */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "10px 16px",
					background:
						"linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 80%, transparent 100%)",
					pointerEvents: "auto",
					flexWrap: "wrap",
					gap: "6px 0",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "20px",
						fontSize: "15px",
						alignItems: "center",
						fontWeight: "bold",
						letterSpacing: "0.05em",
					}}
				>
					<span title="Player units">{snap.unitCount} UNITS</span>
					<span title="Buildings placed">{buildingCount} BLDG</span>
					{snap.enemyCount > 0 && (
						<span style={{ color: "#ff4444" }} title="Hostile units detected">
							{snap.enemyCount} HOSTILE
						</span>
					)}
					<span title="Map fragments">{fragmentCount} FRAG</span>
				</div>

				<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => setGameSpeed(0.5)}
						style={speedButtonStyle(snap.gameSpeed === 0.5)}
					>
						0.5x
					</button>
					<button
						type="button"
						onClick={() => setGameSpeed(1)}
						style={speedButtonStyle(snap.gameSpeed === 1)}
					>
						1x
					</button>
					<button
						type="button"
						onClick={() => setGameSpeed(2)}
						style={speedButtonStyle(snap.gameSpeed === 2)}
					>
						2x
					</button>
					<button
						type="button"
						onClick={() => setGameSpeed(4)}
						style={speedButtonStyle(snap.gameSpeed === 4)}
					>
						4x
					</button>
					<button
						type="button"
						onClick={togglePause}
						style={speedButtonStyle(snap.paused)}
					>
						{snap.paused ? "PLAY" : "PAUSE"}
					</button>
					<AudioControls />
				</div>
			</div>

			{/* Resource bar — larger, clearer, with colored badges */}
			<div
				style={{
					display: "flex",
					gap: "6px",
					padding: "6px 16px 10px",
					fontSize: "14px",
					color: "#00ffaacc",
					pointerEvents: "auto",
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				<ResourceBadge
					icon="Fe"
					label="Scrap Metal"
					value={snap.resources.scrapMetal}
					color="#88ccaa"
				/>
				<ResourceBadge
					icon="Ci"
					label="Circuitry"
					value={snap.resources.circuitry}
					color="#44ddff"
				/>
				<ResourceBadge
					icon="Pw"
					label="Power Cells"
					value={snap.resources.powerCells}
					color="#ffcc44"
				/>
				<ResourceBadge
					icon="Du"
					label="Durasteel"
					value={snap.resources.durasteel}
					color="#cc88ff"
				/>
				<div style={{ width: "8px" }} />
				<span
					style={{
						color: stormColor(snap.power.stormIntensity),
						fontSize: "13px",
					}}
					title="Storm Intensity"
				>
					STORM {(snap.power.stormIntensity * 100).toFixed(0)}%
				</span>
				<span style={{ fontSize: "13px" }} title="Power Generation / Demand">
					PWR {snap.power.totalGeneration.toFixed(0)}/
					{snap.power.totalDemand.toFixed(0)}
				</span>
				<div style={{ width: "8px" }} />
				<TemperatureGauge value={snap.humanTemperature} />
			</div>

			{/* Selected unit info */}
			{selectedUnit && unitData && unitPos && (
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
					<div
						style={{
							fontSize: "15px",
							fontWeight: "bold",
							marginBottom: "4px",
						}}
					>
						{unitData.displayName}
					</div>
					<div
						style={{
							color: "#00ffaa88",
							fontSize: "11px",
							marginBottom: "6px",
						}}
					>
						{unitData.unitType.replace(/_/g, " ").toUpperCase()}
						{unitFaction !== "player" && (
							<span style={{ color: "#ff4444", marginLeft: "8px" }}>
								HOSTILE
							</span>
						)}
					</div>
					{unitData.speed > 0 && <div>Speed: {unitData.speed.toFixed(1)}</div>}
					{unitBuilding && (
						<div
							style={{
								color: unitBuilding.powered ? "#00ff88" : "#ff4444",
							}}
						>
							{unitBuilding.powered ? "POWERED" : "UNPOWERED"}
							{" / "}
							{unitBuilding.operational ? "OPERATIONAL" : "OFFLINE"}
						</div>
					)}
					<div>
						Pos: ({unitPos.x.toFixed(1)}, {unitPos.z.toFixed(1)})
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
								fontSize: "12px",
								color: "#00ffaa88",
								marginBottom: "4px",
							}}
						>
							COMPONENTS
						</div>
						{unitComps.map((comp) => (
							<ComponentStatus key={comp.name} comp={comp} />
						))}
					</div>

					{unitFaction === "player" && (
						<RepairPanel selectedEntity={selectedUnit} />
					)}

					{unitData.unitType === "fabrication_unit" && unitBuilding && (
						<InlineFabricationPanel fabricator={selectedUnit} />
					)}

					<div
						style={{
							fontSize: "11px",
							color: "#00ffaa88",
							marginTop: "8px",
						}}
					>
						{unitData.speed > 0
							? "Tap to select \u2022 Tap ground to move"
							: "Tap to select"}
					</div>
				</div>
			)}

			{/* Selected building info */}
			{selectedBuilding && buildingData && buildingPos && (
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
					<div
						style={{
							fontSize: "15px",
							fontWeight: "bold",
							marginBottom: "4px",
							color: "#aa8844",
						}}
					>
						{buildingData.buildingType.replace(/_/g, " ").toUpperCase()}
					</div>
					<div
						style={{
							color: "#aa884488",
							fontSize: "11px",
							marginBottom: "6px",
						}}
					>
						{buildingData.powered ? "POWERED" : "UNPOWERED"}
						{" / "}
						{buildingData.operational ? "OPERATIONAL" : "OFFLINE"}
					</div>
					<div>
						Pos: ({buildingPos.x.toFixed(1)}, {buildingPos.z.toFixed(1)})
					</div>

					{buildingComps.length > 0 && (
						<div
							style={{
								marginTop: "8px",
								borderTop: "1px solid #aa884422",
								paddingTop: "8px",
							}}
						>
							<div
								style={{
									fontSize: "12px",
									color: "#aa884488",
									marginBottom: "4px",
								}}
							>
								COMPONENTS
							</div>
							{buildingComps.map((comp) => (
								<ComponentStatus key={comp.name} comp={comp} />
							))}
						</div>
					)}

					{buildingData.buildingType === "lightning_rod" && buildingRod && (
						<div
							style={{
								marginTop: "8px",
								borderTop: "1px solid #aa884422",
								paddingTop: "8px",
							}}
						>
							<div>
								Output: {buildingRod.currentOutput.toFixed(1)} /{" "}
								{buildingRod.rodCapacity}
							</div>
							<div>Radius: {buildingRod.protectionRadius}</div>
						</div>
					)}

					<BuildingRepairPanel selectedBuilding={selectedBuilding} />

					<div
						style={{
							fontSize: "11px",
							color: "#aa884488",
							marginTop: "8px",
						}}
					>
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
					{snap.combatEvents.slice(0, 3).map((e) => (
						<div key={`${e.targetId}-${e.componentDamaged}`}>
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

			<BuildToolbar />
			<FabricationPanel />
			<Minimap />
		</div>
	);
}

function stormColor(intensity: number): string {
	if (intensity > 1.1) return "#ffaa00";
	if (intensity > 0.8) return "#00ffaa";
	return "#00ffaa66";
}

/** City bounds: 48 tiles * 2m = 96 world units, with small margin */
const CITY_EXTENT = 96;
const MAP_SIZE = 150;
const MAP_PAD = 4;

/** Convert city world coords to minimap pixel coords */
function cityToMinimap(worldCoord: number): number {
	return MAP_PAD + (worldCoord / CITY_EXTENT) * (MAP_SIZE - MAP_PAD * 2);
}

/** Get merged fog state at a world position across all fragments (max wins) */
function getMergedFogAt(wx: number, wz: number): number {
	const idx = worldToFogIndex(wx, wz);
	if (idx < 0) return 0;
	let maxFog = 0;
	for (const frag of getAllFragments()) {
		const val = frag.fog[idx] ?? 0;
		if (val > maxFog) maxFog = val;
	}
	return maxFog;
}

function Minimap() {
	// Subscribe to snapshot so minimap redraws on state changes
	useSyncExternalStore(subscribe, getSnapshot);

	return (
		<div
			style={{
				position: "absolute",
				bottom: "16px",
				right: "16px",
				width: `${MAP_SIZE}px`,
				height: `${MAP_SIZE}px`,
				background: "rgba(0, 0, 0, 0.85)",
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
					canvas.width = MAP_SIZE;
					canvas.height = MAP_SIZE;

					// Clear
					ctx.fillStyle = "#0a0a0a";
					ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

					// Draw fog overlay — sample explored state on a coarse grid
					const fogStep = 3;
					for (let px = 0; px < MAP_SIZE; px += fogStep) {
						for (let py = 0; py < MAP_SIZE; py += fogStep) {
							const wx =
								((px - MAP_PAD) / (MAP_SIZE - MAP_PAD * 2)) * CITY_EXTENT;
							const wz =
								((py - MAP_PAD) / (MAP_SIZE - MAP_PAD * 2)) * CITY_EXTENT;
							const fog = getMergedFogAt(wx, wz);
							if (fog >= 2) {
								ctx.fillStyle = "rgba(0,40,30,0.6)";
							} else if (fog >= 1) {
								ctx.fillStyle = "rgba(0,20,15,0.4)";
							} else {
								continue; // leave as dark background
							}
							ctx.fillRect(px, py, fogStep, fogStep);
						}
					}

					// Draw labyrinth walls
					ctx.fillStyle = "#333333";
					for (const bldg of getCityBuildings()) {
						const mx = cityToMinimap(bldg.x);
						const my = cityToMinimap(bldg.z);
						ctx.fillRect(mx, my, 1, 1);
					}

					// Draw player-placed buildings (cyan)
					ctx.fillStyle = "#00aaaa";
					for (const entity of world.query(BuildingTrait, Position)) {
						const pos = entity.get(Position)!;
						const mx = cityToMinimap(pos.x);
						const my = cityToMinimap(pos.z);
						ctx.fillRect(mx - 1, my - 1, 3, 3);
					}

					// Draw units
					for (const entity of world.query(Unit, Faction, Position)) {
						const faction = entity.get(Faction)!.value;
						const pos = entity.get(Position)!;
						const mx = cityToMinimap(pos.x);
						const my = cityToMinimap(pos.z);

						if (faction === "player") {
							ctx.fillStyle = "#00ff88";
							ctx.fillRect(mx - 1, my - 1, 3, 3);
						} else {
							ctx.fillStyle = "#ff3333";
							ctx.fillRect(mx - 1, my - 1, 2, 2);
						}
					}
				}}
				style={{ width: "100%", height: "100%" }}
			/>
		</div>
	);
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
	};
}
