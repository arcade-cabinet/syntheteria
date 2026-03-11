/**
 * MapConfig — map customization panel for pregame.
 *
 * Controls:
 *  - Map size: small (100x100) / medium (200x200) / large (400x400)
 *  - Ore density: sparse / normal / rich
 *  - Storm intensity: calm / moderate / violent
 *  - Starting resources: minimal / standard / abundant
 *  - Seed input: text field for reproducible maps (adj-adj-noun or number)
 *
 * Uses menu palette (amber/chrome) — this is a pregame screen.
 */

import { useRef, useState } from "react";
import { phraseToSeed, randomSeed, seedToPhrase } from "../ecs/seed";
import { FONT_MONO, menu } from "./designTokens";

export interface MapSettings {
	mapSize: "small" | "medium" | "large";
	oreDensity: "sparse" | "normal" | "rich";
	stormIntensity: "calm" | "moderate" | "violent";
	startingResources: "minimal" | "standard" | "abundant";
	seedPhrase: string;
}

export const DEFAULT_MAP_SETTINGS: MapSettings = {
	mapSize: "medium",
	oreDensity: "normal",
	stormIntensity: "moderate",
	startingResources: "standard",
	seedPhrase: seedToPhrase(randomSeed()),
};

const MAP_SIZE_LABELS = {
	small: "100 x 100",
	medium: "200 x 200",
	large: "400 x 400",
};

interface MapConfigProps {
	settings: MapSettings;
	onChange: (settings: MapSettings) => void;
}

export function MapConfig({ settings, onChange }: MapConfigProps) {
	const [parseError, setParseError] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const update = (patch: Partial<MapSettings>) => {
		onChange({ ...settings, ...patch });
	};

	const handleSeedChange = (val: string) => {
		setParseError(false);
		update({ seedPhrase: val });
	};

	const validateSeed = () => {
		const parsed = phraseToSeed(settings.seedPhrase);
		if (parsed === null) setParseError(true);
	};

	const shuffleSeed = () => {
		const s = randomSeed();
		setParseError(false);
		update({ seedPhrase: seedToPhrase(s) });
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "20px",
				width: "100%",
				maxWidth: "480px",
				margin: "0 auto",
				padding: "8px 0",
			}}
		>
			{/* Map Size */}
			<OptionRow
				label="MAP SIZE"
				groupLabel="Map size"
				options={["small", "medium", "large"]}
				value={settings.mapSize}
				onChange={(v) => update({ mapSize: v as MapSettings["mapSize"] })}
				sublabels={MAP_SIZE_LABELS}
			/>

			{/* Ore Density */}
			<OptionRow
				label="ORE DENSITY"
				groupLabel="Ore density"
				options={["sparse", "normal", "rich"]}
				value={settings.oreDensity}
				onChange={(v) => update({ oreDensity: v as MapSettings["oreDensity"] })}
			/>

			{/* Storm Intensity */}
			<OptionRow
				label="STORM INTENSITY"
				groupLabel="Storm intensity"
				options={["calm", "moderate", "violent"]}
				value={settings.stormIntensity}
				onChange={(v) => update({ stormIntensity: v as MapSettings["stormIntensity"] })}
			/>

			{/* Starting Resources */}
			<OptionRow
				label="STARTING RESOURCES"
				groupLabel="Starting resources"
				options={["minimal", "standard", "abundant"]}
				value={settings.startingResources}
				onChange={(v) => update({ startingResources: v as MapSettings["startingResources"] })}
			/>

			{/* Seed Input */}
			<div>
				<label
					htmlFor="mission-seed-input"
					style={{
						display: "block",
						fontFamily: FONT_MONO,
						fontSize: "10px",
						color: menu.accentDim,
						letterSpacing: "0.15em",
						marginBottom: "6px",
					}}
				>
					MISSION SEED
				</label>
				<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
					<input
						ref={inputRef}
						id="mission-seed-input"
						value={settings.seedPhrase}
						onChange={(e) => handleSeedChange(e.target.value)}
						onBlur={validateSeed}
						spellCheck={false}
						autoComplete="off"
						aria-invalid={parseError}
						aria-describedby={parseError ? "seed-error" : undefined}
						style={{
							flex: 1,
							background: menu.accentFaint,
							border: parseError
								? `1px solid ${menu.error}`
								: `1px solid ${menu.accentMuted}`,
							borderRadius: "4px",
							color: parseError ? menu.errorDim : menu.accent,
							fontFamily: FONT_MONO,
							fontSize: "13px",
							padding: "8px 10px",
							letterSpacing: "0.05em",
							outline: "none",
							textAlign: "center",
							caretColor: menu.accent,
						}}
						placeholder="hollow-bright-forge"
					/>
					<button
						onClick={shuffleSeed}
						aria-label="Generate random mission seed"
						style={{
							background: menu.accentFaint,
							border: `1px solid ${menu.accentMuted}`,
							borderRadius: "4px",
							color: menu.accent,
							fontFamily: FONT_MONO,
							fontSize: "16px",
							padding: "8px 10px",
							cursor: "pointer",
							flexShrink: 0,
							lineHeight: 1,
						}}
					>
						&#x27F3;
					</button>
				</div>
				{parseError && (
					<div
						id="seed-error"
						role="alert"
						style={{
							color: menu.errorDim,
							fontFamily: FONT_MONO,
							fontSize: "10px",
							marginTop: "4px",
							textAlign: "center",
						}}
					>
						unrecognised seed -- use adj-adj-noun or a number
					</div>
				)}
			</div>
		</div>
	);
}

/** A row of radio-style option buttons with a label. */
function OptionRow({
	label,
	groupLabel,
	options,
	value,
	onChange,
	sublabels,
}: {
	label: string;
	groupLabel: string;
	options: string[];
	value: string;
	onChange: (val: string) => void;
	sublabels?: Record<string, string>;
}) {
	return (
		<div>
			<div
				id={`option-label-${groupLabel.replace(/\s+/g, "-").toLowerCase()}`}
				style={{
					fontFamily: FONT_MONO,
					fontSize: "10px",
					color: menu.accentDim,
					letterSpacing: "0.15em",
					marginBottom: "6px",
				}}
			>
				{label}
			</div>
			<div
				role="radiogroup"
				aria-labelledby={`option-label-${groupLabel.replace(/\s+/g, "-").toLowerCase()}`}
				style={{ display: "flex", gap: "6px" }}
			>
				{options.map((opt) => (
					<OptionButton
						key={opt}
						label={opt.toUpperCase()}
						sublabel={sublabels?.[opt]}
						isSelected={value === opt}
						onClick={() => onChange(opt)}
					/>
				))}
			</div>
		</div>
	);
}

function OptionButton({
	label,
	sublabel,
	isSelected,
	onClick,
}: {
	label: string;
	sublabel?: string;
	isSelected: boolean;
	onClick: () => void;
}) {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			role="radio"
			aria-checked={isSelected}
			aria-label={sublabel ? `${label} (${sublabel})` : label}
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				flex: 1,
				background: isSelected
					? "rgba(232,160,32,0.14)"
					: hovered
						? menu.accentFaint
						: "rgba(232,160,32,0.03)",
				border: isSelected
					? `1px solid ${menu.accent}`
					: `1px solid ${menu.accentMuted}`,
				borderRadius: "4px",
				padding: "8px 4px",
				cursor: "pointer",
				transition: "all 0.15s ease",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "2px",
			}}
		>
			<span
				style={{
					fontFamily: FONT_MONO,
					fontSize: "11px",
					color: isSelected ? menu.accent : menu.accentDim,
					letterSpacing: "0.08em",
					fontWeight: isSelected ? "bold" : "normal",
				}}
			>
				{label}
			</span>
			{sublabel && (
				<span
					aria-hidden="true"
					style={{
						fontFamily: FONT_MONO,
						fontSize: "9px",
						color: menu.accentMuted,
					}}
				>
					{sublabel}
				</span>
			)}
		</button>
	);
}
