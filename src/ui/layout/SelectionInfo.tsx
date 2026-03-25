/**
 * SelectionInfo — selected unit/building details panel.
 *
 * Shows unit name, mark level, faction, component status bars.
 * Shows "No Selection" when nothing selected.
 */

import type { Entity } from "koota";
import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import {
	BuildingTrait,
	Faction,
	LightningRod,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { parseComponents, type UnitComponent } from "../../ecs/types";
import { world } from "../../ecs/world";
import { getScavengePoints } from "../../systems/resources";
import { cn } from "../lib/utils";

// ─── Component status bar ───────────────────────────────────────────────────

function ComponentBar({ comp }: { comp: UnitComponent }) {
	return (
		<div className="flex items-center gap-1.5">
			<span
				className={cn(
					"inline-block w-2 h-2 rounded-full",
					comp.functional
						? "bg-green-400 shadow-[0_0_4px_theme(colors.green.400)]"
						: "bg-red-500 shadow-[0_0_4px_theme(colors.red.500)]",
				)}
			/>
			<span className="capitalize text-slate-300 text-xs">
				{comp.name.replace(/_/g, " ")}
			</span>
			{!comp.functional && (
				<span className="text-red-500 text-[11px] font-bold">BROKEN</span>
			)}
		</div>
	);
}

// ─── Scavenge indicator ─────────────────────────────────────────────────────

const MATERIAL_COLORS: Record<string, string> = {
	scrapMetal: "text-emerald-300",
	circuitry: "text-sky-400",
	powerCells: "text-amber-400",
	durasteel: "text-violet-400",
};

function ScavengeIndicator({
	x,
	z,
	isIdle,
}: {
	x: number;
	z: number;
	isIdle: boolean;
}) {
	const RANGE = 3.0;
	let nearestType: string | null = null;
	let nearestRemaining = 0;

	for (const site of world.query(Position, ScavengeSite)) {
		const siteData = site.get(ScavengeSite)!;
		if (siteData.remaining <= 0) continue;
		const sPos = site.get(Position)!;
		const dx = sPos.x - x;
		const dz = sPos.z - z;
		if (Math.sqrt(dx * dx + dz * dz) <= RANGE) {
			nearestType = siteData.materialType;
			nearestRemaining = siteData.remaining;
			break;
		}
	}

	if (!nearestType) {
		for (const point of getScavengePoints()) {
			if (point.remaining <= 0) continue;
			const dx = point.x - x;
			const dz = point.z - z;
			if (Math.sqrt(dx * dx + dz * dz) <= RANGE) {
				nearestType = point.type;
				nearestRemaining = point.remaining;
				break;
			}
		}
	}

	if (!nearestType) return null;

	const colorClass = MATERIAL_COLORS[nearestType] ?? "text-amber-400";

	return (
		<div className="mt-2 pt-1.5 border-t border-slate-800">
			<div className={cn("text-[11px] flex items-center gap-1.5", colorClass)}>
				<span
					className={cn(
						"inline-block w-2 h-2 rounded-full",
						isIdle ? "animate-pulse" : "opacity-30",
					)}
					style={{
						backgroundColor: "currentColor",
						boxShadow: isIdle ? "0 0 6px currentColor" : "none",
					}}
				/>
				{isIdle ? "SCAVENGING" : "RESOURCE NEARBY"}
				<span className="opacity-60 text-[10px]">
					{nearestType.replace(/([A-Z])/g, " $1").trim()} ({nearestRemaining}{" "}
					left)
				</span>
			</div>
		</div>
	);
}

// ─── Unit info panel ────────────────────────────────────────────────────────

function UnitInfo({ entity }: { entity: Entity }) {
	const unitData = entity.get(Unit)!;
	const unitComps = parseComponents(
		entity.get(UnitComponents)?.componentsJson ?? "[]",
	);
	const unitPos = entity.get(Position)!;
	const unitFaction = entity.get(Faction)?.value ?? "player";

	return (
		<div className="space-y-1">
			<div className="text-sm font-bold text-cyan-400">
				{unitData.displayName}
			</div>
			<div className="text-[11px] text-slate-400 flex items-center gap-2">
				<span>{unitData.unitType.replace(/_/g, " ").toUpperCase()}</span>
				{unitData.mark > 1 && (
					<span className="text-cyan-500">MK{unitData.mark}</span>
				)}
				{unitFaction !== "player" && (
					<span className="text-red-500 font-bold">HOSTILE</span>
				)}
			</div>
			<div className="text-[11px] text-slate-500">
				({unitPos.x.toFixed(1)}, {unitPos.z.toFixed(1)})
			</div>

			{/* Components */}
			<div className="pt-1.5 mt-1 border-t border-slate-800 space-y-0.5">
				<div className="text-[11px] text-slate-500 mb-0.5">COMPONENTS</div>
				{unitComps.map((comp) => (
					<ComponentBar key={comp.name} comp={comp} />
				))}
			</div>

			{/* Scavenge indicator */}
			{unitFaction === "player" && (
				<ScavengeIndicator
					x={unitPos.x}
					z={unitPos.z}
					isIdle={!entity.get(Navigation)?.moving}
				/>
			)}
		</div>
	);
}

// ─── Building info panel ────────────────────────────────────────────────────

function BuildingInfo({ entity }: { entity: Entity }) {
	const building = entity.get(BuildingTrait)!;
	const buildingPos = entity.get(Position)!;
	const buildingComps = parseComponents(
		building.buildingComponentsJson ?? "[]",
	);
	const rod = entity.get(LightningRod);

	return (
		<div className="space-y-1">
			<div className="text-sm font-bold text-amber-500">
				{building.buildingType.replace(/_/g, " ").toUpperCase()}
			</div>
			<div className="text-[11px] text-slate-400">
				{building.powered ? "POWERED" : "UNPOWERED"}
				{" / "}
				{building.operational ? "OPERATIONAL" : "OFFLINE"}
			</div>
			<div className="text-[11px] text-slate-500">
				({buildingPos.x.toFixed(1)}, {buildingPos.z.toFixed(1)})
			</div>

			{buildingComps.length > 0 && (
				<div className="pt-1.5 mt-1 border-t border-slate-800 space-y-0.5">
					<div className="text-[11px] text-slate-500 mb-0.5">COMPONENTS</div>
					{buildingComps.map((comp) => (
						<ComponentBar key={comp.name} comp={comp} />
					))}
				</div>
			)}

			{building.buildingType === "lightning_rod" && rod && (
				<div className="pt-1.5 mt-1 border-t border-slate-800 text-xs text-slate-300">
					<div>
						Output: {rod.currentOutput.toFixed(1)} / {rod.rodCapacity}
					</div>
					<div>Radius: {rod.protectionRadius}</div>
				</div>
			)}
		</div>
	);
}

// ─── SelectionInfo (exported) ───────────────────────────────────────────────

export function SelectionInfo() {
	// Subscribe to ECS changes so we re-render on selection/state changes
	useSyncExternalStore(subscribe, getSnapshot);

	// Find selected unit
	let selectedUnit: Entity | null = null;
	for (const entity of world.query(Unit)) {
		if (entity.get(Unit)!.selected) {
			selectedUnit = entity;
			break;
		}
	}

	// Find selected building (non-unit)
	let selectedBuilding: Entity | null = null;
	if (!selectedUnit) {
		for (const entity of world.query(BuildingTrait)) {
			const b = entity.get(BuildingTrait)!;
			if (b.selected && !entity.has(Unit)) {
				selectedBuilding = entity;
				break;
			}
		}
	}

	if (selectedUnit) {
		return <UnitInfo entity={selectedUnit} />;
	}

	if (selectedBuilding) {
		return <BuildingInfo entity={selectedBuilding} />;
	}

	return (
		<div className="text-slate-600 text-xs italic text-center py-4">
			No Selection
		</div>
	);
}
