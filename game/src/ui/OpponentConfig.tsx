/**
 * OpponentConfig — AI opponent slot configuration for pregame.
 *
 * 1-4 AI opponent slots. Each slot has:
 *  - Faction dropdown (any faction except the player's)
 *  - Difficulty select (easy / normal / hard)
 *  - Remove button
 *
 * Add button at the bottom if fewer than 4 slots.
 */

import { useState } from "react";
import civilizations from "../../../config/civilizations.json";
import type { FactionId } from "./FactionSelect";

const MONO = "'Courier New', monospace";

export interface OpponentSlot {
	faction: FactionId;
	difficulty: "easy" | "normal" | "hard";
}

const ALL_FACTIONS = Object.keys(civilizations) as FactionId[];

const DIFFICULTY_COLORS: Record<string, string> = {
	easy: "#44cc88",
	normal: "#ccaa44",
	hard: "#cc4444",
};

interface OpponentConfigProps {
	opponents: OpponentSlot[];
	playerFaction: FactionId;
	onChange: (opponents: OpponentSlot[]) => void;
}

export function OpponentConfig({
	opponents,
	playerFaction,
	onChange,
}: OpponentConfigProps) {
	const addOpponent = () => {
		if (opponents.length >= 4) return;
		// Pick a faction the player hasn't chosen and isn't already used if possible
		const usedFactions = new Set([
			playerFaction,
			...opponents.map((o) => o.faction),
		]);
		const available = ALL_FACTIONS.filter((f) => !usedFactions.has(f));
		const faction =
			available.length > 0
				? available[0]
				: ALL_FACTIONS.filter((f) => f !== playerFaction)[0];
		onChange([...opponents, { faction, difficulty: "normal" }]);
	};

	const removeOpponent = (index: number) => {
		onChange(opponents.filter((_, i) => i !== index));
	};

	const updateSlot = (index: number, patch: Partial<OpponentSlot>) => {
		onChange(
			opponents.map((slot, i) =>
				i === index ? { ...slot, ...patch } : slot,
			),
		);
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				width: "100%",
				maxWidth: "480px",
				margin: "0 auto",
				padding: "8px 0",
			}}
		>
			{/* Opponent slots */}
			{opponents.map((slot, i) => (
				<OpponentSlotRow
					key={i}
					index={i}
					slot={slot}
					playerFaction={playerFaction}
					onUpdate={(patch) => updateSlot(i, patch)}
					onRemove={() => removeOpponent(i)}
				/>
			))}

			{/* Empty state */}
			{opponents.length === 0 && (
				<div
					style={{
						fontFamily: MONO,
						fontSize: "12px",
						color: "#00ffaa44",
						textAlign: "center",
						padding: "24px 0",
						letterSpacing: "0.1em",
					}}
				>
					NO OPPONENTS CONFIGURED
				</div>
			)}

			{/* Add button */}
			{opponents.length < 4 && (
				<AddButton onClick={addOpponent} count={opponents.length} />
			)}

			{/* Slot count indicator */}
			<div
				style={{
					fontFamily: MONO,
					fontSize: "10px",
					color: "#00ffaa44",
					textAlign: "center",
					letterSpacing: "0.1em",
				}}
			>
				{opponents.length} / 4 OPPONENTS
			</div>
		</div>
	);
}

function OpponentSlotRow({
	index,
	slot,
	playerFaction,
	onUpdate,
	onRemove,
}: {
	index: number;
	slot: OpponentSlot;
	playerFaction: FactionId;
	onUpdate: (patch: Partial<OpponentSlot>) => void;
	onRemove: () => void;
}) {
	const civ = civilizations[slot.faction];
	const diffColor = DIFFICULTY_COLORS[slot.difficulty];

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "8px",
				background: "rgba(0,255,170,0.03)",
				border: `1px solid ${civ.color}44`,
				borderRadius: "6px",
				padding: "10px 12px",
			}}
		>
			{/* Slot number */}
			<div
				style={{
					fontFamily: MONO,
					fontSize: "11px",
					color: "#00ffaa44",
					width: "20px",
					flexShrink: 0,
				}}
			>
				{index + 1}.
			</div>

			{/* Faction color dot */}
			<div
				style={{
					width: "10px",
					height: "10px",
					borderRadius: "2px",
					background: civ.color,
					boxShadow: `0 0 6px ${civ.color}60`,
					flexShrink: 0,
				}}
			/>

			{/* Faction select */}
			<StyledSelect
				value={slot.faction}
				onChange={(v) => onUpdate({ faction: v as FactionId })}
				options={ALL_FACTIONS.filter((f) => f !== playerFaction).map(
					(f) => ({
						value: f,
						label: civilizations[f].name.toUpperCase(),
					}),
				)}
				style={{ flex: 1 }}
			/>

			{/* Difficulty select */}
			<StyledSelect
				value={slot.difficulty}
				onChange={(v) =>
					onUpdate({ difficulty: v as OpponentSlot["difficulty"] })
				}
				options={[
					{ value: "easy", label: "EASY" },
					{ value: "normal", label: "NORMAL" },
					{ value: "hard", label: "HARD" },
				]}
				style={{ width: "90px" }}
				color={diffColor}
			/>

			{/* Remove */}
			<button
				onClick={onRemove}
				title="Remove opponent"
				style={{
					background: "transparent",
					border: "1px solid rgba(255,68,68,0.3)",
					borderRadius: "4px",
					color: "#ff444488",
					fontFamily: MONO,
					fontSize: "14px",
					padding: "4px 8px",
					cursor: "pointer",
					lineHeight: 1,
					flexShrink: 0,
					transition: "all 0.15s ease",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.borderColor = "#ff4444";
					e.currentTarget.style.color = "#ff4444";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = "rgba(255,68,68,0.3)";
					e.currentTarget.style.color = "#ff444488";
				}}
			>
				X
			</button>
		</div>
	);
}

function StyledSelect({
	value,
	onChange,
	options,
	style,
	color,
}: {
	value: string;
	onChange: (val: string) => void;
	options: { value: string; label: string }[];
	style?: React.CSSProperties;
	color?: string;
}) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			style={{
				background: "rgba(0,255,170,0.05)",
				border: "1px solid rgba(0,255,170,0.2)",
				borderRadius: "4px",
				color: color ?? "#00ffaa",
				fontFamily: MONO,
				fontSize: "11px",
				padding: "6px 8px",
				cursor: "pointer",
				outline: "none",
				letterSpacing: "0.05em",
				appearance: "none",
				WebkitAppearance: "none",
				...style,
			}}
		>
			{options.map((opt) => (
				<option
					key={opt.value}
					value={opt.value}
					style={{ background: "#0a0f0c", color: "#00ffaa" }}
				>
					{opt.label}
				</option>
			))}
		</select>
	);
}

function AddButton({
	onClick,
	count,
}: {
	onClick: () => void;
	count: number;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: hovered
					? "rgba(0,255,170,0.08)"
					: "transparent",
				border: "1px dashed rgba(0,255,170,0.3)",
				borderRadius: "6px",
				padding: "10px",
				cursor: "pointer",
				fontFamily: MONO,
				fontSize: "12px",
				color: hovered ? "#00ffaa" : "#00ffaa66",
				letterSpacing: "0.1em",
				transition: "all 0.15s ease",
				textAlign: "center",
			}}
		>
			+ ADD OPPONENT ({count + 1}/4)
		</button>
	);
}
