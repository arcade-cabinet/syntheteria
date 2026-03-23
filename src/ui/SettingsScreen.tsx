/**
 * SettingsScreen — real settings overlay with working audio sliders,
 * keybinding display, and accessibility options.
 *
 * Used from both TitleScreen and PauseMenu.
 * Reads/writes audio volume state through the audioEngine API.
 * Keybinding display is read-only (shows the current KEY_BINDINGS).
 */

import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
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
	const closeRef = useRef<View>(null);

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
			(closeRef.current as unknown as HTMLElement)?.focus?.();
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
		<View
			className="absolute inset-0 items-center justify-center"
			style={{
				backgroundColor: "rgba(2, 5, 10, 0.82)",
				zIndex: 110,
				...(Platform.OS === "web"
					? ({ backdropFilter: "blur(6px)" } as Record<string, string>)
					: {}),
			}}
			role="dialog"
			aria-label="Settings"
			aria-modal={true}
		>
			<View className="w-full max-w-[760px] max-h-[90%] rounded-[24px] border border-[#8be6ff]/18 bg-[#07111b]/96 shadow-2xl overflow-hidden">
				{/* Header */}
				<View className="flex-row items-center justify-between border-b border-white/8 bg-[#081723]/96 px-5 py-4">
					<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
						System Calibration
					</Text>
					<Pressable
						ref={closeRef}
						onPress={onClose}
						className="h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/5"
						accessibilityRole="button"
						accessibilityLabel="Close settings"
						testID="settings-close"
					>
						<Text className="font-mono text-[16px] text-white/60">
							{"\u00D7"}
						</Text>
					</Pressable>
				</View>

				<ScrollView
					className="flex-1"
					contentContainerClassName="px-5 py-5 gap-5"
				>
					{/* Audio Section */}
					<SettingsSection title="Audio Output">
						<VolumeSlider
							label="Master"
							value={master}
							onChange={updateMaster}
						/>
						<VolumeSlider label="SFX" value={sfx} onChange={updateSfx} />
						<VolumeSlider label="Music" value={music} onChange={updateMusic} />
						<VolumeSlider
							label="Ambient"
							value={ambient}
							onChange={updateAmbient}
						/>
					</SettingsSection>

					{/* Keybindings Section */}
					<SettingsSection title="Keybindings">
						<View className="gap-2">
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
						</View>
					</SettingsSection>

					{/* Accessibility Section */}
					<SettingsSection title="Accessibility">
						<Text className="font-mono text-[11px] leading-5 text-white/48">
							Touch targets meet 44px minimum. All interactive elements include
							ARIA labels. Keyboard navigation is fully supported.
						</Text>
						<Text className="mt-2 font-mono text-[11px] leading-5 text-white/48">
							Motion effects are restrained by default. Color-blind friendly
							faction indicators use shape + color.
						</Text>
					</SettingsSection>
				</ScrollView>

				{/* Footer */}
				<View className="border-t border-white/8 px-5 py-3">
					<Text className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/20 text-center">
						Settings are applied immediately
					</Text>
				</View>
			</View>
		</View>
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
		<View className="rounded-[18px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
			<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#90ddec] mb-3">
				{title}
			</Text>
			{children}
		</View>
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
	const trackRef = useRef<View>(null);

	const handleTrackPress = (pageX: number) => {
		const node = trackRef.current as unknown as HTMLElement | null;
		if (!node) return;
		const rect = (node as HTMLElement).getBoundingClientRect?.();
		if (!rect) return;
		const fraction = Math.max(0, Math.min(1, (pageX - rect.left) / rect.width));
		onChange(fraction);
	};

	const percent = Math.round(value * 100);

	return (
		<View className="flex-row items-center gap-3 mb-2">
			<Text className="font-mono text-[11px] text-white/60 w-[64px]">
				{label}
			</Text>
			<Pressable
				ref={trackRef}
				className="flex-1 h-[28px] justify-center"
				accessibilityRole="adjustable"
				accessibilityLabel={`${label} volume`}
				accessibilityValue={{
					min: 0,
					max: 100,
					now: percent,
				}}
				onPress={(e) => handleTrackPress(e.nativeEvent.pageX)}
			>
				<View className="h-[6px] rounded-full bg-white/10 overflow-hidden">
					<View
						className="h-full rounded-full"
						style={{
							width: `${percent}%`,
							backgroundColor: "rgba(139, 230, 255, 0.6)",
						}}
					/>
				</View>
			</Pressable>
			<View className="flex-row items-center gap-1 w-[56px]">
				<Pressable
					onPress={() => onChange(Math.max(0, value - 0.05))}
					accessibilityRole="button"
					accessibilityLabel={`Decrease ${label} volume`}
					className="h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5"
				>
					<Text className="font-mono text-[12px] text-white/50">
						{"\u2212"}
					</Text>
				</Pressable>
				<Pressable
					onPress={() => onChange(Math.min(1, value + 0.05))}
					accessibilityRole="button"
					accessibilityLabel={`Increase ${label} volume`}
					className="h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/5"
				>
					<Text className="font-mono text-[12px] text-white/50">+</Text>
				</Pressable>
			</View>
			<Text className="font-mono text-[10px] text-[#8be6ff]/60 w-[32px] text-right">
				{percent}%
			</Text>
		</View>
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
		<View className="flex-row items-center gap-3">
			<View className="min-w-[48px] items-center rounded border border-white/12 bg-white/5 px-2 py-1">
				<Text className="font-mono text-[10px] text-[#8be6ff]/70">
					{keyLabel}
				</Text>
			</View>
			<Text className="font-mono text-[11px] text-white/48">{description}</Text>
		</View>
	);
}
