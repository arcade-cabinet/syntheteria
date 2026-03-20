/**
 * EntityTooltip — cursor-following tooltip showing unit/building stats on hover.
 *
 * Reads from hoverState (updated by HoverTracker inside Canvas).
 * Appears near the cursor with a slight offset.
 * Shows: unit name, faction, HP bar, AP pips, ATK/DEF stats.
 * For buildings: name, faction, HP bar, powered status.
 *
 * Built fresh for current ECS — not ported from pending (old one was deeply
 * coupled to Identity/WorldPosition/Unit traits that no longer exist).
 */

import { useEffect, useState } from "react";
import { FACTION_COLORS_CSS } from "../../config";
import {
	getHoverState,
	type HoverState,
	subscribeHoverState,
} from "./hoverState";

/** Convert snake_case modelId to Title Case display name. */
function formatName(id: string): string {
	return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
	const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
	const color = pct > 60 ? "#7ee7cb" : pct > 30 ? "#f6c56a" : "#cc4444";
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
				marginTop: 4,
			}}
		>
			<span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", width: 16 }}>
				INT
			</span>
			<div
				style={{
					flex: 1,
					height: 4,
					backgroundColor: "rgba(255,255,255,0.08)",
					borderRadius: 2,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: "100%",
						backgroundColor: color,
						borderRadius: 2,
						transition: "width 200ms ease",
					}}
				/>
			</div>
			<span
				style={{
					fontSize: 9,
					color: "rgba(255,255,255,0.5)",
					minWidth: 30,
					textAlign: "right",
				}}
			>
				{hp}/{maxHp}
			</span>
		</div>
	);
}

function ApPips({ ap, maxAp }: { ap: number; maxAp: number }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
				marginTop: 2,
			}}
		>
			<span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", width: 16 }}>
				CYC
			</span>
			<div style={{ display: "flex", gap: 3 }}>
				{Array.from({ length: maxAp }).map((_, i) => (
					<div
						key={i}
						style={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							backgroundColor: i < ap ? "#8be6ff" : "rgba(139,230,255,0.15)",
							border: `1px solid ${i < ap ? "#8be6ff" : "rgba(139,230,255,0.2)"}`,
						}}
					/>
				))}
			</div>
		</div>
	);
}

export function EntityTooltip() {
	const [hover, setHover] = useState<HoverState>(getHoverState);

	useEffect(() => {
		return subscribeHoverState(() => setHover(getHoverState()));
	}, []);

	const { unit, building, screenX, screenY } = hover;

	// Only show when hovering over a unit or building
	if (!unit && !building) return null;

	// Position near cursor with offset so tooltip doesn't obscure the entity
	const tooltipX = screenX + 16;
	const tooltipY = screenY - 8;

	return (
		<div
			data-testid="entity-tooltip"
			style={{
				position: "fixed",
				left: tooltipX,
				top: tooltipY,
				minWidth: 160,
				maxWidth: 220,
				padding: "8px 10px",
				background: "rgba(3, 3, 8, 0.92)",
				border: "1px solid rgba(139, 230, 255, 0.2)",
				borderRadius: 6,
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				fontSize: 10,
				color: "#e0e0e0",
				pointerEvents: "none",
				zIndex: 50,
				lineHeight: 1.4,
			}}
		>
			{unit && (
				<>
					{/* Unit name + faction badge */}
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<span
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: FACTION_COLORS_CSS[unit.factionId] ?? "#ccc",
								letterSpacing: 0.3,
							}}
						>
							{formatName(unit.name)}
						</span>
					</div>
					<div
						style={{
							fontSize: 9,
							color: "rgba(255,255,255,0.4)",
							marginTop: 1,
							letterSpacing: 1,
							textTransform: "uppercase",
						}}
					>
						{formatName(unit.factionId)}
						{unit.weightClass !== "medium" &&
							` / ${formatName(unit.weightClass)}`}
					</div>

					<HpBar hp={unit.hp} maxHp={unit.maxHp} />
					<ApPips ap={unit.ap} maxAp={unit.maxAp} />

					{/* Stats row */}
					<div
						style={{
							display: "flex",
							gap: 10,
							marginTop: 4,
							fontSize: 9,
							color: "rgba(255,255,255,0.5)",
						}}
					>
						<span>
							PWR <span style={{ color: "#ff8f8f" }}>{unit.attack}</span>
						</span>
						<span>
							ARM <span style={{ color: "#8be6ff" }}>{unit.defense}</span>
						</span>
					</div>
				</>
			)}

			{building && !unit && (
				<>
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<span
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: FACTION_COLORS_CSS[building.factionId] ?? "#ccc",
								letterSpacing: 0.3,
							}}
						>
							{building.displayName}
						</span>
					</div>
					<div
						style={{
							fontSize: 9,
							color: "rgba(255,255,255,0.4)",
							marginTop: 1,
							letterSpacing: 1,
							textTransform: "uppercase",
						}}
					>
						{formatName(building.factionId)}
					</div>

					<HpBar hp={building.hp} maxHp={building.maxHp} />

					<div style={{ marginTop: 4, fontSize: 9 }}>
						{building.powered ? (
							<span style={{ color: "#7ee7cb" }}>Powered</span>
						) : (
							<span style={{ color: "#cc4444" }}>No Power</span>
						)}
					</div>
				</>
			)}
		</div>
	);
}
