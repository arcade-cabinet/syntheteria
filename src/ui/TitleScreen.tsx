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
import { Suspense, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { getSaveGameCountSync } from "../db/saveGames";
import type { NewGameConfig } from "../world/config";
import { LoadingOverlay } from "./LoadingOverlay";
import { NewGameModal } from "./NewGameModal";
import { SettingsScreen } from "./SettingsScreen";
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
		if (Platform.OS === "web" && typeof document !== "undefined") {
			document.title = "Syntheteria";
		}
	}, []);

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
			<SettingsScreen
				visible={showSettings}
				onClose={() => setShowSettings(false)}
			/>

			{/* Loading overlay composites OVER the live storm scene */}
			{isLoading && <LoadingOverlay label={loadingLabel} />}
		</View>
	);
}
