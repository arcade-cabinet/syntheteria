/**
 * SettingsScreen — tabbed settings panel covering graphics, audio, and controls.
 *
 * Reads from and writes to settingsSystem.ts. Persists to localStorage on close.
 * Industrial amber/chrome aesthetic matching PauseMenu and TitleScreen.
 *
 * Tabs: Graphics | Audio | Controls
 */

import { useEffect, useRef, useState } from "react";
import {
	type AudioSettings,
	type ControlsSettings,
	type GameSettings,
	type VideoSettings,
	exportSettings,
	getSettings,
	importSettings,
	setSettings,
	validateSettings,
} from "../systems/settingsSystem";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const MONO = "'Courier New', monospace";
const COLOR_ACCENT = "#e8a020";
const COLOR_CHROME = "#b8c4cc";
const COLOR_ACCENT_MUTED = "rgba(232,160,32,0.22)";
const BG_OVERLAY = "rgba(0, 0, 0, 0.82)";
const BG_PANEL = "rgba(8,10,12,0.97)";
const BG_ROW = "rgba(255,255,255,0.03)";
const COLOR_ERROR = "#cc3322";
const STORAGE_KEY = "syntheteria_settings";

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): void {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			importSettings(raw);
		}
	} catch {
		// localStorage unavailable (SSR / private browsing) — ignore
	}
}

function saveToStorage(): void {
	try {
		localStorage.setItem(STORAGE_KEY, exportSettings());
	} catch {
		// ignore
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "graphics" | "audio" | "controls";

interface SettingsScreenProps {
	onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsScreen({ onClose }: SettingsScreenProps) {
	const [tab, setTab] = useState<Tab>("graphics");
	const [draft, setDraft] = useState<GameSettings>(() => {
		loadFromStorage();
		return getSettings();
	});
	const [rebinding, setRebinding] = useState<string | null>(null);
	const rebindRef = useRef<string | null>(null);
	rebindRef.current = rebinding;

	// ESC closes (or cancels rebind)
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (rebindRef.current !== null) {
				// Any key completes rebind
				e.preventDefault();
				const action = rebindRef.current;
				const key = e.key === " " ? "Space" : e.key;
				setDraft((prev) => ({
					...prev,
					controls: {
						...prev.controls,
						keyBindings: { ...prev.controls.keyBindings, [action]: key },
					},
				}));
				setRebinding(null);
				return;
			}
			if (e.key === "Escape") handleClose();
		};
		window.addEventListener("keydown", handleKey, true);
		return () => window.removeEventListener("keydown", handleKey, true);
	}, []);

	const handleClose = () => {
		// Apply draft and persist
		setSettings({
			video: draft.video,
			audio: draft.audio,
			gameplay: draft.gameplay,
			controls: draft.controls,
		});
		saveToStorage();
		onClose();
	};

	const handleReset = () => {
		loadFromStorage();
		const fresh: GameSettings = {
			video: {
				shadowQuality: "medium",
				particleCount: 500,
				renderDistance: 200,
				fov: 90,
			},
			audio: {
				masterVolume: 0.8,
				sfxVolume: 0.7,
				musicVolume: 0.5,
				ambientVolume: 0.6,
			},
			gameplay: {
				autoSave: true,
				tutorialEnabled: true,
				showMinimap: true,
				showFPS: false,
				difficulty: "normal",
			},
			controls: {
				mouseSensitivity: 0.5,
				invertY: false,
				keyBindings: {
					moveForward: "w",
					moveBackward: "s",
					moveLeft: "a",
					moveRight: "d",
					jump: " ",
					interact: "e",
					inventory: "i",
					map: "m",
					pause: "Escape",
					sprint: "Shift",
					crouch: "Control",
					primaryAction: "Mouse0",
					secondaryAction: "Mouse2",
				},
			},
		};
		setDraft(fresh);
	};

	const updateVideo = (patch: Partial<VideoSettings>) => {
		setDraft((prev) => ({ ...prev, video: { ...prev.video, ...patch } }));
	};

	const updateAudio = (patch: Partial<AudioSettings>) => {
		setDraft((prev) => ({ ...prev, audio: { ...prev.audio, ...patch } }));
	};

	const updateControls = (patch: Partial<ControlsSettings>) => {
		setDraft((prev) => ({
			...prev,
			controls: { ...prev.controls, ...patch },
		}));
	};

	const errors = validateSettings();

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
			style={{
				position: "absolute",
				inset: 0,
				background: BG_OVERLAY,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 600,
				pointerEvents: "auto",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) handleClose();
			}}
		>
			<div
				style={{
					background: BG_PANEL,
					border: `1px solid ${COLOR_ACCENT_MUTED}`,
					borderRadius: "6px",
					width: "min(520px, 94vw)",
					maxHeight: "90vh",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					position: "relative",
				}}
			>
				{/* Top accent rule */}
				<div
					aria-hidden="true"
					style={{
						position: "absolute",
						top: 0,
						left: "16px",
						right: "16px",
						height: "2px",
						background: `linear-gradient(90deg, transparent, ${COLOR_ACCENT}, transparent)`,
					}}
				/>

				{/* Header */}
				<div
					style={{
						padding: "20px 24px 0",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<h2
						style={{
							fontFamily: MONO,
							fontSize: "18px",
							fontWeight: "bold",
							letterSpacing: "0.2em",
							color: COLOR_ACCENT,
							textShadow: `0 0 16px ${COLOR_ACCENT}40`,
							margin: 0,
						}}
					>
						SETTINGS
					</h2>
					<button
						onClick={handleClose}
						aria-label="Close settings"
						style={{
							background: "transparent",
							border: `1px solid ${COLOR_ACCENT_MUTED}`,
							color: COLOR_CHROME,
							fontFamily: MONO,
							fontSize: "12px",
							padding: "4px 10px",
							cursor: "pointer",
							borderRadius: "3px",
						}}
					>
						[ESC] CLOSE
					</button>
				</div>

				{/* Tab bar */}
				<div
					role="tablist"
					style={{
						display: "flex",
						gap: "2px",
						padding: "12px 24px 0",
					}}
				>
					{(["graphics", "audio", "controls"] as Tab[]).map((t) => (
						<button
							key={t}
							role="tab"
							aria-selected={tab === t}
							onClick={() => setTab(t)}
							style={{
								background:
									tab === t ? COLOR_ACCENT_MUTED : "transparent",
								border: `1px solid ${tab === t ? COLOR_ACCENT : "rgba(184,196,204,0.15)"}`,
								borderBottom: "none",
								color: tab === t ? COLOR_ACCENT : "rgba(184,196,204,0.45)",
								fontFamily: MONO,
								fontSize: "11px",
								letterSpacing: "0.15em",
								padding: "6px 16px",
								cursor: "pointer",
								borderRadius: "3px 3px 0 0",
							}}
						>
							{t.toUpperCase()}
						</button>
					))}
				</div>

				{/* Divider */}
				<div
					style={{
						height: "1px",
						background: COLOR_ACCENT_MUTED,
						margin: "0 24px",
					}}
				/>

				{/* Tab content */}
				<div
					role="tabpanel"
					style={{
						flex: 1,
						overflowY: "auto",
						padding: "16px 24px",
					}}
				>
					{tab === "graphics" && (
						<GraphicsTab video={draft.video} onChange={updateVideo} />
					)}
					{tab === "audio" && (
						<AudioTab audio={draft.audio} onChange={updateAudio} />
					)}
					{tab === "controls" && (
						<ControlsTab
							controls={draft.controls}
							onChange={updateControls}
							rebinding={rebinding}
							onStartRebind={setRebinding}
						/>
					)}
				</div>

				{/* Error banner */}
				{errors.length > 0 && (
					<div
						role="alert"
						style={{
							margin: "0 24px",
							padding: "8px 12px",
							border: `1px solid rgba(204,51,34,0.3)`,
							borderRadius: "3px",
							background: "rgba(204,51,34,0.06)",
							fontFamily: MONO,
							fontSize: "10px",
							color: COLOR_ERROR,
							letterSpacing: "0.05em",
						}}
					>
						{errors[0].message}
					</div>
				)}

				{/* Footer */}
				<div
					style={{
						padding: "12px 24px 16px",
						display: "flex",
						gap: "8px",
						justifyContent: "flex-end",
					}}
				>
					<FooterButton label="RESET DEFAULTS" onClick={handleReset} />
					<FooterButton
						label="APPLY & CLOSE"
						primary
						onClick={handleClose}
					/>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Graphics tab
// ---------------------------------------------------------------------------

function GraphicsTab({
	video,
	onChange,
}: {
	video: VideoSettings;
	onChange: (p: Partial<VideoSettings>) => void;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
			<SettingsLabel>SHADOW QUALITY</SettingsLabel>
			<SegmentControl
				value={video.shadowQuality}
				options={["off", "low", "medium", "high"]}
				onChange={(v) =>
					onChange({ shadowQuality: v as VideoSettings["shadowQuality"] })
				}
				aria-label="Shadow quality"
			/>

			<SettingsLabel>RENDER DISTANCE — {video.renderDistance}m</SettingsLabel>
			<Slider
				min={50}
				max={1000}
				step={50}
				value={video.renderDistance}
				onChange={(v) => onChange({ renderDistance: v })}
				aria-label="Render distance"
			/>

			<SettingsLabel>PARTICLES — {video.particleCount}</SettingsLabel>
			<Slider
				min={0}
				max={5000}
				step={100}
				value={video.particleCount}
				onChange={(v) => onChange({ particleCount: v })}
				aria-label="Particle count"
			/>

			<SettingsLabel>FIELD OF VIEW — {video.fov}°</SettingsLabel>
			<Slider
				min={60}
				max={120}
				step={5}
				value={video.fov}
				onChange={(v) => onChange({ fov: v })}
				aria-label="Field of view"
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Audio tab
// ---------------------------------------------------------------------------

function AudioTab({
	audio,
	onChange,
}: {
	audio: AudioSettings;
	onChange: (p: Partial<AudioSettings>) => void;
}) {
	const pct = (v: number) => `${Math.round(v * 100)}%`;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
			<SettingsLabel>MASTER VOLUME — {pct(audio.masterVolume)}</SettingsLabel>
			<Slider
				min={0}
				max={1}
				step={0.05}
				value={audio.masterVolume}
				onChange={(v) => onChange({ masterVolume: v })}
				aria-label="Master volume"
			/>

			<SettingsLabel>MUSIC — {pct(audio.musicVolume)}</SettingsLabel>
			<Slider
				min={0}
				max={1}
				step={0.05}
				value={audio.musicVolume}
				onChange={(v) => onChange({ musicVolume: v })}
				aria-label="Music volume"
			/>

			<SettingsLabel>SFX — {pct(audio.sfxVolume)}</SettingsLabel>
			<Slider
				min={0}
				max={1}
				step={0.05}
				value={audio.sfxVolume}
				onChange={(v) => onChange({ sfxVolume: v })}
				aria-label="Sound effects volume"
			/>

			<SettingsLabel>AMBIENT — {pct(audio.ambientVolume)}</SettingsLabel>
			<Slider
				min={0}
				max={1}
				step={0.05}
				value={audio.ambientVolume}
				onChange={(v) => onChange({ ambientVolume: v })}
				aria-label="Ambient volume"
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Controls tab
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
	moveForward: "Move Forward",
	moveBackward: "Move Backward",
	moveLeft: "Strafe Left",
	moveRight: "Strafe Right",
	jump: "Jump",
	interact: "Interact",
	inventory: "Inventory",
	map: "Map",
	pause: "Pause",
	sprint: "Sprint",
	crouch: "Crouch",
	primaryAction: "Primary Action",
	secondaryAction: "Secondary Action",
};

function ControlsTab({
	controls,
	onChange,
	rebinding,
	onStartRebind,
}: {
	controls: ControlsSettings;
	onChange: (p: Partial<ControlsSettings>) => void;
	rebinding: string | null;
	onStartRebind: (action: string) => void;
}) {
	const pct = (v: number) => `${Math.round(v * 100)}%`;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
			<SettingsLabel>
				MOUSE SENSITIVITY — {pct(controls.mouseSensitivity)}
			</SettingsLabel>
			<Slider
				min={0.01}
				max={2.0}
				step={0.01}
				value={controls.mouseSensitivity}
				onChange={(v) => onChange({ mouseSensitivity: v })}
				aria-label="Mouse sensitivity"
			/>

			<SettingsRow>
				<span style={{ fontFamily: MONO, fontSize: "11px", color: COLOR_CHROME, letterSpacing: "0.1em" }}>
					INVERT Y-AXIS
				</span>
				<Toggle
					value={controls.invertY}
					onChange={(v) => onChange({ invertY: v })}
					aria-label="Invert Y axis"
				/>
			</SettingsRow>

			{/* Key bindings */}
			<div
				style={{
					marginTop: "12px",
					fontFamily: MONO,
					fontSize: "9px",
					color: COLOR_ACCENT_MUTED,
					letterSpacing: "0.3em",
					marginBottom: "6px",
				}}
			>
				// KEY BINDINGS //
			</div>

			{Object.keys(ACTION_LABELS).map((action) => {
				const isRebinding = rebinding === action;
				const keyLabel = controls.keyBindings[action] ?? "—";
				return (
					<SettingsRow key={action}>
						<span
							style={{
								fontFamily: MONO,
								fontSize: "11px",
								color: COLOR_CHROME,
								letterSpacing: "0.08em",
								flex: 1,
							}}
						>
							{ACTION_LABELS[action]}
						</span>
						<button
							onClick={() => onStartRebind(action)}
							aria-label={`Rebind ${ACTION_LABELS[action]}, currently ${keyLabel}`}
							style={{
								background: isRebinding
									? COLOR_ACCENT_MUTED
									: "rgba(255,255,255,0.04)",
								border: `1px solid ${isRebinding ? COLOR_ACCENT : "rgba(184,196,204,0.2)"}`,
								color: isRebinding ? COLOR_ACCENT : COLOR_CHROME,
								fontFamily: MONO,
								fontSize: "11px",
								letterSpacing: "0.08em",
								padding: "4px 12px",
								minWidth: "100px",
								cursor: "pointer",
								borderRadius: "3px",
								textAlign: "center",
							}}
						>
							{isRebinding ? "PRESS KEY..." : keyLabel}
						</button>
					</SettingsRow>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

function SettingsLabel({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				fontFamily: MONO,
				fontSize: "10px",
				color: "rgba(184,196,204,0.5)",
				letterSpacing: "0.2em",
				marginTop: "12px",
				marginBottom: "4px",
			}}
		>
			{children}
		</div>
	);
}

function SettingsRow({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				background: BG_ROW,
				padding: "6px 8px",
				borderRadius: "3px",
				gap: "12px",
			}}
		>
			{children}
		</div>
	);
}

function Slider({
	min,
	max,
	step,
	value,
	onChange,
	"aria-label": ariaLabel,
}: {
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: (v: number) => void;
	"aria-label": string;
}) {
	return (
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={value}
			aria-label={ariaLabel}
			onChange={(e) => onChange(Number(e.target.value))}
			style={{
				width: "100%",
				accentColor: COLOR_ACCENT,
				cursor: "pointer",
			}}
		/>
	);
}

function SegmentControl({
	value,
	options,
	onChange,
	"aria-label": ariaLabel,
}: {
	value: string;
	options: string[];
	onChange: (v: string) => void;
	"aria-label": string;
}) {
	return (
		<div
			role="group"
			aria-label={ariaLabel}
			style={{ display: "flex", gap: "2px" }}
		>
			{options.map((opt) => (
				<button
					key={opt}
					aria-pressed={value === opt}
					onClick={() => onChange(opt)}
					style={{
						flex: 1,
						background: value === opt ? COLOR_ACCENT_MUTED : "transparent",
						border: `1px solid ${value === opt ? COLOR_ACCENT : "rgba(184,196,204,0.15)"}`,
						color: value === opt ? COLOR_ACCENT : "rgba(184,196,204,0.4)",
						fontFamily: MONO,
						fontSize: "10px",
						letterSpacing: "0.12em",
						padding: "6px 4px",
						cursor: "pointer",
						borderRadius: "3px",
						transition: "all 0.12s ease",
					}}
				>
					{opt.toUpperCase()}
				</button>
			))}
		</div>
	);
}

function Toggle({
	value,
	onChange,
	"aria-label": ariaLabel,
}: {
	value: boolean;
	onChange: (v: boolean) => void;
	"aria-label": string;
}) {
	return (
		<button
			role="switch"
			aria-checked={value}
			aria-label={ariaLabel}
			onClick={() => onChange(!value)}
			style={{
				background: value ? COLOR_ACCENT_MUTED : "transparent",
				border: `1px solid ${value ? COLOR_ACCENT : "rgba(184,196,204,0.2)"}`,
				color: value ? COLOR_ACCENT : "rgba(184,196,204,0.35)",
				fontFamily: MONO,
				fontSize: "11px",
				letterSpacing: "0.15em",
				padding: "4px 16px",
				cursor: "pointer",
				borderRadius: "3px",
				minWidth: "70px",
			}}
		>
			{value ? "ON" : "OFF"}
		</button>
	);
}

function FooterButton({
	label,
	onClick,
	primary,
}: {
	label: string;
	onClick: () => void;
	primary?: boolean;
}) {
	const [hovered, setHovered] = useState(false);
	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				background: primary
					? hovered
						? COLOR_ACCENT_MUTED
						: "transparent"
					: "transparent",
				border: `1px solid ${primary ? (hovered ? COLOR_ACCENT : COLOR_ACCENT_MUTED) : "rgba(184,196,204,0.2)"}`,
				color: primary ? COLOR_ACCENT : "rgba(184,196,204,0.5)",
				fontFamily: MONO,
				fontSize: "11px",
				letterSpacing: "0.15em",
				padding: "8px 18px",
				cursor: "pointer",
				borderRadius: "3px",
				transition: "all 0.12s ease",
			}}
		>
			{label}
		</button>
	);
}
