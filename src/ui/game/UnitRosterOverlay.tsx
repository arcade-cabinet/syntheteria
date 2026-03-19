/**
 * UnitRosterOverlay — list ALL player units with quick-jump.
 *
 * DOM overlay on top of the persistent globe Canvas.
 * Per unit: class name, specialization track, mark level, HP bar,
 * current action status, GPS position.
 * Click unit row to jump camera to that unit's location.
 *
 * Diegetic vocabulary: UNIT REGISTRY.
 */

import type { World } from "koota";
import { useEffect, useMemo, useState } from "react";
import { getCameraControls } from "../../camera/cameraStore";
import { TILE_SIZE_M } from "../../config/gameDefaults";
import { TRACK_REGISTRY } from "../../ecs/robots/specializations/trackRegistry";
import type { RobotClass } from "../../ecs/robots/types";
import {
	UnitFaction,
	UnitPos,
	UnitSpecialization,
	UnitStats,
	UnitVisual,
	UnitXP,
} from "../../ecs/traits/unit";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RosterUnit {
	entityId: number;
	robotClass: RobotClass;
	factionId: string;
	tileX: number;
	tileZ: number;
	hp: number;
	maxHp: number;
	ap: number;
	maxAp: number;
	mp: number;
	maxMp: number;
	attack: number;
	defense: number;
	trackId: string;
	trackLabel: string;
	markLevel: number;
	modelId: string;
}

type FilterField = "all" | RobotClass;

const CLASS_LABELS: Record<string, string> = {
	scout: "Scout",
	infantry: "Infantry",
	cavalry: "Cavalry",
	ranged: "Ranged",
	support: "Support",
	worker: "Worker",
};

type UnitRosterOverlayProps = {
	world: World;
	factionId: string;
	onClose: () => void;
	onSelectUnit?: (entityId: number) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function UnitRosterOverlay({
	world,
	factionId,
	onClose,
	onSelectUnit,
}: UnitRosterOverlayProps) {
	const [units, setUnits] = useState<RosterUnit[]>([]);
	const [filter, setFilter] = useState<FilterField>("all");

	// Poll units every 500ms to catch changes
	useEffect(() => {
		function read() {
			const result: RosterUnit[] = [];
			for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
				const fac = e.get(UnitFaction);
				if (!fac || fac.factionId !== factionId) continue;
				const pos = e.get(UnitPos);
				const stats = e.get(UnitStats);
				if (!pos || !stats) continue;
				const vis = e.has(UnitVisual) ? e.get(UnitVisual) : null;
				const spec = e.has(UnitSpecialization)
					? e.get(UnitSpecialization)
					: null;
				const xp = e.has(UnitXP) ? e.get(UnitXP) : null;

				const trackId = spec?.trackId ?? "";
				const trackEntry = trackId ? TRACK_REGISTRY.get(trackId) : null;

				result.push({
					entityId: e.id(),
					robotClass: stats.robotClass,
					factionId: fac.factionId,
					tileX: pos.tileX,
					tileZ: pos.tileZ,
					hp: stats.hp,
					maxHp: stats.maxHp,
					ap: stats.ap,
					maxAp: stats.maxAp,
					mp: stats.mp,
					maxMp: stats.maxMp,
					attack: stats.attack,
					defense: stats.defense,
					trackId,
					trackLabel: trackEntry?.label ?? "",
					markLevel: xp?.markLevel ?? 1,
					modelId: vis?.modelId ?? "",
				});
			}
			// Sort by class then entity ID for stability
			result.sort((a, b) => {
				if (a.robotClass < b.robotClass) return -1;
				if (a.robotClass > b.robotClass) return 1;
				return a.entityId - b.entityId;
			});
			setUnits(result);
		}
		read();
		const id = setInterval(read, 500);
		return () => clearInterval(id);
	}, [world, factionId]);

	const filtered = useMemo(() => {
		if (filter === "all") return units;
		return units.filter((u) => u.robotClass === filter);
	}, [units, filter]);

	// Available class filters
	const classesPresent = useMemo(() => {
		const set = new Set<RobotClass>();
		for (const u of units) set.add(u.robotClass);
		return set;
	}, [units]);

	function handleJump(unit: RosterUnit) {
		const cam = getCameraControls();
		if (cam) {
			cam.panTo(unit.tileX * TILE_SIZE_M, unit.tileZ * TILE_SIZE_M);
		}
		onSelectUnit?.(unit.entityId);
	}

	const MARK_LABELS = ["", "I", "II", "III", "IV", "V"];

	return (
		<div
			data-testid="unit-roster-overlay"
			style={{
				position: "absolute",
				inset: 0,
				backgroundColor: "rgba(2, 5, 10, 0.92)",
				zIndex: 50,
				pointerEvents: "auto",
				display: "flex",
				flexDirection: "column",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
			}}
		>
			{/* Header */}
			<div
				style={{
					flexShrink: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid rgba(255,255,255,0.08)",
					background: "rgba(8, 23, 35, 0.96)",
					padding: "12px 20px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
					<span
						style={{
							fontSize: 11,
							textTransform: "uppercase",
							letterSpacing: "0.28em",
							color: "#8be6ff",
						}}
					>
						Unit Registry
					</span>
					<span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
						{units.length} unit{units.length !== 1 ? "s" : ""}
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					style={{
						width: 32,
						height: 32,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						borderRadius: "50%",
						border: "1px solid rgba(255,255,255,0.12)",
						background: "rgba(255,255,255,0.05)",
						color: "rgba(255,255,255,0.5)",
						fontSize: 16,
						cursor: "pointer",
					}}
					aria-label="Close"
				>
					{"\u00D7"}
				</button>
			</div>

			{/* Filter bar */}
			<div
				style={{
					flexShrink: 0,
					display: "flex",
					gap: 6,
					padding: "10px 20px",
					borderBottom: "1px solid rgba(255,255,255,0.05)",
				}}
			>
				<FilterButton
					label="All"
					active={filter === "all"}
					onClick={() => setFilter("all")}
				/>
				{(
					[
						"scout",
						"infantry",
						"cavalry",
						"ranged",
						"support",
						"worker",
					] as RobotClass[]
				).map(
					(cls) =>
						classesPresent.has(cls) && (
							<FilterButton
								key={cls}
								label={CLASS_LABELS[cls] ?? cls}
								active={filter === cls}
								onClick={() => setFilter(cls)}
							/>
						),
				)}
			</div>

			{/* Unit list */}
			<div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
				{filtered.length === 0 && (
					<div
						style={{
							textAlign: "center",
							padding: 40,
							color: "rgba(255,255,255,0.3)",
							fontSize: 11,
						}}
					>
						No units found.
					</div>
				)}

				{filtered.map((unit) => {
					const hpPct = unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0;
					const hpColor =
						hpPct > 60 ? "#7ee7cb" : hpPct > 30 ? "#f6c56a" : "#cc4444";

					return (
						<button
							key={unit.entityId}
							type="button"
							data-testid={`roster-unit-${unit.entityId}`}
							onClick={() => handleJump(unit)}
							style={{
								width: "100%",
								display: "flex",
								alignItems: "center",
								gap: 12,
								padding: "8px 12px",
								borderRadius: 8,
								border: "1px solid rgba(255,255,255,0.06)",
								background: "rgba(255,255,255,0.015)",
								cursor: "pointer",
								marginBottom: 4,
								textAlign: "left",
								fontFamily: "inherit",
								transition: "border-color 0.15s",
							}}
							onMouseEnter={(e) => {
								(e.currentTarget as HTMLElement).style.borderColor =
									"rgba(139, 230, 255, 0.3)";
							}}
							onMouseLeave={(e) => {
								(e.currentTarget as HTMLElement).style.borderColor =
									"rgba(255,255,255,0.06)";
							}}
						>
							{/* Class */}
							<div style={{ width: 70 }}>
								<div
									style={{ fontSize: 11, color: "#8be6ff", fontWeight: 600 }}
								>
									{CLASS_LABELS[unit.robotClass] ?? unit.robotClass}
								</div>
								{unit.trackLabel && (
									<div
										style={{
											fontSize: 8,
											color: "rgba(255,255,255,0.35)",
											marginTop: 1,
										}}
									>
										{unit.trackLabel}
									</div>
								)}
							</div>

							{/* Mark */}
							<div style={{ width: 36, textAlign: "center" }}>
								<span style={{ fontSize: 10, color: "#f6c56a" }}>
									Mk{MARK_LABELS[unit.markLevel] ?? unit.markLevel}
								</span>
							</div>

							{/* HP bar */}
							<div style={{ flex: 1, minWidth: 80 }}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: 2,
									}}
								>
									<span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>
										INT
									</span>
									<span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>
										{unit.hp}/{unit.maxHp}
									</span>
								</div>
								<div
									style={{
										height: 4,
										backgroundColor: "rgba(255,255,255,0.06)",
										borderRadius: 2,
										overflow: "hidden",
									}}
								>
									<div
										style={{
											width: `${hpPct}%`,
											height: "100%",
											backgroundColor: hpColor,
											borderRadius: 2,
										}}
									/>
								</div>
							</div>

							{/* Stats */}
							<div
								style={{
									display: "flex",
									gap: 8,
									fontSize: 9,
									color: "rgba(255,255,255,0.35)",
								}}
							>
								<span>PWR {unit.attack}</span>
								<span>ARM {unit.defense}</span>
								<span>
									CYC {unit.ap}/{unit.maxAp}
								</span>
							</div>

							{/* Position */}
							<div style={{ width: 60, textAlign: "right" }}>
								<span
									style={{
										fontSize: 9,
										color: "rgba(255,255,255,0.25)",
										fontVariantNumeric: "tabular-nums",
									}}
								>
									({unit.tileX},{unit.tileZ})
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilterButton({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				padding: "4px 10px",
				borderRadius: 4,
				border: `1px solid ${active ? "rgba(139, 230, 255, 0.4)" : "rgba(255,255,255,0.08)"}`,
				background: active ? "rgba(139, 230, 255, 0.1)" : "transparent",
				color: active ? "#8be6ff" : "rgba(255,255,255,0.4)",
				fontSize: 9,
				textTransform: "uppercase",
				letterSpacing: "0.12em",
				cursor: "pointer",
				fontFamily: "inherit",
			}}
		>
			{label}
		</button>
	);
}
