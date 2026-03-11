/**
 * Audio settings panel — React UI for controlling volume levels.
 *
 * Provides master, SFX, music, ambience, and UI volume sliders with mute
 * toggles. Styled to match the existing terminal-aesthetic HUD:
 * monospace font, green-on-dark color scheme.
 *
 * Reads and writes volume via the SoundEngine API. State is local to
 * the component — the SoundEngine is the source of truth for actual
 * audio levels.
 */

import { useCallback, useState } from "react";
import type { AudioCategory } from "./SoundEngine";
import { setCategoryVolume, setMasterVolume } from "./SoundEngine";
import { playUIBeep } from "./GameSounds";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryState {
	volume: number;
	muted: boolean;
	/** Volume before mute was toggled, so we can restore it. */
	preMuteVolume: number;
}

interface AudioSettingsState {
	masterVolume: number;
	masterMuted: boolean;
	masterPreMute: number;
	categories: Record<AudioCategory, CategoryState>;
}

// ---------------------------------------------------------------------------
// Defaults (match config/audio.json)
// ---------------------------------------------------------------------------

const INITIAL_STATE: AudioSettingsState = {
	masterVolume: 0.7,
	masterMuted: false,
	masterPreMute: 0.7,
	categories: {
		sfx: { volume: 1.0, muted: false, preMuteVolume: 1.0 },
		music: { volume: 0.3, muted: false, preMuteVolume: 0.3 },
		ambience: { volume: 0.5, muted: false, preMuteVolume: 0.5 },
		ui: { volume: 0.6, muted: false, preMuteVolume: 0.6 },
	},
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";

const panelStyle: React.CSSProperties = {
	position: "absolute",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
	background: "rgba(0, 8, 4, 0.94)",
	border: "1px solid #00ffaa44",
	borderRadius: "8px",
	padding: "20px 24px",
	fontFamily: MONO,
	color: "#00ffaa",
	width: "min(340px, 90vw)",
	zIndex: 200,
	pointerEvents: "auto",
	boxShadow: "0 0 40px rgba(0, 255, 170, 0.08)",
};

const headerStyle: React.CSSProperties = {
	fontSize: "14px",
	fontWeight: "bold",
	letterSpacing: "0.15em",
	marginBottom: "16px",
	textAlign: "center",
	borderBottom: "1px solid #00ffaa33",
	paddingBottom: "10px",
};

const rowStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "10px",
	marginBottom: "12px",
};

const labelStyle: React.CSSProperties = {
	width: "80px",
	fontSize: "11px",
	letterSpacing: "0.1em",
	textTransform: "uppercase",
	flexShrink: 0,
};

const sliderContainerStyle: React.CSSProperties = {
	flex: 1,
	position: "relative",
	height: "24px",
	display: "flex",
	alignItems: "center",
};

const muteButtonBase: React.CSSProperties = {
	width: "32px",
	height: "28px",
	border: "1px solid #00ffaa44",
	borderRadius: "4px",
	fontFamily: MONO,
	fontSize: "10px",
	cursor: "pointer",
	flexShrink: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
};

const valueStyle: React.CSSProperties = {
	width: "36px",
	textAlign: "right",
	fontSize: "11px",
	color: "#00ffaa88",
	flexShrink: 0,
};

const closeButtonStyle: React.CSSProperties = {
	display: "block",
	width: "100%",
	marginTop: "16px",
	padding: "8px",
	background: "rgba(0, 255, 170, 0.08)",
	border: "1px solid #00ffaa44",
	borderRadius: "4px",
	color: "#00ffaa",
	fontFamily: MONO,
	fontSize: "12px",
	letterSpacing: "0.1em",
	cursor: "pointer",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AudioSettingsPanelProps {
	/** Called when the user closes the panel. */
	onClose: () => void;
}

export function AudioSettingsPanel({ onClose }: AudioSettingsPanelProps) {
	const [state, setState] = useState<AudioSettingsState>(INITIAL_STATE);

	// ── Master volume ─────────────────────────────────────────────────────

	const handleMasterChange = useCallback(
		(value: number) => {
			setState((prev) => ({
				...prev,
				masterVolume: value,
				masterMuted: false,
				masterPreMute: value,
			}));
			setMasterVolume(value);
		},
		[],
	);

	const handleMasterMute = useCallback(() => {
		setState((prev) => {
			const willMute = !prev.masterMuted;
			const newVol = willMute ? 0 : prev.masterPreMute;
			setMasterVolume(newVol);
			playUIBeep();
			return {
				...prev,
				masterMuted: willMute,
				masterVolume: newVol,
				masterPreMute: willMute ? prev.masterVolume : prev.masterPreMute,
			};
		});
	}, []);

	// ── Category volumes ──────────────────────────────────────────────────

	const handleCategoryChange = useCallback(
		(category: AudioCategory, value: number) => {
			setState((prev) => ({
				...prev,
				categories: {
					...prev.categories,
					[category]: {
						...prev.categories[category],
						volume: value,
						muted: false,
						preMuteVolume: value,
					},
				},
			}));
			setCategoryVolume(category, value);
		},
		[],
	);

	const handleCategoryMute = useCallback((category: AudioCategory) => {
		setState((prev) => {
			const cat = prev.categories[category];
			const willMute = !cat.muted;
			const newVol = willMute ? 0 : cat.preMuteVolume;
			setCategoryVolume(category, newVol);
			playUIBeep();
			return {
				...prev,
				categories: {
					...prev.categories,
					[category]: {
						volume: newVol,
						muted: willMute,
						preMuteVolume: willMute ? cat.volume : cat.preMuteVolume,
					},
				},
			};
		});
	}, []);

	// ── Close handler ─────────────────────────────────────────────────────

	const handleClose = useCallback(() => {
		playUIBeep();
		onClose();
	}, [onClose]);

	// ── Render ────────────────────────────────────────────────────────────

	return (
		<div style={panelStyle}>
			<div style={headerStyle}>AUDIO SETTINGS</div>

			{/* Master volume */}
			<VolumeRow
				label="MASTER"
				value={state.masterVolume}
				muted={state.masterMuted}
				onChange={handleMasterChange}
				onMute={handleMasterMute}
				color="#00ffaa"
			/>

			{/* Separator */}
			<div
				style={{
					borderTop: "1px solid #00ffaa22",
					margin: "8px 0 12px",
				}}
			/>

			{/* SFX */}
			<VolumeRow
				label="SFX"
				value={state.categories.sfx.volume}
				muted={state.categories.sfx.muted}
				onChange={(v) => handleCategoryChange("sfx", v)}
				onMute={() => handleCategoryMute("sfx")}
				color="#00ffaa"
			/>

			{/* Music */}
			<VolumeRow
				label="MUSIC"
				value={state.categories.music.volume}
				muted={state.categories.music.muted}
				onChange={(v) => handleCategoryChange("music", v)}
				onMute={() => handleCategoryMute("music")}
				color="#88aaff"
			/>

			{/* Ambience */}
			<VolumeRow
				label="AMBIENCE"
				value={state.categories.ambience.volume}
				muted={state.categories.ambience.muted}
				onChange={(v) => handleCategoryChange("ambience", v)}
				onMute={() => handleCategoryMute("ambience")}
				color="#aa8844"
			/>

			{/* UI */}
			<VolumeRow
				label="UI"
				value={state.categories.ui.volume}
				muted={state.categories.ui.muted}
				onChange={(v) => handleCategoryChange("ui", v)}
				onMute={() => handleCategoryMute("ui")}
				color="#ffaa44"
			/>

			<button type="button" style={closeButtonStyle} onClick={handleClose}>
				CLOSE
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Volume row sub-component
// ---------------------------------------------------------------------------

interface VolumeRowProps {
	label: string;
	value: number;
	muted: boolean;
	onChange: (value: number) => void;
	onMute: () => void;
	color: string;
}

function VolumeRow({
	label,
	value,
	muted,
	onChange,
	onMute,
	color,
}: VolumeRowProps) {
	const pct = Math.round(value * 100);

	return (
		<div style={rowStyle}>
			<span style={labelStyle}>{label}</span>

			<div style={sliderContainerStyle}>
				<input
					type="range"
					min={0}
					max={100}
					value={pct}
					onChange={(e) => onChange(Number(e.target.value) / 100)}
					style={{
						width: "100%",
						height: "4px",
						appearance: "none",
						background: muted
							? "#333"
							: `linear-gradient(to right, ${color} ${pct}%, #222 ${pct}%)`,
						borderRadius: "2px",
						outline: "none",
						cursor: "pointer",
						accentColor: color,
					}}
				/>
			</div>

			<span style={valueStyle}>{pct}%</span>

			<button
				type="button"
				onClick={onMute}
				style={{
					...muteButtonBase,
					background: muted ? "rgba(255, 68, 68, 0.15)" : "transparent",
					color: muted ? "#ff4444" : color,
				}}
				title={muted ? "Unmute" : "Mute"}
			>
				{muted ? "OFF" : "ON"}
			</button>
		</div>
	);
}
