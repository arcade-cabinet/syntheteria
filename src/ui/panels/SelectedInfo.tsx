import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import type { Entity } from "../../ecs/traits";
import {
	Building,
	Identity,
	LightningRod,
	Unit,
	type UnitComponent,
	WorldPosition,
} from "../../ecs/traits";
import { buildings, units } from "../../ecs/world";
import { RECIPES, startFabrication } from "../../systems/fabrication";
import { startRepair } from "../../systems/repair";
import { HudButton } from "../components/HudButton";
import { HudPanel } from "../components/HudPanel";

function ComponentStatus({ comp }: { comp: UnitComponent }) {
	const isOk = comp.functional;
	return (
		<View className="flex-row items-center gap-2 py-1">
			<View
				className={`w-2 h-2 rounded-full ${isOk ? "bg-emerald-400 shadow-emerald-400" : "bg-red-500 shadow-red-500"} shadow`}
			/>
			<Text className="font-mono text-sm text-gray-300 capitalize">
				{comp.name.replace(/_/g, " ")}
			</Text>
			{!isOk && (
				<Text className="font-mono text-xs text-red-500 ml-auto">ERR</Text>
			)}
		</View>
	);
}

function RepairList({
	entity,
	targetType,
}: {
	entity: Entity;
	targetType: "unit" | "building";
}) {
	const compList =
		targetType === "unit"
			? entity.get(Unit)?.components
			: entity.get(Building)?.components;
	const brokenComps = compList?.filter((c) => !c.functional) || [];

	if (brokenComps.length === 0) return null;

	const repairer = Array.from(units).find((u) => {
		if (u.get(Identity)?.id === entity.get(Identity)?.id) return false;
		if (u.get(Identity)?.faction !== "player") return false;
		if (!u.get(Unit)?.components.some((c) => c.name === "arms" && c.functional))
			return false;
		const dx = u.get(WorldPosition)?.x - entity.get(WorldPosition)?.x;
		const dz = u.get(WorldPosition)?.z - entity.get(WorldPosition)?.z;
		return Math.sqrt(dx * dx + dz * dz) < 3.0;
	});

	return (
		<View className="mt-2 pt-2 border-t border-emerald-500/20">
			<Text className="font-mono text-xs text-emerald-400/80 mb-2">
				{repairer
					? `REPAIR LINK (${repairer.get(Unit)?.displayName})`
					: "NO REPAIR DRONE IN RANGE"}
			</Text>
			{brokenComps.map((comp, i) => (
				<HudButton
					key={i}
					label={`FIX ${comp.name.replace(/_/g, " ")}`}
					variant="secondary"
					disabled={!repairer}
					className="mb-1 py-2"
					onPress={() => repairer && startRepair(repairer, entity, comp.name)}
				/>
			))}
		</View>
	);
}

function FabList({ fabricator }: { fabricator: Entity }) {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const isPowered =
		fabricator.get(Building)?.powered && fabricator.get(Building)?.operational;
	const myJobs = snap.fabricationJobs.filter(
		(j) => j.fabricatorId === fabricator.get(Identity)?.id,
	);

	return (
		<View className="mt-2 pt-2 border-t border-amber-500/20">
			<Text className="font-mono text-xs text-amber-500/80 mb-2">
				FABRICATION PROTOCOLS
			</Text>
			{myJobs.map((job, i) => (
				<Text key={i} className="font-mono text-xs text-emerald-400 mb-1">
					&gt; {job.recipe.name}: {job.ticksRemaining}t
				</Text>
			))}
			{!isPowered ? (
				<Text className="font-mono text-xs text-red-500">
					OFFLINE: REQUIRES POWER
				</Text>
			) : (
				<View className="gap-2 mt-2">
					{RECIPES.map((recipe) => {
						const canAfford = recipe.costs.every(
							(c) => snap.resources[c.type] >= c.amount,
						);
						return (
							<HudButton
								key={recipe.name}
								label={`${recipe.name} (${recipe.buildTime}t)`}
								variant="secondary"
								disabled={!canAfford}
								onPress={() => startFabrication(fabricator, recipe.name)}
							/>
						);
					})}
				</View>
			)}
		</View>
	);
}

export function SelectedInfo() {
	const _snap = useSyncExternalStore(subscribe, getSnapshot);
	const selectedUnit = Array.from(units).find((u) => u.get(Unit)?.selected);
	const selectedBuilding = Array.from(buildings).find(
		(b) => b.get(Building)?.selected && !b.get(Unit),
	);

	if (!selectedUnit && !selectedBuilding) return null;

	if (selectedUnit) {
		const u = selectedUnit.get(Unit)!;
		const id = selectedUnit.get(Identity)!;
		const wp = selectedUnit.get(WorldPosition)!;
		const b = selectedUnit.get(Building);

		return (
			<View className="absolute bottom-6 left-4 w-72 pointer-events-auto">
				<HudPanel
					title={u.displayName}
					variant={id.faction === "player" ? "default" : "warning"}
				>
					<Text className="font-mono text-xs text-gray-400 mb-2">
						CLASS: {u.type.replace(/_/g, " ").toUpperCase()}{" "}
						{id.faction !== "player" && "[HOSTILE]"}
					</Text>

					{u.speed > 0 && (
						<Text className="font-mono text-xs text-emerald-400">
							VELOCITY: {u.speed.toFixed(1)} u/s
						</Text>
					)}
					<Text className="font-mono text-xs text-emerald-400/60 mb-2">
						COORDS: X:{wp.x.toFixed(1)} Z:{wp.z.toFixed(1)}
					</Text>

					{b && (
						<Text
							className={`font-mono text-xs ${b.powered ? "text-emerald-400" : "text-red-500"} mb-2`}
						>
							SYS: {b.powered ? "POWERED" : "UNPOWERED"} /{" "}
							{b.operational ? "ONLINE" : "OFFLINE"}
						</Text>
					)}

					<View className="mt-2 border-t border-emerald-500/20 pt-2">
						<Text className="font-mono text-xs text-emerald-400/80 mb-1">
							HARDWARE STATUS
						</Text>
						{u.components.map((comp, i) => (
							<ComponentStatus key={i} comp={comp} />
						))}
					</View>

					{id.faction === "player" && (
						<RepairList entity={selectedUnit} targetType="unit" />
					)}
					{u.type === "fabrication_unit" && b && (
						<FabList fabricator={selectedUnit} />
					)}
				</HudPanel>
			</View>
		);
	}

	if (selectedBuilding) {
		const b = selectedBuilding.get(Building)!;
		const wp = selectedBuilding.get(WorldPosition)!;
		const rod = selectedBuilding.get(LightningRod);

		return (
			<View className="absolute bottom-6 left-4 w-72 pointer-events-auto">
				<HudPanel title={b.type.replace(/_/g, " ")} variant="warning">
					<Text
						className={`font-mono text-xs ${b.powered ? "text-emerald-400" : "text-red-500"} mb-2`}
					>
						SYS: {b.powered ? "POWERED" : "UNPOWERED"} /{" "}
						{b.operational ? "ONLINE" : "OFFLINE"}
					</Text>
					<Text className="font-mono text-xs text-amber-500/60 mb-2">
						COORDS: X:{wp.x.toFixed(1)} Z:{wp.z.toFixed(1)}
					</Text>

					{b.components.length > 0 && (
						<View className="mt-2 border-t border-amber-500/20 pt-2">
							<Text className="font-mono text-xs text-amber-500/80 mb-1">
								HARDWARE STATUS
							</Text>
							{b.components.map((comp, i) => (
								<ComponentStatus key={i} comp={comp} />
							))}
						</View>
					)}

					{rod && (
						<View className="mt-2 border-t border-amber-500/20 pt-2">
							<Text className="font-mono text-xs text-amber-500">
								OUTPUT: {rod.currentOutput.toFixed(1)}/{rod.rodCapacity} MW
							</Text>
							<Text className="font-mono text-xs text-amber-500/80">
								GRID RADIUS: {rod.protectionRadius}m
							</Text>
						</View>
					)}

					<RepairList entity={selectedBuilding} targetType="building" />
				</HudPanel>
			</View>
		);
	}

	return null;
}
