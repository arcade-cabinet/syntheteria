import { useEffect, useRef, useState } from "react";
import {
	Image,
	type ImageSourcePropType,
	Platform,
	Pressable,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import * as Device from "expo-device";
import backgroundImage from "../../assets/ui/background.webp";
import bgCenterImage from "../../assets/ui/bg_slices/center.webp";
import type { MenuButtonId } from "../config/uiMenuAssets";
import { uiMenuAssets } from "../config/uiMenuAssets";
import { getSaveGameCountSync } from "../db/saveGames";
import type { NewGameConfig } from "../world/config";
import { LoadingOverlay } from "./LoadingOverlay";
import { NewGameModal } from "./NewGameModal";
import { getTitleMenuLayout } from "./titleScreenModel";

const titleBackground = backgroundImage as ImageSourcePropType;
const titleCenter = bgCenterImage as ImageSourcePropType;

type TitleScreenProps = {
	onContinueGame: () => Promise<void> | void;
	onNewGame: (config: NewGameConfig) => Promise<void> | void;
	isLoading?: boolean;
	loadingLabel?: string;
	saveGameCountOverride?: number;
	useBackgroundImage?: boolean;
	useImageButtons?: boolean;
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
}: TitleScreenProps) {
	const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
	// Device classification: expo-device provides hardware truth on native
	// (PHONE vs TABLET vs DESKTOP). On web it returns UNKNOWN, so we fall
	// back to viewport heuristics. For foldables, an unfolded inner display
	// has shortSide >= 600dp and should be treated as tablet even if the
	// hardware reports PHONE.
	const shortSide = Math.min(viewportWidth, viewportHeight);
	const deviceIsTablet = Device.deviceType === Device.DeviceType.TABLET;
	const deviceIsDesktop = Device.deviceType === Device.DeviceType.DESKTOP;
	const isPhoneLayout =
		!deviceIsTablet && !deviceIsDesktop && shortSide < 600;
	const [saveGameCount, setSaveGameCount] = useState(
		saveGameCountOverride ?? 0,
	);
	const [showNewGameModal, setShowNewGameModal] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [deckVisible, setDeckVisible] = useState(false);

	useEffect(() => {
		if (saveGameCountOverride === undefined) {
			setSaveGameCount(getSaveGameCountSync());
		} else {
			setSaveGameCount(saveGameCountOverride);
		}

		// Trigger the button fade-in after a short delay so the background
		// painting has a moment to breathe before the interactive layer appears.
		const timer = setTimeout(() => setDeckVisible(true), 200);
		return () => clearTimeout(timer);
	}, [saveGameCountOverride]);

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
			{/* Subtle vignette overlays for readability over the background painting */}
			<View className="absolute inset-0 bg-[#02050b]/10" />
			<View className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#03070d]/60 to-transparent" />

			{/* Buttons centered in viewport — the background art IS the title */}
			{/* Phone portrait: top-align so buttons sit in the storm zone above the logo */}
			<View
				className={`flex-1 pb-safe pt-safe ${isPhoneLayout ? "justify-start" : "justify-center"}`}
				style={{
					opacity: deckVisible ? 1 : 0,
					transform: [{ translateY: deckVisible ? 0 : -18 }],
					// Phone portrait: extra top padding pushes buttons into the storm
					// zone of the center slice, clear of the SYNTHETERIA text band.
					...(isPhoneLayout ? { paddingTop: viewportHeight * 0.06 } : {}),
					// CSS transition handles the fade — no Reanimated dependency
					...(Platform.OS === "web"
						? ({
								transitionProperty: "opacity, transform",
								transitionDuration: "0.9s",
								transitionTimingFunction: "ease-out",
							} as Record<string, string>)
						: {}),
				}}
			>
				<View className="mx-auto w-full" style={{ maxWidth: viewportWidth * 0.94 }}>
					<View
						className={`items-center justify-center md:flex-row ${
							saveGameCount > 0 ? "md:flex-nowrap" : "self-center"
						}`}
						style={{
							gap: viewportWidth >= 768 ? Math.max(viewportWidth * 0.018, 16) : 16,
							maxWidth: saveGameCount > 0 ? undefined : viewportWidth * 0.65,
						}}
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
								viewportWidth={viewportWidth}
							/>
						))}
					</View>
				</View>
			</View>

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

	// Phone layout: use the center slice (city+logo) for a focused composition.
	// Tablet/desktop: use the full background painting for immersive width.
	const bgSource = isPhoneLayout ? titleCenter : titleBackground;

	return (
		<View className="absolute inset-0 z-50 bg-[#03070d]">
			{useBackgroundImage && (
				<Image
					source={bgSource}
					resizeMode="cover"
					style={{
						position: "absolute",
						width: "100%",
						height: "100%",
					}}
				/>
			)}
			{content}
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
	viewportWidth,
}: {
	buttonId: MenuButtonId;
	label: string;
	meta: string;
	onPress?: () => void;
	compact?: boolean;
	useImageAsset?: boolean;
	viewportWidth: number;
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

	// Button dimensions scale with viewport — the buttons ARE the menu.
	// Background painting has storm clouds (top 35%), beacon/city (center),
	// SYNTHETERIA text (~55-65%), and terrain (bottom). Buttons sit in the
	// storm-to-beacon zone and must be sized to own that space.
	const isWide = viewportWidth >= 768;
	const buttonWidth = isWide
		? Math.max(Math.min(viewportWidth * (compact ? 0.38 : 0.30), 540), 260)
		: Math.min(viewportWidth * 0.85, 540);
	// Trimmed button PNGs are ~768×258 (3:1). Height gives breathing room
	// around the bar while contain mode fills the full container width.
	const buttonImageHeight = buttonWidth * 0.38;
	// Hotspot insets scale proportionally with button size
	const hotspotStyle = {
		left: buttonWidth * 0.12,
		right: buttonWidth * 0.12,
		top: buttonImageHeight * 0.18,
		bottom: buttonImageHeight * 0.15,
	};
	const imageStyle = {
		width: "100%" as const,
		height: buttonImageHeight,
	};

	return (
		<View
			className="items-center"
			style={{ width: buttonWidth, flexShrink: isWide ? 1 : 0 }}
		>
			<Animated.View
				className="relative w-full max-w-full items-center justify-center overflow-hidden"
				style={[animatedStyle, { width: "100%" }]}
			>
				<Animated.View
					style={[glowStyle, { pointerEvents: "none" }]}
					className="absolute inset-x-6 top-8 bottom-8 rounded-[28px] bg-[#7fe5ff]/20 blur-2xl"
				/>
				{useImageAsset ? (
					<Image
						source={buttonSource}
						resizeMode="contain"
						style={imageStyle}
						className="pointer-events-none"
						accessibilityLabel={`${label} button`}
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
				<Pressable
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
					accessibilityRole="button"
					accessibilityLabel={label}
					testID={`title-${buttonId}`}
					className="absolute z-10"
					style={hotspotStyle}
				/>
			</Animated.View>
		</View>
	);
}

function SettingsOverlay({ onClose }: { onClose: () => void }) {
	const closeRef = useRef<View>(null);

	useEffect(() => {
		// Auto-focus close button for keyboard users when dialog opens
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
