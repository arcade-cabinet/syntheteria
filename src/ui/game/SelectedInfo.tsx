/**
 * SelectedInfo — panel showing detailed info for the currently selected unit.
 *
 * Position: right side of screen, vertically centered.
 * Shows: unit name, faction, HP bar, AP pips, attack/defense/range,
 * weight class, applied marks with labels, XP progress.
 *
 * Built fresh for current ECS traits (UnitPos, UnitFaction, UnitStats,
 * UnitVisual, UnitUpgrade, UnitXP). Not ported from pending — the old
 * SelectedInfo was deeply coupled to deprecated traits.
 */

import type { World } from "koota";
import { useEffect, useState } from "react";
import { MARK_DEFS, type BotMark } from "../../ecs/robots/marks";
import { getXPForNextMark, getXPProgress } from "../../ecs/systems/experienceSystem";
import { FACTION_COLORS_CSS } from "../../config/gameDefaults";
import {
	UnitFaction,
	UnitPos,
	UnitStats,
	UnitUpgrade,
	UnitVisual,
	UnitXP,
} from "../../ecs/traits/unit";

interface SelectedUnitData {
	entityId: number;
	name: string;
	factionId: string;
	hp: number;
	maxHp: number;
	ap: number;
	maxAp: number;
	attack: number;
	defense: number;
	attackRange: number;
	scanRange: number;
	weightClass: string;
	marks: string[];
	tier: number;
	xp: number;
	markLevel: number;
}

function formatName(id: string): string {
	return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}


function readSelectedUnit(world: World, entityId: number): SelectedUnitData | null {
	for (const e of world.query(UnitPos, UnitFaction, UnitStats)) {
		if (e.id() !== entityId) continue;
		const faction = e.get(UnitFaction);
		const stats = e.get(UnitStats);
		const visual = e.get(UnitVisual);
		const upgrade = e.get(UnitUpgrade);
		const unitXp = e.get(UnitXP);
		if (!faction || !stats) return null;

		const marksStr = upgrade?.marks ?? "";
		const marks = marksStr ? marksStr.split(",").filter(Boolean) : [];

		return {
			entityId,
			name: visual?.modelId ?? "Unit",
			factionId: faction.factionId,
			hp: stats.hp,
			maxHp: stats.maxHp,
			ap: stats.ap,
			maxAp: stats.maxAp,
			attack: stats.attack,
			defense: stats.defense,
			attackRange: stats.attackRange,
			scanRange: stats.scanRange,
			weightClass: stats.weightClass,
			marks,
			tier: upgrade?.tier ?? 1,
			xp: unitXp?.xp ?? 0,
			markLevel: unitXp?.markLevel ?? 1,
		};
	}
	return null;
}

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
	const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
	const color = pct > 60 ? "#7ee7cb" : pct > 30 ? "#f6c56a" : "#cc4444";
	return (
		<div style={{ marginTop: 6 }}>
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
				<span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase" }}>
					Hull
				</span>
				<span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>
					{hp}/{maxHp}
				</span>
			</div>
			<div
				style={{
					height: 6,
					backgroundColor: "rgba(255,255,255,0.08)",
					borderRadius: 3,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: "100%",
						backgroundColor: color,
						borderRadius: 3,
						transition: "width 200ms ease",
					}}
				/>
			</div>
		</div>
	);
}

function ApPips({ ap, maxAp }: { ap: number; maxAp: number }) {
	return (
		<div style={{ marginTop: 6 }}>
			<div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
				Action Points
			</div>
			<div style={{ display: "flex", gap: 4 }}>
				{Array.from({ length: maxAp }).map((_, i) => (
					<div
						key={i}
						style={{
							width: 10,
							height: 10,
							borderRadius: "50%",
							backgroundColor: i < ap ? "#8be6ff" : "rgba(139,230,255,0.1)",
							border: `1.5px solid ${i < ap ? "#8be6ff" : "rgba(139,230,255,0.2)"}`,
						}}
					/>
				))}
			</div>
		</div>
	);
}

const MARK_NAMES = ["", "I", "II", "III", "IV", "V"];

function XpBar({ xp, markLevel }: { xp: number; markLevel: number }) {
	const xpToNext = getXPForNextMark(markLevel);
	const pct = xpToNext > 0 ? Math.min(100, (xp / xpToNext) * 100) : 0;
	const markLabel = MARK_NAMES[markLevel] ?? `${markLevel}`;
	return (
		<div style={{ marginTop: 6 }}>
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
				<span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase" }}>
					Mark {markLabel}
				</span>
				<span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>
					{xp}/{xpToNext} XP
				</span>
			</div>
			<div
				style={{
					height: 6,
					backgroundColor: "rgba(255,255,255,0.08)",
					borderRadius: 3,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: "100%",
						backgroundColor: "#b088d8",
						borderRadius: 3,
						transition: "width 200ms ease",
					}}
				/>
			</div>
		</div>
	);
}

function StatRow({ label, value, color }: { label: string; value: string | number; color: string }) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
			<span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 0.5 }}>{label}</span>
			<span style={{ fontSize: 11, color, fontWeight: 600 }}>{value}</span>
		</div>
	);
}

export function SelectedInfo({ world, selectedUnitId }: { world: World; selectedUnitId: number | null }) {
	const [data, setData] = useState<SelectedUnitData | null>(null);

	// Re-read every 200ms to catch HP changes, AP spend, etc.
	useEffect(() => {
		if (selectedUnitId == null) {
			setData(null);
			return;
		}
		const read = () => setData(readSelectedUnit(world, selectedUnitId));
		read();
		const id = setInterval(read, 200);
		return () => clearInterval(id);
	}, [world, selectedUnitId]);

	if (!data) return null;

	const factionColor = FACTION_COLORS_CSS[data.factionId] ?? "#ccc";

	return (
		<div
			data-testid="selected-info"
			style={{
				position: "absolute",
				right: 12,
				top: "50%",
				transform: "translateY(-50%)",
				width: 200,
				padding: "12px 14px",
				background: "rgba(3, 3, 8, 0.9)",
				border: `1px solid ${factionColor}33`,
				borderRadius: 8,
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				color: "#e0e0e0",
				pointerEvents: "none",
				zIndex: 45,
			}}
		>
			{/* Name + faction */}
			<div style={{ fontSize: 13, fontWeight: 700, color: factionColor, letterSpacing: 0.3 }}>
				{formatName(data.name)}
			</div>
			<div
				style={{
					fontSize: 9,
					color: "rgba(255,255,255,0.4)",
					letterSpacing: 1.5,
					textTransform: "uppercase",
					marginTop: 2,
				}}
			>
				{formatName(data.factionId)}
				{data.tier > 1 && <span style={{ marginLeft: 6, color: "#f6c56a" }}>Tier {data.tier}</span>}
			</div>

			{/* HP + AP */}
			<HpBar hp={data.hp} maxHp={data.maxHp} />
			<ApPips ap={data.ap} maxAp={data.maxAp} />

			{/* Combat stats */}
			<div
				style={{
					marginTop: 8,
					paddingTop: 6,
					borderTop: "1px solid rgba(139, 230, 255, 0.1)",
					display: "flex",
					flexDirection: "column",
					gap: 3,
				}}
			>
				<StatRow label="Attack" value={data.attack} color="#ff8f8f" />
				<StatRow label="Defense" value={data.defense} color="#8be6ff" />
				<StatRow label="Range" value={data.attackRange} color="rgba(255,255,255,0.7)" />
				<StatRow label="Scan" value={data.scanRange} color="rgba(255,255,255,0.7)" />
				<StatRow label="Class" value={formatName(data.weightClass)} color="rgba(255,255,255,0.6)" />
			</div>

			{/* Marks */}
			{data.marks.length > 0 && (
				<div
					style={{
						marginTop: 8,
						paddingTop: 6,
						borderTop: "1px solid rgba(139, 230, 255, 0.1)",
					}}
				>
					<div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
						Marks
					</div>
					<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
						{data.marks.map((markId) => {
							const def = MARK_DEFS[markId as BotMark];
							return (
								<div
									key={markId}
									style={{
										fontSize: 10,
										color: "#f6c56a",
										paddingLeft: 6,
										borderLeft: "2px solid rgba(246, 197, 106, 0.4)",
									}}
								>
									{def?.label ?? formatName(markId)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* XP Progress */}
			<XpBar xp={data.xp} markLevel={data.markLevel} />
		</div>
	);
}
