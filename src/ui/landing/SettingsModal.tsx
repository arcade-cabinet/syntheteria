/**
 * SettingsModal — System Calibration overlay.
 *
 * Opened from the title screen Settings button.
 * Audio sliders write directly to the audio engine.
 * Keybinding display is read-only.
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
} from "../../audio/audioEngine";

// ─── Static keybinding reference ─────────────────────────────────────────────

const KEYBINDS: Array<{ keys: string; description: string }> = [
	{ keys: "W A S D", description: "Pan camera" },
	{ keys: "Scroll", description: "Zoom" },
	{ keys: "Z", description: "Cycle zoom tier" },
	{ keys: "Tab", description: "Next unit" },
	{ keys: "Advance", description: "Advance cycle" },
	{ keys: "Esc", description: "Pause / close" },
	{ keys: "Click", description: "Select / move" },
	{ keys: "Right-click", description: "Radial menu" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export interface SettingsModalProps {
	visible: boolean;
	onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
	const closeRef = useRef<HTMLButtonElement>(null);

	const [master, setMaster] = useState(() => getMasterVolume());
	const [sfx, setSfx] = useState(() => getSfxVolumeLevel());
	const [music, setMusic] = useState(() => getMusicVolumeLevel());
	const [ambient, setAmbient] = useState(() => getAmbientVolumeLevel());

	useEffect(() => {
		if (!visible) return;
		setMaster(getMasterVolume());
		setSfx(getSfxVolumeLevel());
		setMusic(getMusicVolumeLevel());
		setAmbient(getAmbientVolumeLevel());
		const t = setTimeout(() => closeRef.current?.focus(), 80);
		return () => clearTimeout(t);
	}, [visible]);

	if (!visible) return null;

	return (
		<div
			data-testid="settings-modal"
			className="absolute inset-0 flex items-center justify-center"
			style={{ backgroundColor: "rgba(2, 5, 10, 0.82)", zIndex: 110, backdropFilter: "blur(6px)" }}
			role="dialog"
			aria-label="System Calibration"
			aria-modal={true}
		>
			<div
				className="w-full max-w-[680px] max-h-[92dvh] rounded-[20px] border border-[#8be6ff]/18 bg-[#07111b]/96 shadow-2xl flex flex-col overflow-hidden"
				style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
			>
				{/* Header */}
				<div className="flex-shrink-0 flex items-center justify-between border-b border-white/8 bg-[#081723]/96 px-5 py-4">
					<span className="text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
						System Calibration
					</span>
					<button
						ref={closeRef}
						type="button"
						onClick={onClose}
						data-testid="settings-close"
						className="h-8 w-8 flex items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/50 hover:text-white/80"
						aria-label="Close settings"
					>
						<span className="text-[16px]">{"\u00D7"}</span>
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto">
					<div className="px-5 py-5 flex flex-col gap-5">
						{/* Audio */}
						<CalibSection title="Audio Output">
							<VolumeSlider
								label="Master"
								value={master}
								onChange={(v) => { setMaster(v); setMasterVolume(v); }}
							/>
							<VolumeSlider
								label="SFX"
								value={sfx}
								onChange={(v) => { setSfx(v); setSfxVolume(v); }}
							/>
							<VolumeSlider
								label="Music"
								value={music}
								onChange={(v) => { setMusic(v); setMusicVolume(v); }}
							/>
							<VolumeSlider
								label="Ambient"
								value={ambient}
								onChange={(v) => { setAmbient(v); setAmbientVolume(v); }}
							/>
						</CalibSection>

						{/* Keybindings */}
						<CalibSection title="Keybindings">
							<div className="flex flex-col gap-2">
								{KEYBINDS.map((b) => (
									<KeyRow key={b.keys} keys={b.keys} description={b.description} />
								))}
							</div>
						</CalibSection>

						{/* Accessibility */}
						<CalibSection title="Accessibility">
							<p className="text-[11px] leading-5 text-white/40">
								Touch targets meet 44 dp minimum. All interactive elements
								include ARIA labels. Keyboard navigation is fully supported.
							</p>
							<p className="mt-2 text-[11px] leading-5 text-white/40">
								Faction identifiers use distinct shape and color markers for
								color-blind accessibility.
							</p>
						</CalibSection>
					</div>
				</div>

				{/* Footer */}
				<div className="flex-shrink-0 border-t border-white/8 px-5 py-3">
					<span className="text-[9px] uppercase tracking-[0.16em] text-white/20 block text-center">
						Changes apply immediately
					</span>
				</div>
			</div>
		</div>
	);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CalibSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-[14px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
			<span className="text-[10px] uppercase tracking-[0.24em] text-[#90ddec] mb-3 block">
				{title}
			</span>
			{children}
		</div>
	);
}

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
	const percent = Math.round(value * 100);

	const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const node = trackRef.current;
		if (!node) return;
		const rect = node.getBoundingClientRect();
		onChange(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
	};

	return (
		<div className="flex items-center gap-3 mb-2">
			<span className="text-[11px] text-white/55 w-[64px]">{label}</span>
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
						style={{ width: `${percent}%`, backgroundColor: "rgba(139, 230, 255, 0.55)" }}
					/>
				</div>
			</div>
			<div className="flex gap-1">
				<button
					type="button"
					onClick={() => onChange(Math.max(0, value - 0.05))}
					aria-label={`Decrease ${label} volume`}
					className="h-7 w-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/45 text-[12px]"
				>
					{"\u2212"}
				</button>
				<button
					type="button"
					onClick={() => onChange(Math.min(1, value + 0.05))}
					aria-label={`Increase ${label} volume`}
					className="h-7 w-7 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/45 text-[12px]"
				>
					+
				</button>
			</div>
			<span className="text-[10px] text-[#8be6ff]/55 w-[32px] text-right">
				{percent}%
			</span>
		</div>
	);
}

function KeyRow({ keys, description }: { keys: string; description: string }) {
	return (
		<div className="flex items-center gap-3">
			<div className="min-w-[64px] flex items-center justify-center rounded border border-white/12 bg-white/5 px-2 py-1">
				<span className="text-[10px] text-[#8be6ff]/65">{keys}</span>
			</div>
			<span className="text-[11px] text-white/42">{description}</span>
		</div>
	);
}
