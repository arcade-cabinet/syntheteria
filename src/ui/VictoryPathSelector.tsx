/**
 * VictoryPathSelector — pregame widget for choosing a victory path preference.
 *
 * Renders four path cards (Technical, Subjugation, Social, Faith) with
 * icon glyphs, short descriptions, and the faction color accent when selected.
 *
 * Used in two places:
 *   - PregameScreen PATRON tab: player selects their own path
 *   - PregameScreen RIVALS tab: per-opponent AI bias selector (compact mode)
 *
 * Pure utilities exported for Jest testing.
 */

import { useState } from "react";
import { FONT_MONO, menu } from "./designTokens";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VictoryPathId =
	| "technical_mastery"
	| "subjugation"
	| "social_networking"
	| "religious_philosophical";

export interface VictoryPathMeta {
	id: VictoryPathId;
	displayName: string;
	glyph: string;
	description: string;
	accentColor: string;
}

// ---------------------------------------------------------------------------
// Pure utilities — exported for tests
// ---------------------------------------------------------------------------

/** All four victory path definitions (display-layer metadata). */
export const VICTORY_PATHS: readonly VictoryPathMeta[] = [
	{
		id: "technical_mastery",
		displayName: "TECHNICAL",
		glyph: "⬡",
		description: "Research, hack, build the machine ascendancy.",
		accentColor: "#00aaff",
	},
	{
		id: "subjugation",
		displayName: "SUBJUGATION",
		glyph: "⬢",
		description: "Military conquest and last-colony-standing survival.",
		accentColor: "#ff4444",
	},
	{
		id: "social_networking",
		displayName: "SOCIAL",
		glyph: "◈",
		description: "Trade, diplomacy, and cultural influence.",
		accentColor: "#ffaa00",
	},
	{
		id: "religious_philosophical",
		displayName: "FAITH",
		glyph: "✦",
		description: "Convert units, build shrines, reach enlightenment.",
		accentColor: "#aa44ff",
	},
];

/**
 * Look up path metadata by ID.
 * Returns undefined if the ID is not recognized.
 */
export function getVictoryPathMeta(id: string): VictoryPathMeta | undefined {
	return VICTORY_PATHS.find((p) => p.id === id);
}

/**
 * Returns a short 1-word label for compact display (AI bias dropdowns).
 */
export function getPathShortLabel(id: VictoryPathId): string {
	const meta = getVictoryPathMeta(id);
	return meta?.displayName ?? id.toUpperCase();
}

/**
 * Returns the accent color for a path. Defaults to the menu chrome fallback.
 */
export function getPathAccentColor(id: VictoryPathId | string): string {
	const meta = getVictoryPathMeta(id);
	return meta?.accentColor ?? menu.chrome;
}

/**
 * Check if the given string is a valid VictoryPathId.
 */
export function isValidVictoryPath(id: string): id is VictoryPathId {
	return VICTORY_PATHS.some((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// VictoryPathSelector — full card layout (PATRON tab)
// ---------------------------------------------------------------------------

interface VictoryPathSelectorProps {
	selected: VictoryPathId;
	onSelect: (id: VictoryPathId) => void;
}

export function VictoryPathSelector({
	selected,
	onSelect,
}: VictoryPathSelectorProps) {
	return (
		<div
			role="radiogroup"
			aria-label="Select victory path preference"
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				gap: "10px",
				width: "100%",
				marginTop: "16px",
			}}
		>
			{VICTORY_PATHS.map((path) => (
				<PathCard
					key={path.id}
					path={path}
					isSelected={selected === path.id}
					onSelect={onSelect}
				/>
			))}
		</div>
	);
}

function PathCard({
	path,
	isSelected,
	onSelect,
}: {
	path: VictoryPathMeta;
	isSelected: boolean;
	onSelect: (id: VictoryPathId) => void;
}) {
	const [hovered, setHovered] = useState(false);

	const borderColor = isSelected
		? `${path.accentColor}88`
		: hovered
			? `${path.accentColor}44`
			: menu.accentMuted;

	const bg = isSelected
		? `${path.accentColor}0d`
		: hovered
			? menu.accentFaint
			: "transparent";

	const glowShadow = isSelected
		? `0 0 12px ${path.accentColor}22, inset 0 0 20px ${path.accentColor}08`
		: "none";

	return (
		<button
			role="radio"
			aria-checked={isSelected}
			onClick={() => onSelect(path.id)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: bg,
				border: `1px solid ${borderColor}`,
				borderRadius: "6px",
				padding: "12px 14px",
				cursor: "pointer",
				textAlign: "left",
				boxShadow: glowShadow,
				transition: "all 0.15s ease",
				display: "flex",
				flexDirection: "column",
				gap: "6px",
			}}
		>
			{/* Glyph + name row */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
				}}
			>
				<span
					aria-hidden="true"
					style={{
						fontSize: "18px",
						color: isSelected ? path.accentColor : `${path.accentColor}88`,
						textShadow: isSelected ? `0 0 8px ${path.accentColor}66` : "none",
					}}
				>
					{path.glyph}
				</span>
				<span
					style={{
						fontFamily: FONT_MONO,
						fontSize: "11px",
						letterSpacing: "0.12em",
						color: isSelected ? path.accentColor : menu.chrome,
						fontWeight: isSelected ? "bold" : "normal",
					}}
				>
					{path.displayName}
				</span>
			</div>

			{/* Description */}
			<span
				style={{
					fontFamily: FONT_MONO,
					fontSize: "10px",
					color: isSelected
						? `${path.accentColor}aa`
						: `rgba(184,196,204,0.4)`,
					lineHeight: "1.4",
					letterSpacing: "0.04em",
				}}
			>
				{path.description}
			</span>

			{/* Selected indicator pip */}
			{isSelected && (
				<div
					aria-hidden="true"
					style={{
						width: "100%",
						height: "1px",
						background: `linear-gradient(90deg, transparent, ${path.accentColor}88, transparent)`,
						marginTop: "2px",
					}}
				/>
			)}
		</button>
	);
}

// ---------------------------------------------------------------------------
// VictoryPathDropdown — compact single-select for AI opponent bias
// ---------------------------------------------------------------------------

interface VictoryPathDropdownProps {
	value: VictoryPathId;
	onChange: (id: VictoryPathId) => void;
	"aria-label"?: string;
}

export function VictoryPathDropdown({
	value,
	onChange,
	"aria-label": ariaLabel,
}: VictoryPathDropdownProps) {
	const accent = getPathAccentColor(value);

	return (
		<select
			value={value}
			aria-label={ariaLabel ?? "Victory path bias"}
			onChange={(e) => {
				if (isValidVictoryPath(e.target.value)) {
					onChange(e.target.value);
				}
			}}
			style={{
				background: menu.accentFaint,
				border: `1px solid ${accent}66`,
				borderRadius: "4px",
				color: accent,
				fontFamily: FONT_MONO,
				fontSize: "10px",
				padding: "4px 8px",
				cursor: "pointer",
				outline: "none",
				letterSpacing: "0.05em",
				appearance: "none",
				WebkitAppearance: "none",
				minWidth: "96px",
			}}
		>
			{VICTORY_PATHS.map((p) => (
				<option
					key={p.id}
					value={p.id}
					style={{ background: "#0e1014", color: menu.chrome }}
				>
					{p.displayName}
				</option>
			))}
		</select>
	);
}
