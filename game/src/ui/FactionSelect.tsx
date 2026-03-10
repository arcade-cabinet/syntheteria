/**
 * FactionSelect — card-based faction selection for pregame.
 *
 * Displays each playable AI faction as a styled card with name,
 * description, portrait glyph, and gameplay bonuses. Clicking a
 * card selects that faction. The selected card gets a highlight
 * border and glow matching the faction color.
 */

import { useState } from "react";
import civilizations from "../../../config/civilizations.json";

const MONO = "'Courier New', monospace";

export type FactionId = keyof typeof civilizations;

/** Gameplay bonuses displayed on faction cards (not in config — design-layer data). */
const FACTION_BONUSES: Record<FactionId, string[]> = {
	reclaimers: ["+25% scrap yield", "+15% repair speed", "Start with extra scavenger bot"],
	volt_collective: ["+20% power efficiency", "Lightning resistance", "Start with powered rod"],
	signal_choir: ["+30% hacking speed", "+25% signal range", "Start with signal relay"],
	iron_creed: ["+20% combat damage", "+15% armor durability", "Start with fortified position"],
};

/** ASCII art portrait glyphs for each faction. */
const FACTION_GLYPHS: Record<FactionId, string> = {
	reclaimers: "[::.]",
	volt_collective: "[/\\/]",
	signal_choir: "[(~)]",
	iron_creed: "[##]",
};

interface FactionSelectProps {
	selected: FactionId;
	onSelect: (id: FactionId) => void;
}

export function FactionSelect({ selected, onSelect }: FactionSelectProps) {
	const factionIds = Object.keys(civilizations) as FactionId[];

	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
				gap: "12px",
				width: "100%",
				padding: "8px 0",
			}}
		>
			{factionIds.map((id) => (
				<FactionCard
					key={id}
					id={id}
					isSelected={selected === id}
					onSelect={onSelect}
				/>
			))}
		</div>
	);
}

function FactionCard({
	id,
	isSelected,
	onSelect,
}: {
	id: FactionId;
	isSelected: boolean;
	onSelect: (id: FactionId) => void;
}) {
	const [hovered, setHovered] = useState(false);
	const civ = civilizations[id];
	const bonuses = FACTION_BONUSES[id];
	const glyph = FACTION_GLYPHS[id];
	const factionColor = civ.color;

	const borderColor = isSelected
		? factionColor
		: hovered
			? `${factionColor}88`
			: "rgba(0,255,170,0.2)";

	const bgColor = isSelected
		? `${factionColor}18`
		: hovered
			? `${factionColor}0a`
			: "rgba(0,255,170,0.03)";

	return (
		<button
			onClick={() => onSelect(id)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: bgColor,
				border: `1px solid ${borderColor}`,
				borderRadius: "6px",
				padding: "16px",
				cursor: "pointer",
				textAlign: "left",
				transition: "all 0.2s ease",
				boxShadow: isSelected
					? `0 0 20px ${factionColor}30, inset 0 0 15px ${factionColor}10`
					: "none",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				minHeight: "160px",
			}}
		>
			{/* Portrait glyph + name */}
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div
					style={{
						fontFamily: MONO,
						fontSize: "20px",
						color: isSelected ? factionColor : "#00ffaa88",
						textShadow: isSelected
							? `0 0 12px ${factionColor}60`
							: "none",
						lineHeight: 1,
					}}
				>
					{glyph}
				</div>
				<div
					style={{
						fontFamily: MONO,
						fontSize: "14px",
						fontWeight: "bold",
						color: isSelected ? factionColor : "#00ffaa",
						letterSpacing: "0.1em",
						textShadow: isSelected
							? `0 0 8px ${factionColor}40`
							: "none",
					}}
				>
					{civ.name.toUpperCase()}
				</div>
			</div>

			{/* Description */}
			<div
				style={{
					fontFamily: MONO,
					fontSize: "11px",
					color: "#00ffaa88",
					lineHeight: 1.4,
				}}
			>
				{civ.description}
			</div>

			{/* Bonuses */}
			<div
				style={{
					marginTop: "auto",
					display: "flex",
					flexDirection: "column",
					gap: "3px",
				}}
			>
				{bonuses.map((b) => (
					<div
						key={b}
						style={{
							fontFamily: MONO,
							fontSize: "10px",
							color: isSelected ? `${factionColor}cc` : "#00ffaa66",
							letterSpacing: "0.03em",
						}}
					>
						+ {b}
					</div>
				))}
			</div>

			{/* Selected indicator */}
			{isSelected && (
				<div
					style={{
						fontFamily: MONO,
						fontSize: "10px",
						color: factionColor,
						letterSpacing: "0.15em",
						textAlign: "center",
						marginTop: "4px",
					}}
				>
					SELECTED
				</div>
			)}
		</button>
	);
}
