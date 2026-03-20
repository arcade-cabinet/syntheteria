import { useSyncExternalStore } from "react";
import { readAIState } from "../../ai";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import type { Entity } from "../../ecs/traits";
import {
	AIController,
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
import {
	AlertIcon,
	BoltIcon,
	DroneIcon,
	FactoryIcon,
	MapIcon,
	WrenchIcon,
} from "../icons";

function formatAgentLabel(value: string) {
	return value.replace(/_/g, " ");
}

function SectionLabel({ children }: { children: string }) {
	return (
		<span className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 block">
			{children}
		</span>
	);
}

function StatRow({
	label,
	value,
	tone = "mint",
}: {
	label: string;
	value: string;
	tone?: "mint" | "amber" | "crimson";
}) {
	const valueClass =
		tone === "amber"
			? "text-[#ffe5a6]"
			: tone === "crimson"
				? "text-[#ffd6d6]"
				: "text-[#dbfff3]";

	return (
		<div className="flex flex-row items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
			<span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
				{label}
			</span>
			<span
				className={`font-mono text-[11px] uppercase tracking-[0.08em] ${valueClass}`}
			>
				{value}
			</span>
		</div>
	);
}

function ComponentStatus({ comp }: { comp: UnitComponent }) {
	const isOk = comp.functional;
	return (
		<div className="flex flex-row items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2">
			<div className="flex flex-row items-center gap-2">
				<div
					className={`h-2.5 w-2.5 rounded-full ${isOk ? "bg-[#6ff3c8]" : "bg-[#ff8f8f]"}`}
				/>
				<span className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/75">
					{comp.name.replace(/_/g, " ")}
				</span>
			</div>
			<span
				className={`font-mono text-[10px] uppercase tracking-[0.16em] ${isOk ? "text-[#7ee7cb]" : "text-[#ff9f9f]"}`}
			>
				{isOk ? "Online" : "Fault"}
			</span>
		</div>
	);
}

function AgentStatusBlock({ entity }: { entity: Entity }) {
	const controller = entity.get(AIController);
	if (!controller) {
		return null;
	}

	const state = readAIState(entity);
	const activeTask = state?.task;

	return (
		<div className="mt-4">
			<SectionLabel>AI Runtime</SectionLabel>
			<div className="flex flex-col gap-2">
				<StatRow label="Role" value={formatAgentLabel(controller.role)} />
				<StatRow
					label="Status"
					value={formatAgentLabel(state?.status ?? "idle")}
					tone={state?.status === "blocked" ? "crimson" : "mint"}
				/>
				<StatRow
					label="Task"
					value={formatAgentLabel(activeTask?.kind ?? "idle")}
					tone={activeTask ? "amber" : "mint"}
				/>
				{activeTask && (
					<StatRow
						label="Phase"
						value={formatAgentLabel(activeTask.phase)}
						tone="amber"
					/>
				)}
			</div>
		</div>
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
	const brokenComps =
		compList?.filter((component) => !component.functional) || [];

	if (brokenComps.length === 0) return null;

	const repairer = Array.from(units).find((unit) => {
		if (unit.get(Identity)?.id === entity.get(Identity)?.id) return false;
		if (unit.get(Identity)?.faction !== "player") return false;
		if (
			!unit
				.get(Unit)
				?.components.some(
					(component) => component.name === "arms" && component.functional,
				)
		) {
			return false;
		}
		const dx = unit.get(WorldPosition)!.x - entity.get(WorldPosition)!.x;
		const dz = unit.get(WorldPosition)!.z - entity.get(WorldPosition)!.z;
		return Math.sqrt(dx * dx + dz * dz) < 3.0;
	});

	return (
		<div className="mt-4">
			<SectionLabel>Repair Orders</SectionLabel>
			<div className="flex flex-col gap-2">
				<span className="font-mono text-[11px] text-white/55">
					{repairer
						? `Repair drone linked: ${repairer.get(Unit)?.displayName}`
						: "No repair drone in range"}
				</span>
				{brokenComps.map((component) => (
					<HudButton
						key={component.name}
						label={`Repair ${component.name.replace(/_/g, " ")}`}
						meta="dispatch maintenance action"
						icon={<WrenchIcon width={16} height={16} color="#89d9ff" />}
						variant="secondary"
						disabled={!repairer}
						onPress={() =>
							repairer && startRepair(repairer, entity, component.name)
						}
					/>
				))}
			</div>
		</div>
	);
}

function FabList({ fabricator }: { fabricator: Entity }) {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const building = fabricator.get(Building);
	const isPowered = building?.powered && building.operational;
	const jobs = snap.fabricationJobs.filter(
		(job) => job.fabricatorId === fabricator.get(Identity)?.id,
	);

	return (
		<div className="mt-4">
			<SectionLabel>Fabrication Queue</SectionLabel>
			<div className="flex flex-col gap-2">
				{jobs.map((job) => (
					<StatRow
						key={`${job.fabricatorId}-${job.recipe.name}`}
						label={job.recipe.name}
						value={`${job.ticksRemaining} ticks`}
						tone="amber"
					/>
				))}
				{!isPowered ? (
					<span className="font-mono text-[11px] text-[#ff9f9f]">
						Offline. Restore power before queuing fabrication.
					</span>
				) : (
					RECIPES.map((recipe) => {
						const canAfford = recipe.costs.every(
							(cost) => (snap.resources[cost.type] ?? 0) >= cost.amount,
						);
						return (
							<HudButton
								key={recipe.name}
								label={recipe.name}
								meta={`${recipe.buildTime} ticks`}
								icon={<FactoryIcon width={16} height={16} color="#f6c56a" />}
								variant="utility"
								disabled={!canAfford}
								onPress={() => startFabrication(fabricator, recipe.name)}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}

export function SelectedInfo() {
	const _snap = useSyncExternalStore(subscribe, getSnapshot);
	const selectedUnit = Array.from(units).find(
		(unit) => unit.get(Unit)?.selected,
	);
	const selectedBuilding = Array.from(buildings).find(
		(building) => building.get(Building)?.selected && !building.get(Unit),
	);

	if (!selectedUnit && !selectedBuilding) return null;

	if (selectedUnit) {
		const unit = selectedUnit.get(Unit)!;
		const identity = selectedUnit.get(Identity)!;
		const position = selectedUnit.get(WorldPosition)!;
		const building = selectedUnit.get(Building);
		const variant = identity.faction === "player" ? "default" : "danger";

		return (
			<div className="absolute bottom-6 left-4 right-4 md:right-auto md:w-[358px] pointer-events-auto">
				<HudPanel
					title={unit.displayName}
					eyebrow={
						identity.faction === "player"
							? "Controlled Unit"
							: "Hostile Signature"
					}
					variant={variant}
				>
					<div className="flex flex-row items-center gap-2">
						<div className="h-9 w-9 flex items-center justify-center rounded-2xl border border-white/8 bg-white/5">
							{identity.faction === "player" ? (
								<DroneIcon width={18} height={18} color="#7ee7cb" />
							) : (
								<AlertIcon width={18} height={18} color="#ff9f9f" />
							)}
						</div>
						<span className="flex-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
							{unit.type.replace(/_/g, " ")}
						</span>
					</div>

					<div className="mt-4 flex flex-col gap-2">
						<StatRow
							label="Position"
							value={`X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)}`}
						/>
						{unit.speed > 0 && (
							<StatRow
								label="Velocity"
								value={`${unit.speed.toFixed(1)} u/s`}
							/>
						)}
						{building && (
							<StatRow
								label="System"
								value={`${building.powered ? "Powered" : "Unpowered"} · ${building.operational ? "Online" : "Offline"}`}
								tone={building.powered ? "mint" : "crimson"}
							/>
						)}
					</div>

					<AgentStatusBlock entity={selectedUnit} />

					<div className="mt-4">
						<SectionLabel>Hardware</SectionLabel>
						<div className="flex flex-col gap-2">
							{unit.components.map((component) => (
								<ComponentStatus key={component.name} comp={component} />
							))}
						</div>
					</div>

					{identity.faction === "player" && (
						<RepairList entity={selectedUnit} targetType="unit" />
					)}
					{unit.type === "fabrication_unit" && building && (
						<FabList fabricator={selectedUnit} />
					)}
				</HudPanel>
			</div>
		);
	}

	if (selectedBuilding) {
		const building = selectedBuilding.get(Building)!;
		const position = selectedBuilding.get(WorldPosition)!;
		const rod = selectedBuilding.get(LightningRod);

		return (
			<div className="absolute bottom-6 left-4 right-4 md:right-auto md:w-[358px] pointer-events-auto">
				<HudPanel
					title={building.type.replace(/_/g, " ")}
					eyebrow="Structure Link"
					variant="warning"
				>
					<div className="flex flex-row items-center gap-2">
						<div className="h-9 w-9 flex items-center justify-center rounded-2xl border border-white/8 bg-white/5">
							<BoltIcon width={18} height={18} color="#f6c56a" />
						</div>
						<span className="flex-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
							Infrastructure node
						</span>
					</div>

					<div className="mt-4 flex flex-col gap-2">
						<StatRow
							label="System"
							value={`${building.powered ? "Powered" : "Unpowered"} · ${building.operational ? "Online" : "Offline"}`}
							tone={building.powered ? "amber" : "crimson"}
						/>
						<StatRow
							label="Position"
							value={`X ${position.x.toFixed(1)} · Z ${position.z.toFixed(1)}`}
							tone="amber"
						/>
						{rod && (
							<>
								<StatRow
									label="Output"
									value={`${rod.currentOutput.toFixed(1)} / ${rod.rodCapacity} MW`}
									tone="amber"
								/>
								<StatRow
									label="Radius"
									value={`${rod.protectionRadius} m`}
									tone="amber"
								/>
							</>
						)}
					</div>

					{building.components.length > 0 && (
						<div className="mt-4">
							<SectionLabel>Hardware</SectionLabel>
							<div className="flex flex-col gap-2">
								{building.components.map((component) => (
									<ComponentStatus key={component.name} comp={component} />
								))}
							</div>
						</div>
					)}

					<RepairList entity={selectedBuilding} targetType="building" />
				</HudPanel>
			</div>
		);
	}

	return null;
}
