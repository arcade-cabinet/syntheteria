/**
 * TitleScreen — Diegetic 3D title screen for Syntheteria.
 *
 * Replaces the static PNG/WEBP background with a live React Three Fiber
 * scene showing:
 *   - Volumetric storm clouds with wormhole glow
 *   - An Earth globe progressively consumed by ecumenopolis city lights
 *   - A hypercane spiral band and jagged lightning bolts
 *
 * The 2D overlay renders the SYNTHETERIA title with cyan glow, a curved
 * SVG bezel arc at the bottom, and animated menu buttons — all in React
 * Native + NativeWind + Reanimated.
 *
 * The storm canvas stays alive underneath the loading overlay so the
 * transition into gameplay feels diegetic rather than jarring.
 */

import { Canvas } from "@react-three/fiber";
import * as Device from "expo-device";
import { Suspense, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { getSaveGameCountSync } from "../db/saveGames";
import type { NewGameConfig } from "../world/config";
import { LoadingOverlay } from "./LoadingOverlay";
import { NewGameModal } from "./NewGameModal";
import { TitleMenuOverlay } from "./title/TitleMenuOverlay";
import { TitleMenuScene } from "./title/TitleMenuScene";

// ─── Props ───────────────────────────────────────────────────────────────────

type TitleScreenProps = {
	onContinueGame: () => Promise<void> | void;
	onNewGame: (config: NewGameConfig) => Promise<void> | void;
	isLoading?: boolean;
	loadingLabel?: string;
	saveGameCountOverride?: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TitleScreen({
	onContinueGame,
	onNewGame,
	isLoading = false,
	loadingLabel = "Hydrating world",
	saveGameCountOverride,
}: TitleScreenProps) {
	const [saveGameCount, setSaveGameCount] = useState(
		saveGameCountOverride ?? 0,
	);
	const [showNewGameModal, setShowNewGameModal] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	// Globe ecumenopolis growth: 0→1 over ~50 seconds
	const [growth, setGrowth] = useState(0);

	useEffect(() => {
		if (saveGameCountOverride === undefined) {
			setSaveGameCount(getSaveGameCountSync());
		} else {
			setSaveGameCount(saveGameCountOverride);
		}
	}, [saveGameCountOverride]);

	// Animate globe city growth
	useEffect(() => {
		const interval = setInterval(() => {
			setGrowth((g) => Math.min(g + 0.005, 1));
		}, 50);
		return () => clearInterval(interval);
	}, []);

	return (
		<View className="absolute inset-0 z-50 bg-[#020307]">
			{/* Live 3D storm/globe scene — fills entire screen */}
			<View style={StyleSheet.absoluteFill}>
				<Canvas
					style={StyleSheet.absoluteFill}
					gl={{ antialias: true, alpha: false }}
				>
					<Suspense fallback={null}>
						<TitleMenuScene growth={growth} />
					</Suspense>
				</Canvas>
			</View>

			{/* Subtle vignette for readability over the 3D scene */}
			<View
				className="absolute inset-0"
				style={{
					backgroundColor: "rgba(2, 3, 7, 0.15)",
				}}
				pointerEvents="none"
			/>

			{/* 2D overlay: title, bezel arc, menu buttons */}
			<TitleMenuOverlay
				hasSaveGame={saveGameCount > 0}
				onNewGame={() => setShowNewGameModal(true)}
				onContinueGame={() => {
					void onContinueGame();
				}}
				onSettings={() => setShowSettings(true)}
			/>

			{/* New Game modal — existing, well-built RN component */}
			<NewGameModal
				visible={showNewGameModal}
				onCancel={() => setShowNewGameModal(false)}
				onConfirm={(config) => {
					setShowNewGameModal(false);
					void onNewGame(config);
				}}
			/>

			{/* Settings overlay */}
			{showSettings && (
				<SettingsOverlay onClose={() => setShowSettings(false)} />
			)}

			{/* Loading overlay composites OVER the live storm scene */}
			{isLoading && <LoadingOverlay label={loadingLabel} />}
		</View>
	);
}

// ─── Settings Overlay (preserved from original) ─────────────────────────────

function SettingsOverlay({ onClose }: { onClose: () => void }) {
	const closeRef = useRef<View>(null);

	useEffect(() => {
		const timer = setTimeout(() => {
			(closeRef.current as unknown as HTMLElement)?.focus?.();
		}, 80);
		return () => clearTimeout(timer);
	}, []);

	return (
		<View
			className="absolute inset-0 items-center justify-center bg-[#02050a]/68 px-4"
			role="dialog"
			aria-label="Settings"
			aria-modal={true}
		>
			<View className="w-full max-w-[760px] rounded-[24px] md:rounded-[28px] border border-[#8be6ff]/18 bg-[#07111b]/94 px-4 py-4 md:px-6 md:py-6 shadow-2xl">
				<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
					System Calibration
				</Text>
				<Text className="mt-2 font-mono text-[12px] md:text-[13px] leading-5 text-white/52">
					Display, audio, and input parameters. World seed and generation
					controls are isolated to the campaign initialization flow.
				</Text>

				<View className="mt-4 md:mt-5 gap-3 md:flex-row md:gap-4">
					<SettingsCard
						title="Display"
						lines={[
							"Render scale // Default",
							"UI contrast // Default",
							"Signal shimmer // Default",
						]}
					/>
					<SettingsCard
						title="Audio"
						lines={[
							"Master output // Default",
							"Storm ambience // Default",
							"Relay tones // Default",
						]}
					/>
					<SettingsCard
						title="Input"
						lines={[
							"Pointer mode // Default",
							"Pan assist // Default",
							"Zoom damping // Default",
						]}
					/>
				</View>

				<View className="mt-4 md:mt-5 gap-3 md:flex-row md:items-center md:justify-between">
					<Text className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/28">
						Pending calibration — defaults active
					</Text>
					<Pressable
						ref={closeRef}
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Dismiss settings"
						testID="settings-close"
						className="min-h-[44px] items-center justify-center rounded-[16px] border border-[#8be6ff]/28 bg-[#0e2631] px-5 py-3"
					>
						<Text className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e6f8ff]">
							Dismiss
						</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);
}

function SettingsCard({ title, lines }: { title: string; lines: string[] }) {
	return (
		<View className="flex-1 rounded-[20px] border border-white/8 bg-[#08131a]/80 px-4 py-4">
			<Text className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8ed7e8]">
				{title}
			</Text>
			<View className="mt-3 gap-2">
				{lines.map((line) => {
					const isDefault = line.includes("Default");
					return (
						<Text
							key={line}
							className={`font-mono text-[11px] leading-5 ${isDefault ? "text-white/32" : "text-white/52"}`}
						>
							{line}
						</Text>
					);
				})}
			</View>
		</View>
	);
}
