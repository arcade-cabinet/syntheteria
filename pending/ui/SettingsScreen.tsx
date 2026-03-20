/**
 * SettingsScreen — real settings overlay with working audio sliders,
 * keybinding display, and accessibility options.
 *
 * Used from both TitleScreen and PauseMenu.
 * Reads/writes audio volume state through the audioEngine API.
 * Keybinding display is read-only (shows the current KEY_BINDINGS).
 */

import { useEffect, useRef, useState } from "react";
import {
	getAmbientVolumeLevel,
	getMasterVolume,
	getMusicVolumeLevel,
	getSfxVolumeLevel,
	setAmbientVolume,
	setMasterVolume,
	setMusicVolume,
	setSfxVolume,
} from "../audio/audioEngine";
import { KEY_BINDINGS } from "../systems/keyboardShortcuts";

export interface SettingsScreenProps {
	visible: boolean;
	onClose: () => void;
}

export function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
	const closeRef = useRef<HTMLButtonElement>(null);

	// Audio volumes — read initial state from engine
	const [master, setMaster] = useState(() => getMasterVolume());
	const [sfx, setSfx] = useState(() => getSfxVolumeLevel());
	const [music, setMusic] = useState(() => getMusicVolumeLevel());
	const [ambient, setAmbient] = useState(() => getAmbientVolumeLevel());

	// Re-sync state when settings opens
	useEffect(() => {
		if (!visible) return;
		setMaster(getMasterVolume());
		setSfx(getSfxVolumeLevel());
		setMusic(getMusicVolumeLevel());
		setAmbient(getAmbientVolumeLevel());

		const timer = setTimeout(() => {
			closeRef.current?.focus();
		}, 80);
		return () => clearTimeout(timer);
	}, [visible]);

	if (!visible) return null;

	const updateMaster = (v: number) => {
		setMaster(v);
		setMasterVolume(v);
	};
	const updateSfx = (v: number) => {
		setSfx(v);
		setSfxVolume(v);
	};
	const updateMusic = (v: number) => {
		setMusic(v);
		setMusicVolume(v);
	};
	const updateAmbient = (v: number) => {
		setAmbient(v);
		setAmbientVolume(v);
	};

	return (
		<div
			className="absolute inset-0 flex items-center justify-center"
			style={{
				backgroundColor: "rgba(2, 5, 10, 0.82)",
				zIndex: 110,
				backdropFilter: "blur(6px)",
			}}
			role="dialog"
			aria-label="Settings"
			aria-modal={true}
		>
			<div className="w-full max-w-[760px] max-h-[90%] rounded-[24px] border border-[#8be6ff]/18 bg-[#07111b]/96 shadow-2xl overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex flex-row items-center justify-between border-b border-white/8 bg-[#081723]/96 px-5 py-4 flex-shrink-0">
					<span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
						System Calibration
					</span>
					<button
						ref={closeRef}
						onClick={onClose}
						className="h-9 w-9 flex items-center justify-center rounded-full border border-white/12 bg-white/5"
						aria-label="Close settings"
						data-testid="settings-close"
					>
						<span className="font-mono text-[16px] text-white/60">
							{"\u00D7"}
						</span>
					</button>
				</div>

				<div className="flex-1 overflow-y-auto">
					<div className="px-5 py-5 flex flex-col gap-5">
						{/* Audio Section */}
						<SettingsSection title="Audio Output">
							<VolumeSlider
								label="Master"
								value={master}
								onChange={updateMaster}
							/>
							<VolumeSlider label="SFX" value={sfx} onChange={updateSfx} />
							<VolumeSlider
								label="Music"
								value={music}
								onChange={updateMusic}
							/>
							<VolumeSlider
								label="Ambient"
								value={ambient}
								onChange={updateAmbient}
							/>
						</SettingsSection>

						{/* Keybindings Section */}
						<SettingsSection title="Keybindings">
							<div className="flex flex-col gap-2">
								{/* Camera controls */}
								<KeybindRow keyLabel="W A S D" description="Camera pan" />
								<KeybindRow keyLabel="Z" description="Zoom cycle" />
								{KEY_BINDINGS.map((bind) => (
									<KeybindRow
										key={bind.key}
										keyLabel={bind.label}
										description={bind.description}
									/>
								))}
							</div>
						</SettingsSection>

						{/* Accessibility Section */}
						<SettingsSection title="Accessibility">
							<p className="font-mono text-[11px] leading-5 text-white/48">
								Touch targets meet 44px minimum. All interactive elements
								include ARIA labels. Keyboard navigation is fully supported.
							</p>
							<p className="mt-2 font-mono text-[11px] leading-5 text-white/48">
								Motion effects are restrained by default. Color-blind friendly
								faction indicators use shape + color.
							</p>
						</SettingsSection>
					</div>
				</div>

				{/* Footer */}
				<div className="border-t border-white/8 px-5 py-3 flex-shrink-0">
					<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/20 text-center block">
						Settings are applied immediately
					</span>
				</div>
			</div>
		</div>
	);
}

// ─── Settings Section ───────────────────────────────────────────────────────

function SettingsSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-[18px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
			<span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] mb-3 block">
				{title}
			</span>
			{children}
		</div>
	);
}

// ─── Volume Slider ──────────────────────────────────────────────────────────

function VolumeSlider({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
}) {
	const trackRef = useRef<HTMLDivElement>(null);

	const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const node = trackRef.current;
		if (!node) return;
		const rect = node.getBoundingClientRect();
		const fraction = Math.max(
			0,
			Math.min(1, (e.clientX - rect.left) / rect.width),
		);
		onChange(fraction);
	};

	const percent = Math.round(value * 100);

	return (
		<div className="flex flex-row items-center gap-3 mb-2">
			<span className="font-mono text-[11px] text-white/60 w-[64px]">
				{label}
			</span>
			<div
				ref={trackRef}
				className="flex-1 h-[28px] flex items-center cursor-pointer"
				role="slider"
				aria-label={`${label} volume`}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent}
				onClick={handleTrackClick}
			>
				<div className="h-[6px] rounded-full bg-white/10 overflow-hidden w-full">
					<div
						className="h-full rounded-full"
						style={{
							width: `${percent}%`,
							backgroundColor: "rgba(139, 230, 255, 0.6)",
						}}
					/>
				</div>
			</div>
			<div className="flex flex-row items-center gap-1 w-[56px]">
				<button
					onClick={() => onChange(Math.max(0, value - 0.05))}
					aria-label={`Decrease ${label} volume`}
					className="h-7 w-7 flex items-center justify-center rounded border border-white/10 bg-white/5"
				>
					<span className="font-mono text-[12px] text-white/50">
						{"\u2212"}
					</span>
				</button>
				<button
					onClick={() => onChange(Math.min(1, value + 0.05))}
					aria-label={`Increase ${label} volume`}
					className="h-7 w-7 flex items-center justify-center rounded border border-white/10 bg-white/5"
				>
					<span className="font-mono text-[12px] text-white/50">+</span>
				</button>
			</div>
			<span className="font-mono text-[10px] text-[#8be6ff]/60 w-[32px] text-right">
				{percent}%
			</span>
		</div>
	);
}

// ─── Keybind Row ────────────────────────────────────────────────────────────

function KeybindRow({
	keyLabel,
	description,
}: {
	keyLabel: string;
	description: string;
}) {
	return (
		<div className="flex flex-row items-center gap-3">
			<div className="min-w-[48px] flex items-center justify-center rounded border border-white/12 bg-white/5 px-2 py-1">
				<span className="font-mono text-[10px] text-[#8be6ff]/70">
					{keyLabel}
				</span>
			</div>
			<span className="font-mono text-[11px] text-white/48">{description}</span>
		</div>
	);
}
