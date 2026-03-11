/**
 * FactionSelect — card-based faction selection for pregame.
 *
 * Displays each playable AI faction as a styled card with name,
 * description, portrait glyph, and gameplay bonuses. Clicking a
 * card selects that faction. The selected card gets a highlight
 * border and glow matching the faction color.
 *
 * Uses menu palette (amber/chrome) as base — faction colors only
 * appear when selected or hovered to show "this is YOUR choice."
 */

import { useState } from "react";
import civilizations from "../../config/civilizations.json";
import { FONT_MONO, menu } from "./designTokens";
import { PatronPortrait } from "./PatronPortrait";
import { PATRON_PERSONAS } from "./patronData";

export type FactionId = keyof typeof civilizations;

/** Gameplay bonuses displayed on faction cards (not in config — design-layer data). */
const FACTION_BONUSES: Record<FactionId, string[]> = {
	reclaimers: ["+25% scrap yield", "+15% repair speed", "Start with extra scavenger bot"],
	volt_collective: ["+20% power efficiency", "Lightning resistance", "Start with powered rod"],
	signal_choir: ["+30% hacking speed", "+25% signal range", "Start with signal relay"],
	iron_creed: ["+20% combat damage", "+15% armor durability", "Start with fortified position"],
};


interface FactionSelectProps {
	selected: FactionId;
	onSelect: (id: FactionId) => void;
}

export function FactionSelect({ selected, onSelect }: FactionSelectProps) {
	const factionIds = Object.keys(civilizations) as FactionId[];

	return (
		<div
			role="radiogroup"
			aria-label="Select patron faction"
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
	const factionColor = civ.color;
	const patron = PATRON_PERSONAS[id];

	// Selected → faction color, hovered → faction hint, default → amber/chrome
	const borderColor = isSelected
		? factionColor
		: hovered
			? `${factionColor}88`
			: menu.accentMuted;

	const bgColor = isSelected
		? `${factionColor}18`
		: hovered
			? `${factionColor}0a`
			: "rgba(232,160,32,0.03)";

	return (
		<button
			role="radio"
			aria-checked={isSelected}
			aria-label={`${civ.name} — ${civ.description}`}
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
				minHeight: "200px",
			}}
		>
			{/* Portrait + faction name row */}
			<div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
				{/* Holographic patron portrait */}
				<PatronPortrait
					persona={patron}
					isSelected={isSelected}
					isHovered={hovered}
					size={80}
				/>

				{/* Name + patron info */}
				<div style={{ flex: 1, minWidth: 0 }}>
					{/* Faction name */}
					<div
						style={{
							fontFamily: FONT_MONO,
							fontSize: "14px",
							fontWeight: "bold",
							color: isSelected ? factionColor : menu.chrome,
							letterSpacing: "0.1em",
							textShadow: isSelected ? `0 0 8px ${factionColor}40` : "none",
							marginBottom: "4px",
						}}
					>
						{civ.name.toUpperCase()}
					</div>

					{/* Patron name */}
					<div
						style={{
							fontFamily: FONT_MONO,
							fontSize: "10px",
							color: isSelected ? `${factionColor}cc` : menu.accentDim,
							letterSpacing: "0.15em",
							marginBottom: "4px",
						}}
					>
						PATRON: {patron.patronName}
					</div>

					{/* Tagline */}
					<div
						style={{
							fontFamily: FONT_MONO,
							fontSize: "10px",
							color: menu.chromeDim,
							lineHeight: 1.4,
							fontStyle: "italic",
						}}
					>
						"{patron.tagline}"
					</div>
				</div>
			</div>

			{/* Description */}
			<div
				style={{
					fontFamily: FONT_MONO,
					fontSize: "11px",
					color: menu.chromeDim,
					lineHeight: 1.4,
				}}
			>
				{civ.description}
			</div>

			{/* Patron personality line */}
			<div
				style={{
					fontFamily: FONT_MONO,
					fontSize: "10px",
					color: isSelected ? `${factionColor}88` : "rgba(184,196,204,0.3)",
					letterSpacing: "0.08em",
					borderLeft: `2px solid ${isSelected ? factionColor + "44" : "rgba(184,196,204,0.15)"}`,
					paddingLeft: "8px",
				}}
			>
				{patron.personality}
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
							fontFamily: FONT_MONO,
							fontSize: "10px",
							color: isSelected ? `${factionColor}cc` : menu.accentDim,
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
					aria-hidden="true"
					style={{
						fontFamily: FONT_MONO,
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
