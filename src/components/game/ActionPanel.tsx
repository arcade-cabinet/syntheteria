/**
 * ActionPanel — context-sensitive action buttons based on selection.
 *
 * Unit selected: MOVE, ATTACK, SCAVENGE, FOUND BASE, HACK, STANCE cycle.
 * Building selected: building-specific actions.
 * Nothing selected: empty.
 *
 * All buttons are clickable — NO keyboard shortcuts required.
 */

import type { Entity } from "koota";
import { useSyncExternalStore } from "react";
import { worldToTileX, worldToTileZ } from "../../board/coords";
import { getUpgradeCost, MAX_MARK } from "../../config/robotDefs";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import {
	BuildingTrait,
	EngagementRule,
	EntityId,
	Faction,
	Position,
	ScavengeSite,
	Unit,
	UnitComponents,
} from "../../ecs/traits";
import { parseComponents } from "../../ecs/types";
import { world } from "../../ecs/world";
import { foundBase, validateBaseLocation } from "../../systems/baseManagement";
import { canUpgrade, performUpgrade } from "../../systems/upgrade";
import { selectBase } from "../base/BasePanel";
import { cn } from "../../lib/utils";

// ─── Stance labels ──────────────────────────────────────────────────────────

const STANCE_LABELS: Record<string, string> = {
	attack: "ATK",
	protect: "DEF",
	flee: "FLEE",
	hold: "HOLD",
};

const STANCE_ORDER = ["attack", "protect", "hold", "flee"] as const;

// ─── Action button ──────────────────────────────────────────────────────────

function ActionButton({
	label,
	enabled = true,
	active = false,
	onClick,
	title,
}: {
	label: string;
	enabled?: boolean;
	active?: boolean;
	onClick: () => void;
	title?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!enabled}
			title={title}
			className={cn(
				"w-full px-2 py-2 text-xs font-mono rounded",
				"border transition-colors duration-150",
				"min-h-[40px]",
				enabled
					? active
						? "bg-cyan-400/20 border-cyan-400 text-cyan-400 cursor-pointer"
						: "bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-400 cursor-pointer"
					: "bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed",
			)}
		>
			{label}
		</button>
	);
}

// ─── Unit actions ───────────────────────────────────────────────────────────

function UnitActions({ entity }: { entity: Entity }) {
	const unitData = entity.get(Unit)!;
	const unitFaction = entity.get(Faction)?.value ?? "player";
	const unitPos = entity.get(Position)!;
	const comps = parseComponents(
		entity.get(UnitComponents)?.componentsJson ?? "[]",
	);
	const hasArms = comps.some((c) => c.name === "arms" && c.functional);
	const hasLegs = comps.some((c) => c.name === "legs" && c.functional);

	// Check for nearby scavenge sites
	const SCAVENGE_RANGE = 3.0;
	let nearbyScavenge = false;
	for (const site of world.query(Position, ScavengeSite)) {
		const siteData = site.get(ScavengeSite)!;
		if (siteData.remaining <= 0) continue;
		const sPos = site.get(Position)!;
		const dx = sPos.x - unitPos.x;
		const dz = sPos.z - unitPos.z;
		if (Math.sqrt(dx * dx + dz * dz) <= SCAVENGE_RANGE) {
			nearbyScavenge = true;
			break;
		}
	}

	// Current stance
	const currentStance = entity.get(EngagementRule)?.value ?? "attack";

	// Cycle stance
	const cycleStance = () => {
		const idx = STANCE_ORDER.indexOf(
			currentStance as (typeof STANCE_ORDER)[number],
		);
		const next = STANCE_ORDER[(idx + 1) % STANCE_ORDER.length];
		if (entity.has(EngagementRule)) {
			entity.set(EngagementRule, { value: next });
		}
	};

	if (unitFaction !== "player") {
		return (
			<div className="text-slate-500 text-xs italic text-center py-2">
				Hostile unit
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-1">
			{/* MOVE: instructional text, not a clickable action */}
			<div
				className="w-full px-2 py-2 text-xs font-mono rounded border min-h-[40px] flex items-center justify-center bg-slate-900/50 border-slate-700 text-slate-400 italic"
				title="Click the ground to move selected units"
			>
				{hasLegs && unitData.speed > 0 ? "Click ground to move" : "Cannot move"}
			</div>
			<ActionButton
				label="ATTACK"
				enabled={hasArms}
				title="Attack nearby enemies"
				onClick={() => {
					if (entity.has(EngagementRule)) {
						entity.set(EngagementRule, { value: "attack" });
					}
				}}
			/>
			{/* SCAVENGE: status indicator, not a clickable action */}
			<div
				className={cn(
					"w-full px-2 py-2 text-xs font-mono rounded border min-h-[40px] flex items-center justify-center",
					nearbyScavenge
						? "bg-green-900/30 border-green-500/40 text-green-400"
						: "bg-slate-900/50 border-slate-800 text-slate-600",
				)}
				title={
					nearbyScavenge
						? "Auto-scavenging nearby resources"
						: "Move near resources to scavenge"
				}
			>
				{nearbyScavenge ? "AUTO-SCAVENGING" : "SCAVENGE"}
			</div>
			<ActionButton
				label="FOUND BASE"
				enabled={hasArms}
				title="Establish a new base at this unit's position"
				onClick={() => {
					const tileX = worldToTileX(unitPos.x);
					const tileZ = worldToTileZ(unitPos.z);
					const error = validateBaseLocation(world, tileX, tileZ, "player");
					if (error) {
						console.warn("[ActionPanel] Cannot found base:", error);
						return;
					}
					const baseName = `Base ${Date.now().toString(36).slice(-4).toUpperCase()}`;
					const baseEntity = foundBase(world, tileX, tileZ, "player", baseName);
					const baseId = baseEntity.get(EntityId)?.value;
					if (baseId) selectBase(baseId);
				}}
			/>
			<ActionButton
				label={`STANCE: ${STANCE_LABELS[currentStance] ?? "ATK"}`}
				active
				title={`Current: ${currentStance}. Click to cycle.`}
				onClick={cycleStance}
			/>
			{/* UPGRADE: move from RadialMenu to ActionPanel */}
			{unitData.mark < MAX_MARK && (
				<ActionButton
					label={`UPGRADE Mk${unitData.mark + 1}`}
					enabled={canUpgrade(entity) !== null}
					title={
						canUpgrade(entity) !== null
							? `Upgrade to Mark ${unitData.mark + 1}`
							: (() => {
									const costs = getUpgradeCost(
										unitData.unitType,
										unitData.mark,
									);
									return costs
										? `Need: ${costs.map((c) => `${c.amount} ${c.type}`).join(", ")} (at powered fab)`
										: "Max mark reached";
								})()
					}
					onClick={() => {
						performUpgrade(entity);
					}}
				/>
			)}
		</div>
	);
}

// ─── ActionPanel (exported) ─────────────────────────────────────────────────

export function ActionPanel() {
	// Subscribe to ECS changes
	useSyncExternalStore(subscribe, getSnapshot);

	// Find selected player unit
	let selectedUnit: Entity | null = null;
	for (const entity of world.query(Unit, Faction)) {
		if (entity.get(Unit)!.selected && entity.get(Faction)!.value === "player") {
			selectedUnit = entity;
			break;
		}
	}

	// Find selected building
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
		return <UnitActions entity={selectedUnit} />;
	}

	if (selectedBuilding) {
		return (
			<div className="text-slate-500 text-xs italic text-center py-2">
				Building selected
			</div>
		);
	}

	return null;
}
