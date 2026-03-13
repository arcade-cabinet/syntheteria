/**
 * Otter Hologram Overlay — Patron AI holographic message display.
 *
 * Shows a holographic otter patron message with scanline effect,
 * blue tint, slight transparency, and speech bubble text.
 */

import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import {
	Animated,
	Platform,
	Pressable,
	Text,
	View,
	useWindowDimensions,
} from "react-native";
import {
	dismissHologram,
	getActiveHologramMessage,
	getDisplayProgress,
	subscribeOtterHologram,
} from "../systems/otterHologram";

export function OtterHologramOverlay() {
	const message = useSyncExternalStore(
		subscribeOtterHologram,
		getActiveHologramMessage,
	);
	const progress = useSyncExternalStore(
		subscribeOtterHologram,
		getDisplayProgress,
	);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(20)).current;
	const { width: vw } = useWindowDimensions();

	useEffect(() => {
		if (message) {
			Animated.parallel([
				Animated.spring(fadeAnim, {
					toValue: 1,
					damping: 18,
					stiffness: 200,
					useNativeDriver: true,
				}),
				Animated.spring(slideAnim, {
					toValue: 0,
					damping: 18,
					stiffness: 200,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 20,
					duration: 200,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [message, fadeAnim, slideAnim]);

	if (!message) return null;

	const panelWidth = Math.min(420, vw * 0.88);

	return (
		<Animated.View
			style={{
				position: "absolute",
				bottom: 80,
				left: (vw - panelWidth) / 2,
				width: panelWidth,
				opacity: fadeAnim,
				transform: [{ translateY: slideAnim }],
				zIndex: 55,
			}}
			pointerEvents="box-none"
		>
			<Pressable
				onPress={dismissHologram}
				accessibilityLabel="Dismiss hologram message"
				accessibilityRole="button"
				style={{
					borderWidth: 1.5,
					borderColor: "rgba(102, 178, 255, 0.35)",
					borderRadius: 12,
					backgroundColor: "rgba(10, 25, 45, 0.92)",
					overflow: "hidden",
					...(Platform.OS === "web"
						? ({ backdropFilter: "blur(12px)" } as Record<string, string>)
						: {}),
				}}
			>
				{/* Scanline overlay effect */}
				<View
					style={{
						position: "absolute",
						inset: 0,
						opacity: 0.06,
						backgroundColor: "transparent",
						borderRadius: 12,
					}}
				/>

				{/* Header with otter icon placeholder */}
				<View
					style={{
						paddingHorizontal: 16,
						paddingTop: 14,
						paddingBottom: 4,
						flexDirection: "row",
						alignItems: "center",
						gap: 10,
					}}
				>
					{/* Otter avatar circle */}
					<View
						style={{
							width: 32,
							height: 32,
							borderRadius: 16,
							borderWidth: 1.5,
							borderColor: "rgba(102, 178, 255, 0.4)",
							backgroundColor: "rgba(102, 178, 255, 0.1)",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Text
							style={{
								fontSize: 16,
								color: "#66b2ff",
								fontFamily: "monospace",
							}}
						>
							P
						</Text>
					</View>

					<View style={{ flex: 1 }}>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 8,
								letterSpacing: 2,
								color: "rgba(102, 178, 255, 0.5)",
								textTransform: "uppercase",
							}}
						>
							Patron Transmission
						</Text>
						<Text
							style={{
								fontFamily: "monospace",
								fontSize: 13,
								fontWeight: "700",
								color: "#a0cfff",
								letterSpacing: 0.5,
								marginTop: 1,
							}}
						>
							{message.title}
						</Text>
					</View>

					{/* Dismiss hint */}
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 8,
							color: "rgba(102, 178, 255, 0.3)",
							textTransform: "uppercase",
							letterSpacing: 1,
						}}
					>
						tap
					</Text>
				</View>

				{/* Message body */}
				<View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 12,
							color: "rgba(200, 220, 255, 0.8)",
							lineHeight: 18,
							fontStyle: "italic",
						}}
					>
						{message.text}
					</Text>
				</View>

				{/* Progress bar at bottom */}
				<View
					style={{
						height: 2,
						backgroundColor: "rgba(102, 178, 255, 0.1)",
					}}
				>
					<View
						style={{
							height: "100%",
							width: `${Math.round(progress * 100)}%`,
							backgroundColor: "rgba(102, 178, 255, 0.4)",
						}}
					/>
				</View>
			</Pressable>
		</Animated.View>
	);
}
