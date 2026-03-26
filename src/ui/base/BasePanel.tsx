/**
 * BasePanel — side panel for base management.
 *
 * Slides from the right when a base is selected. Shows:
 * - Header: name + faction badge
 * - Production queue with progress bars
 * - Infrastructure list
 * - Power gauge (generation)
 * - Storage grid
 * - Garrison (units at this base)
 *
 * All interactions are click-based.
 */

import { useEffect, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { Base, EntityId, Faction, Position, Unit } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	type BaseStorage,
	getBaseStorage,
	getInfrastructure,
	getProductionQueue,
	type InfrastructureItem,
	type ProductionItem,
} from "../../systems/baseManagement";
import { cn } from "../lib/utils";

// ─── Selected base state ────────────────────────────────────────────────────

let selectedBaseEntityId: string | null = null;
const basePanelListeners = new Set<() => void>();

function notifyBasePanelListeners() {
	for (const listener of basePanelListeners) {
		listener();
	}
}

export function selectBase(entityId: string | null): void {
	selectedBaseEntityId = entityId;
	notifyBasePanelListeners();
}

export function getSelectedBaseId(): string | null {
	return selectedBaseEntityId;
}

function subscribeBasePanel(listener: () => void): () => void {
	basePanelListeners.add(listener);
	return () => basePanelListeners.delete(listener);
}

function getBasePanelSnapshot(): string | null {
	return selectedBaseEntityId;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FactionBadge({ factionId }: { factionId: string }) {
	const isPlayer = factionId === "player";
	return (
		<span
			className={cn(
				"text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
				isPlayer
					? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
					: "bg-red-500/20 text-red-400 border border-red-500/30",
			)}
		>
			{isPlayer ? "PLAYER" : "CULT"}
		</span>
	);
}

function ProductionQueueSection({ queue }: { queue: ProductionItem[] }) {
	if (queue.length === 0) {
		return (
			<div className="text-slate-600 text-xs italic">No production queued</div>
		);
	}

	return (
		<div className="space-y-1.5">
			{queue.map((item, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: production queue is ordered, index is stable
					key={`${item.unitType}-${i}`}
					className="bg-slate-800/50 rounded p-1.5"
				>
					<div className="flex justify-between text-xs mb-1">
						<span className="text-slate-300">
							{item.unitType.replace(/_/g, " ")}
						</span>
						<span className="text-cyan-400">
							{Math.floor(item.progress * 100)}%
						</span>
					</div>
					<div className="w-full bg-slate-700 rounded-full h-1.5">
						<div
							className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
							style={{ width: `${Math.min(100, item.progress * 100)}%` }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

function InfrastructureSection({ items }: { items: InfrastructureItem[] }) {
	if (items.length === 0) {
		return (
			<div className="text-slate-600 text-xs italic">No infrastructure</div>
		);
	}

	return (
		<div className="space-y-1">
			{items.map((item) => (
				<div
					key={item.type}
					className="flex justify-between text-xs bg-slate-800/50 rounded px-2 py-1"
				>
					<span className="text-slate-300">{item.type.replace(/_/g, " ")}</span>
					<span className="text-cyan-400">x{item.count}</span>
				</div>
			))}
		</div>
	);
}

function PowerGauge({ power }: { power: number }) {
	const maxDisplay = 50; // Display scale
	const pct = Math.min(100, (power / maxDisplay) * 100);

	return (
		<div>
			<div className="flex justify-between text-xs mb-1">
				<span className="text-slate-400">Output</span>
				<span className="text-cyan-400">{power} kW</span>
			</div>
			<div className="w-full bg-slate-700 rounded-full h-2">
				<div
					className={cn(
						"h-2 rounded-full transition-all duration-300",
						power > 0 ? "bg-cyan-400" : "bg-slate-600",
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

function StorageGrid({ storage }: { storage: BaseStorage }) {
	const entries = Object.entries(storage);
	if (entries.length === 0) {
		return <div className="text-slate-600 text-xs italic">Storage empty</div>;
	}

	return (
		<div className="grid grid-cols-2 gap-1">
			{entries.map(([type, amount]) => (
				<div key={type} className="bg-slate-800/50 rounded px-2 py-1 text-xs">
					<div className="text-slate-400 truncate">
						{type.replace(/([A-Z])/g, " $1").trim()}
					</div>
					<div className="text-cyan-400 font-bold">{amount}</div>
				</div>
			))}
		</div>
	);
}

function GarrisonSection({
	baseTileX,
	baseTileZ,
}: {
	baseTileX: number;
	baseTileZ: number;
}) {
	// Find player units near this base (within 5 tiles)
	const GARRISON_RANGE = 10; // world units (5 tiles * TILE_SIZE_M=2)
	const units: { id: string; unitType: string; displayName: string }[] = [];

	for (const entity of world.query(Unit, Position, EntityId, Faction)) {
		if (entity.get(Faction)!.value !== "player") continue;
		const pos = entity.get(Position)!;
		// Convert base tile to world coords for comparison
		const bwx = baseTileX * 2; // TILE_SIZE_M = 2
		const bwz = baseTileZ * 2;
		const dx = pos.x - bwx;
		const dz = pos.z - bwz;
		if (Math.sqrt(dx * dx + dz * dz) <= GARRISON_RANGE) {
			const unit = entity.get(Unit)!;
			units.push({
				id: entity.get(EntityId)!.value,
				unitType: unit.unitType,
				displayName: unit.displayName,
			});
		}
	}

	if (units.length === 0) {
		return (
			<div className="text-slate-600 text-xs italic">No units garrisoned</div>
		);
	}

	return (
		<div className="space-y-1">
			{units.map((u) => (
				<div
					key={u.id}
					className="flex justify-between text-xs bg-slate-800/50 rounded px-2 py-1"
				>
					<span className="text-slate-300">
						{u.displayName || u.unitType.replace(/_/g, " ")}
					</span>
					<span className="text-slate-500 text-[10px]">{u.id}</span>
				</div>
			))}
		</div>
	);
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
				{title}
			</h3>
			{children}
		</div>
	);
}

// ─── BasePanel (exported) ────────────────────────────────────────────────────

export function BasePanel() {
	// Subscribe to both ECS changes and base panel selection
	useSyncExternalStore(subscribe, getSnapshot);
	const selectedId = useSyncExternalStore(
		subscribeBasePanel,
		getBasePanelSnapshot,
	);

	// Close panel on Escape key
	useEffect(() => {
		if (!selectedId) return;
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") {
				selectBase(null);
			}
		}
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [selectedId]);

	if (!selectedId) return null;

	// Find the base entity by EntityId
	let baseEntity: ReturnType<typeof world.query> extends Iterable<infer T>
		? T
		: never;
	let found = false;

	for (const entity of world.query(Base, EntityId, Position, Faction)) {
		if (entity.get(EntityId)!.value === selectedId) {
			baseEntity = entity;
			found = true;
			break;
		}
	}

	if (!found) return null;

	const base = baseEntity!.get(Base)!;
	const faction = baseEntity!.get(Faction)!.value;
	const queue = getProductionQueue(baseEntity!);
	const infra = getInfrastructure(baseEntity!);
	const storage = getBaseStorage(baseEntity!);

	return (
		<div className="fixed right-0 top-0 h-full w-72 bg-slate-900 border-l border-slate-800 z-40 shadow-2xl overflow-y-auto">
			{/* Close button */}
			<button
				type="button"
				onClick={() => selectBase(null)}
				className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors rounded hover:bg-slate-800"
				title="Close"
			>
				X
			</button>

			{/* Content */}
			<div className="p-3 space-y-4">
				{/* Header */}
				<div className="space-y-1 pr-6">
					<h2 className="text-sm font-bold text-slate-200 truncate">
						{base.name || "Unnamed Base"}
					</h2>
					<FactionBadge factionId={faction} />
				</div>

				{/* Production Queue */}
				<Section title="Production Queue">
					<ProductionQueueSection queue={queue} />
				</Section>

				{/* Infrastructure */}
				<Section title="Infrastructure">
					<InfrastructureSection items={infra} />
				</Section>

				{/* Power */}
				<Section title="Power">
					<PowerGauge power={base.power} />
				</Section>

				{/* Storage */}
				<Section title="Storage">
					<StorageGrid storage={storage} />
				</Section>

				{/* Garrison */}
				<Section title="Garrison">
					<GarrisonSection baseTileX={base.tileX} baseTileZ={base.tileZ} />
				</Section>
			</div>
		</div>
	);
}
