/**
 * TitleMenuOverlay — 2D React Native overlay for the title menu.
 *
 * Layers on top of the live 3D TitleMenuScene Canvas:
 *   - SYNTHETERIA title with cyan glow pulse
 *   - "Machine Consciousness Awakens" subtitle
 *   - Curved SVG bezel arc at the bottom
 *   - Three menu buttons positioned along the arc
 *   - Reanimated spring hover/press states
 *
 * All purely React Native + NativeWind + Reanimated + react-native-svg.
 * No web-only APIs. Touch-safe targets throughout.
 */

import { useEffect, useRef } from "react";
import {
	Platform,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TitleMenuOverlayProps {
	hasSaveGame: boolean;
	onNewGame: () => void;
	onContinueGame: () => void;
	onSettings: () => void;
}

// ─── Title Logo ──────────────────────────────────────────────────────────────

function SyntheteriaTitleLogo() {
	const glowOpacity = useSharedValue(0.4);
	const glitchX = useSharedValue(0);

	useEffect(() => {
		// Subtle glow pulse
		glowOpacity.value = withRepeat(
			withSequence(
				withTiming(0.7, { duration: 1800 }),
				withTiming(0.4, { duration: 1800 }),
			),
			-1,
			true,
		);

		// Subtle glitch offset
		glitchX.value = withRepeat(
			withSequence(
				withTiming(0, { duration: 2600 }),
				withTiming(-1.5, { duration: 60 }),
				withTiming(1.5, { duration: 60 }),
				withTiming(0, { duration: 60 }),
				withTiming(0, { duration: 3200 }),
			),
			-1,
			false,
		);
	}, [glowOpacity, glitchX]);

	const glitchStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value * 0.5,
		transform: [{ translateX: glitchX.value }],
	}));

	return (
		<View
			testID="title-logo"
			className="absolute items-center justify-center"
			style={{
				top: "38%",
				left: 0,
				right: 0,
			}}
			pointerEvents="none"
		>
			{/* Main title */}
			<Text
				className="font-mono text-center"
				style={{
					fontSize: Platform.select({ web: 64, default: 42 }),
					letterSpacing: Platform.select({ web: 18, default: 10 }),
					color: "#8be6ff",
					textShadowColor: "rgba(139, 230, 255, 0.8)",
					textShadowOffset: { width: 0, height: 0 },
					textShadowRadius: 30,
				}}
			>
				SYNTHETERIA
			</Text>

			{/* Glitch overlay layer */}
			<Animated.View
				style={[
					{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						alignItems: "center",
						justifyContent: "center",
					},
					glitchStyle,
				]}
			>
				<Text
					className="font-mono text-center"
					style={{
						fontSize: Platform.select({ web: 64, default: 42 }),
						letterSpacing: Platform.select({ web: 18, default: 10 }),
						color: "transparent",
						textShadowColor: "rgba(139, 230, 255, 0.3)",
						textShadowOffset: { width: 2, height: 0 },
						textShadowRadius: 4,
					}}
				>
					SYNTHETERIA
				</Text>
			</Animated.View>

			{/* Subtitle */}
			<Text
				className="mt-3 font-mono text-center"
				style={{
					fontSize: 10,
					letterSpacing: 5,
					color: "rgba(142, 215, 232, 0.6)",
					textTransform: "uppercase",
					textShadowColor: "rgba(139, 230, 255, 0.3)",
					textShadowOffset: { width: 0, height: 0 },
					textShadowRadius: 8,
				}}
			>
				Machine Consciousness Awakens
			</Text>
		</View>
	);
}

// ─── Bezel Button ────────────────────────────────────────────────────────────

function BezelButton({
	label,
	meta,
	accentColor,
	disabled = false,
	onPress,
	testID,
}: {
	label: string;
	meta: string;
	accentColor: string;
	disabled?: boolean;
	onPress?: () => void;
	testID?: string;
}) {
	const scale = useSharedValue(1);
	const glowIntensity = useSharedValue(0.3);

	const containerStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const glowStyle = useAnimatedStyle(() => ({
		opacity: glowIntensity.value,
	}));

	return (
		<Animated.View style={containerStyle}>
			<Pressable
				onPress={disabled ? undefined : onPress}
				onHoverIn={
					disabled
						? undefined
						: () => {
								scale.value = withSpring(1.06, { damping: 18, stiffness: 220 });
								glowIntensity.value = withTiming(0.7, { duration: 150 });
							}
				}
				onHoverOut={
					disabled
						? undefined
						: () => {
								scale.value = withSpring(1, { damping: 18, stiffness: 220 });
								glowIntensity.value = withTiming(0.3, { duration: 200 });
							}
				}
				onPressIn={
					disabled
						? undefined
						: () => {
								scale.value = withSpring(0.97, { damping: 20, stiffness: 260 });
								glowIntensity.value = withTiming(1, { duration: 80 });
							}
				}
				onPressOut={
					disabled
						? undefined
						: () => {
								scale.value = withSpring(1.04, { damping: 18, stiffness: 220 });
								glowIntensity.value = withTiming(0.5, { duration: 160 });
							}
				}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ disabled }}
				testID={testID}
				className="relative items-center justify-center overflow-hidden"
				style={{
					minHeight: 72,
					paddingHorizontal: Platform.select({ web: 48, default: 28 }),
					paddingVertical: 18,
					opacity: disabled ? 0.35 : 1,
				}}
			>
				{/* Background panel with angled clip feel via border radius */}
				<View
					className="absolute inset-0 overflow-hidden"
					style={{
						borderRadius: 6,
						borderWidth: 1.5,
						borderColor: disabled
							? "rgba(100, 116, 139, 0.3)"
							: `${accentColor}66`,
						backgroundColor: disabled
							? "rgba(30, 41, 59, 0.3)"
							: `${accentColor}0D`,
					}}
				/>

				{/* Glow layer */}
				{!disabled && (
					<Animated.View
						style={[
							{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								borderRadius: 6,
								backgroundColor: `${accentColor}15`,
							},
							glowStyle,
						]}
						pointerEvents="none"
					/>
				)}

				{/* Label */}
				<Text
					className="font-mono text-center"
					style={{
						fontSize: 14,
						letterSpacing: 4,
						color: disabled ? "rgba(100, 116, 139, 0.5)" : accentColor,
						fontWeight: "700",
						textTransform: "uppercase",
						textShadowColor: disabled ? "transparent" : `${accentColor}80`,
						textShadowOffset: { width: 0, height: 0 },
						textShadowRadius: disabled ? 0 : 10,
					}}
				>
					{label}
				</Text>

				{/* Meta subtitle */}
				<Text
					className="mt-1 font-mono text-center"
					style={{
						fontSize: 9,
						letterSpacing: 2,
						color: disabled ? "rgba(100, 116, 139, 0.35)" : `${accentColor}88`,
						textTransform: "uppercase",
					}}
				>
					{meta}
				</Text>
			</Pressable>
		</Animated.View>
	);
}

// ─── Curved Bezel Arc ────────────────────────────────────────────────────────

function BezelArc({ width, height }: { width: number; height: number }) {
	// The SVG draws a smooth upward-curving arc
	const viewBoxW = 1200;
	const viewBoxH = 200;

	return (
		<Svg
			width={width}
			height={height}
			viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
			style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
		>
			<Defs>
				<LinearGradient id="bezelFill" x1="0%" y1="0%" x2="0%" y2="100%">
					<Stop offset="0%" stopColor="rgba(6, 17, 26, 0.75)" />
					<Stop offset="100%" stopColor="rgba(3, 7, 13, 0.92)" />
				</LinearGradient>
			</Defs>

			{/* Filled bezel body */}
			<Path
				d={`M 0,${viewBoxH} L 0,120 Q ${viewBoxW / 2},20 ${viewBoxW},120 L ${viewBoxW},${viewBoxH} Z`}
				fill="url(#bezelFill)"
			/>

			{/* Outer glow border */}
			<Path
				d={`M 0,120 Q ${viewBoxW / 2},20 ${viewBoxW},120`}
				fill="none"
				stroke="rgba(139, 230, 255, 0.35)"
				strokeWidth="2"
			/>

			{/* Inner accent line */}
			<Path
				d={`M 50,125 Q ${viewBoxW / 2},30 ${viewBoxW - 50},125`}
				fill="none"
				stroke="rgba(139, 230, 255, 0.15)"
				strokeWidth="1"
			/>
		</Svg>
	);
}

// ─── Main Overlay ────────────────────────────────────────────────────────────

export function TitleMenuOverlay({
	hasSaveGame,
	onNewGame,
	onContinueGame,
	onSettings,
}: TitleMenuOverlayProps) {
	const { width: vw, height: vh } = useWindowDimensions();
	const isWide = vw >= 768;

	// Bezel dimensions scale with viewport
	const bezelHeight = Math.min(vh * 0.3, 200);

	// Staggered entrance animation
	const entryOpacity = useSharedValue(0);
	const entryY = useSharedValue(30);

	useEffect(() => {
		const timer = setTimeout(() => {
			entryOpacity.value = withTiming(1, { duration: 900 });
			entryY.value = withSpring(0, { damping: 20, stiffness: 100 });
		}, 600);
		return () => clearTimeout(timer);
	}, [entryOpacity, entryY]);

	const entryStyle = useAnimatedStyle(() => ({
		opacity: entryOpacity.value,
		transform: [{ translateY: entryY.value }],
	}));

	return (
		<View className="absolute inset-0" pointerEvents="box-none">
			{/* Title logo centered on the globe */}
			<SyntheteriaTitleLogo />

			{/* Bottom bezel zone */}
			<View
				className="absolute bottom-0 left-0 right-0"
				style={{ height: bezelHeight }}
				pointerEvents="box-none"
			>
				{/* SVG arc background */}
				<BezelArc width={vw} height={bezelHeight} />

				{/* Buttons positioned along the arc */}
				<Animated.View
					style={[
						{
							position: "absolute",
							bottom: 0,
							left: 0,
							right: 0,
							height: bezelHeight,
							alignItems: "center",
							justifyContent: "flex-end",
							paddingBottom: Math.max(bezelHeight * 0.08, 8),
						},
						entryStyle,
					]}
					pointerEvents="box-none"
				>
					<View
						className={`w-full ${isWide ? "flex-row" : ""} items-end justify-center`}
						style={{
							gap: isWide ? Math.max(vw * 0.03, 20) : 8,
							paddingHorizontal: vw * 0.05,
							maxWidth: 1200,
						}}
						pointerEvents="box-none"
					>
						{/* New Game — left arc, cyan accent */}
						<View
							style={{
								...(isWide ? { marginBottom: bezelHeight * 0.22 } : {}),
							}}
						>
							<BezelButton
								label="New Game"
								meta="generate persistent world"
								accentColor="#8be6ff"
								onPress={onNewGame}
								testID="title-new_game"
							/>
						</View>

						{/* Continue / Load — center apex (highest point) */}
						{hasSaveGame && (
							<View
								style={{
									...(isWide ? { marginBottom: bezelHeight * 0.35 } : {}),
								}}
							>
								<BezelButton
									label="Continue"
									meta="resume latest save"
									accentColor="#8be6ff"
									onPress={onContinueGame}
									testID="title-load_game"
								/>
							</View>
						)}

						{/* Settings — right arc, amber accent */}
						<View
							style={{
								...(isWide ? { marginBottom: bezelHeight * 0.22 } : {}),
							}}
						>
							<BezelButton
								label="Settings"
								meta="display · audio · input"
								accentColor="#fbbf24"
								onPress={onSettings}
								testID="title-settings"
							/>
						</View>
					</View>
				</Animated.View>
			</View>
		</View>
	);
}
