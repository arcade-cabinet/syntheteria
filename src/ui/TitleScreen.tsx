import React, { useEffect, useState } from "react";
import {
	Image,
	ImageBackground,
	type ImageSourcePropType,
	Pressable,
	Text,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import backgroundImage from "../../assets/ui/background.png";
import type { MenuButtonId } from "../config/uiMenuAssets";
import { uiMenuAssets } from "../config/uiMenuAssets";
import { getSaveGameCountSync } from "../db/saveGames";
import type { NewGameConfig } from "../world/config";
import {
	DrizzleIcon,
	ExpoIcon,
	MapIcon,
	ReactIcon,
	ShardIcon,
	TSIcon,
} from "./icons";
import { LoadingOverlay } from "./LoadingOverlay";
import { NewGameModal } from "./NewGameModal";
import { getTitleMenuLayout } from "./titleScreenModel";

const titleBackground = backgroundImage as ImageSourcePropType;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TitleScreenProps = {
	onContinueGame: () => Promise<void> | void;
	onNewGame: (config: NewGameConfig) => Promise<void> | void;
	isLoading?: boolean;
	loadingLabel?: string;
	saveGameCountOverride?: number;
	useBackgroundImage?: boolean;
	useImageButtons?: boolean;
	showDiagnosticHud?: boolean;
};

type MenuButtonSpec = {
	id: MenuButtonId;
	label: string;
	meta: string;
	onPress?: () => void;
};

export function TitleScreen({
	onContinueGame,
	onNewGame,
	isLoading = false,
	loadingLabel = "Hydrating world",
	saveGameCountOverride,
	useBackgroundImage = true,
	useImageButtons = true,
	showDiagnosticHud = true,
}: TitleScreenProps) {
	const [saveGameCount, setSaveGameCount] = useState(
		saveGameCountOverride ?? 0,
	);
	const [showNewGameModal, setShowNewGameModal] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	const deckOpacity = useSharedValue(0);
	const hudOpacity = useSharedValue(0);
	const shimmer = useSharedValue(0);

	useEffect(() => {
		if (saveGameCountOverride === undefined) {
			setSaveGameCount(getSaveGameCountSync());
		} else {
			setSaveGameCount(saveGameCountOverride);
		}

		deckOpacity.value = withDelay(180, withTiming(1, { duration: 900 }));
		hudOpacity.value = withDelay(420, withTiming(1, { duration: 1100 }));

		const pulse = setInterval(() => {
			shimmer.value = withSequence(
				withTiming(1, { duration: 420 }),
				withTiming(0, { duration: 1600 }),
			);
		}, 4200);

		return () => clearInterval(pulse);
	}, [deckOpacity, hudOpacity, saveGameCountOverride, shimmer]);

	const deckStyle = useAnimatedStyle(() => ({
		opacity: deckOpacity.value,
		transform: [{ translateY: (1 - deckOpacity.value) * -18 }],
	}));

	const hudStyle = useAnimatedStyle(() => ({
		opacity: hudOpacity.value,
	}));

	const shimmerStyle = useAnimatedStyle(() => ({
		opacity: shimmer.value * 0.35,
	}));

	const menuButtons: MenuButtonSpec[] = getTitleMenuLayout(saveGameCount).map(
		(button) => ({
			...button,
			onPress:
				button.id === "new_game"
					? () => setShowNewGameModal(true)
					: button.id === "load_game"
						? () => {
								void onContinueGame();
							}
						: () => setShowSettings(true),
		}),
	);

	const content = (
		<>
			<View className="absolute inset-0 bg-[#02050b]/18" />
			<View className="absolute inset-x-0 top-0 h-56 bg-[#03070d]/70" />
			<View className="absolute inset-x-0 top-0 h-40 bg-[#09131f]/28" />

			<Animated.View
				style={[shimmerStyle]}
				className="absolute left-0 top-0 h-32 w-full bg-[#7fe5ff]/10"
			/>

			<Animated.View style={deckStyle} className="px-4 pb-3 pt-safe">
				<View className="mx-auto mt-4 w-full max-w-[1120px] items-center">
					<View className="w-full rounded-[28px] border border-white/10 bg-[#07111b]/68 px-4 py-4 shadow-2xl">
						<View className="items-center">
							<Text className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#95dff0]">
								Stormfront Relay
							</Text>
							<Text className="mt-1 font-mono text-[11px] text-white/45">
								Distributed machine consciousness emerging across a ruined world
							</Text>
						</View>

						<View
							className={`mt-5 flex-row items-start justify-center gap-3 ${
								saveGameCount > 0 ? "flex-nowrap" : "max-w-[760px] self-center"
							}`}
						>
							{menuButtons.map((button) => (
								<HeroMenuButton
									key={button.id}
									buttonId={button.id}
									label={button.label}
									meta={button.meta}
									onPress={button.onPress}
									compact={saveGameCount === 0}
									useImageAsset={useImageButtons}
								/>
							))}
						</View>

						<View className="mt-5 rounded-[24px] border border-[#8dd6e6]/18 bg-[#061018]/72 px-4 py-3">
							<View className="flex-row items-center justify-between">
								<View>
									<Text className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8ed7e8]">
										Persistence Pipeline
									</Text>
									<Text className="mt-1 font-mono text-[11px] text-white/40">
										Save metadata, world map, POIs, and city seeds now route
										through Expo SQLite before scene load.
									</Text>
								</View>
								<View className="rounded-full border border-white/8 bg-white/5 px-3 py-1">
									<Text className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
										Outdoor Generation Online
									</Text>
								</View>
							</View>
						</View>
					</View>
				</View>
			</Animated.View>

			{showDiagnosticHud && (
				<Animated.View
					style={hudStyle}
					className="absolute bottom-12 left-0 w-full px-4"
				>
					<View className="mx-auto w-full max-w-[980px] flex-row items-end justify-between">
						<View className="rounded-[22px] border border-white/8 bg-[#071018]/74 px-4 py-3">
							<View className="flex-row items-center gap-3">
								<StatusPill
									label="World"
									value="Perpetual Storm"
									icon={<MapIcon width={14} height={14} color="#8ed7e8" />}
								/>
								<StatusPill
									label="Directive"
									value="Awaken // Connect // Rebuild"
									icon={<ShardIcon width={14} height={14} color="#8ed7e8" />}
								/>
							</View>
						</View>

						<View className="items-end gap-3">
							<View className="flex-row gap-3 opacity-35">
								<ReactIcon width={18} height={18} color="#8ed7e8" />
								<ExpoIcon width={18} height={18} color="#8ed7e8" />
								<DrizzleIcon width={18} height={18} color="#8ed7e8" />
								<TSIcon width={18} height={18} color="#8ed7e8" />
							</View>
							<Text className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/32">
								v0.1.0 • persistent world foundation
							</Text>
						</View>
					</View>
				</Animated.View>
			)}

			<NewGameModal
				visible={showNewGameModal}
				onCancel={() => setShowNewGameModal(false)}
				onConfirm={(config) => {
					setShowNewGameModal(false);
					void onNewGame(config);
				}}
			/>

			{showSettings && (
				<SettingsOverlay onClose={() => setShowSettings(false)} />
			)}
			{isLoading && <LoadingOverlay label={loadingLabel} />}
		</>
	);

	return (
		<View className="absolute inset-0 z-50 flex-1 bg-black">
			{useBackgroundImage ? (
				<ImageBackground
					source={titleBackground}
					resizeMode="cover"
					className="flex-1"
				>
					{content}
				</ImageBackground>
			) : (
				<View className="flex-1 bg-[#03070d]">{content}</View>
			)}
		</View>
	);
}

function HeroMenuButton({
	buttonId,
	label,
	meta,
	onPress,
	compact = false,
	useImageAsset = true,
}: {
	buttonId: MenuButtonId;
	label: string;
	meta: string;
	onPress?: () => void;
	compact?: boolean;
	useImageAsset?: boolean;
}) {
	const scale = useSharedValue(1);
	const glow = useSharedValue(0.55);
	const buttonSource = uiMenuAssets[buttonId].imageAsset as ImageSourcePropType;

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const glowStyle = useAnimatedStyle(() => ({
		opacity: glow.value,
	}));

	return (
		<View
			className={`${compact ? "w-[380px]" : "flex-1 max-w-[320px]"} items-center`}
		>
			<AnimatedPressable
				onPress={onPress}
				onHoverIn={() => {
					scale.value = withSpring(1.03, { damping: 18, stiffness: 220 });
					glow.value = withTiming(0.95, { duration: 160 });
				}}
				onHoverOut={() => {
					scale.value = withSpring(1, { damping: 18, stiffness: 220 });
					glow.value = withTiming(0.55, { duration: 220 });
				}}
				onPressIn={() => {
					scale.value = withSpring(0.985, { damping: 20, stiffness: 260 });
					glow.value = withTiming(1, { duration: 90 });
				}}
				onPressOut={() => {
					scale.value = withSpring(1.02, { damping: 18, stiffness: 220 });
					glow.value = withTiming(0.8, { duration: 180 });
				}}
				className="w-full items-center justify-center"
				style={animatedStyle}
			>
				<Animated.View
					pointerEvents="none"
					style={glowStyle}
					className="absolute inset-x-6 top-8 bottom-8 rounded-[28px] bg-[#7fe5ff]/20 blur-2xl"
				/>
				{useImageAsset ? (
					<Image
						source={buttonSource}
						resizeMode="contain"
						className={`${compact ? "h-[148px]" : "h-[128px]"} w-full`}
					/>
				) : (
					<View className="w-full rounded-[28px] border border-[#8be6ff]/26 bg-[#0b1822]/88 px-5 py-6">
						<View className="rounded-[20px] border border-white/8 bg-[#050c12]/82 px-4 py-5">
							<Text className="font-mono text-[18px] uppercase tracking-[0.2em] text-[#ecfbff]">
								{label}
							</Text>
							<Text className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8fdcec]">
								{meta}
							</Text>
						</View>
					</View>
				)}
			</AnimatedPressable>
			<Text className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8fdcec]">
				{label} • {meta}
			</Text>
		</View>
	);
}

function SettingsOverlay({ onClose }: { onClose: () => void }) {
	return (
		<View className="absolute inset-0 items-center justify-center bg-[#02050a]/68 px-4">
			<View className="w-full max-w-[760px] rounded-[28px] border border-[#8be6ff]/18 bg-[#07111b]/94 px-6 py-6 shadow-2xl">
				<Text className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8be6ff]">
					Settings
				</Text>
				<Text className="mt-2 font-mono text-[13px] leading-5 text-white/52">
					Display, audio, and input calibration live here. World generation
					parameters are intentionally isolated to the New Game flow.
				</Text>

				<View className="mt-5 flex-row gap-4">
					<SettingsCard
						title="Display"
						lines={[
							"Render scale // Auto",
							"UI contrast // High",
							"Shimmer // Enabled",
						]}
					/>
					<SettingsCard
						title="Audio"
						lines={[
							"Master bus // 82%",
							"Storm bed // 74%",
							"Interface tones // 66%",
						]}
					/>
					<SettingsCard
						title="Input"
						lines={[
							"Pointer mode // Hybrid",
							"Pan assist // Enabled",
							"Zoom damping // Standard",
						]}
					/>
				</View>

				<View className="mt-5 flex-row justify-end">
					<Pressable
						onPress={onClose}
						className="rounded-[16px] border border-[#8be6ff]/28 bg-[#0e2631] px-4 py-3"
					>
						<Text className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#e6f8ff]">
							Close Settings
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
				{lines.map((line) => (
					<Text
						key={line}
						className="font-mono text-[11px] leading-5 text-white/52"
					>
						{line}
					</Text>
				))}
			</View>
		</View>
	);
}

function StatusPill({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon: React.ReactNode;
}) {
	return (
		<View className="rounded-full border border-white/8 bg-[#08111a]/82 px-3 py-2">
			<View className="flex-row items-center gap-2">
				{icon}
				<View>
					<Text className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
						{label}
					</Text>
					<Text className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#d8f5ff]">
						{value}
					</Text>
				</View>
			</View>
		</View>
	);
}
