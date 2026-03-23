/**
 * ThoughtOverlay — AI narration that is dismissible and non-blocking.
 *
 * Positions at bottom-center so it doesn't cover gameplay.
 * Auto-dismisses after 6 seconds.
 * Tap/click to dismiss immediately.
 * Pointer events pass through to the game scene when no thought is shown.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { getSnapshot, subscribe } from "../../ecs/gameState";
import { dismissThought } from "../../systems/narrative";

const AUTO_DISMISS_MS = 6000;
const FADE_IN_MS = 500;
const FADE_OUT_MS = 300;

export function ThoughtOverlay() {
	const snap = useSyncExternalStore(subscribe, getSnapshot);
	const thought = snap.activeThought;
	const opacity = useRef(new Animated.Value(0)).current;
	const slideY = useRef(new Animated.Value(20)).current;
	const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (thought) {
			// Animate in
			Animated.parallel([
				Animated.timing(opacity, {
					toValue: 1,
					duration: FADE_IN_MS,
					useNativeDriver: true,
				}),
				Animated.timing(slideY, {
					toValue: 0,
					duration: FADE_IN_MS,
					useNativeDriver: true,
				}),
			]).start();

			// Set auto-dismiss
			autoDismissTimer.current = setTimeout(() => {
				Animated.parallel([
					Animated.timing(opacity, {
						toValue: 0,
						duration: FADE_OUT_MS,
						useNativeDriver: true,
					}),
					Animated.timing(slideY, {
						toValue: 20,
						duration: FADE_OUT_MS,
						useNativeDriver: true,
					}),
				]).start(() => {
					dismissThought();
				});
			}, AUTO_DISMISS_MS);

			return () => {
				if (autoDismissTimer.current) {
					clearTimeout(autoDismissTimer.current);
				}
			};
		}

		// Reset when thought clears
		opacity.setValue(0);
		slideY.setValue(20);
		return undefined;
	}, [thought, opacity, slideY]);

	if (!thought) return null;

	const handleDismiss = () => {
		if (autoDismissTimer.current) {
			clearTimeout(autoDismissTimer.current);
		}
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 0,
				duration: FADE_OUT_MS,
				useNativeDriver: true,
			}),
			Animated.timing(slideY, {
				toValue: 20,
				duration: FADE_OUT_MS,
				useNativeDriver: true,
			}),
		]).start(() => {
			dismissThought();
		});
	};

	return (
		<View
			style={{
				position: "absolute",
				left: 0,
				right: 0,
				bottom: 24,
				alignItems: "center",
				pointerEvents: "box-none",
			}}
		>
			<Animated.View
				style={{
					opacity,
					transform: [{ translateY: slideY }],
				}}
			>
				<Pressable
					onPress={handleDismiss}
					accessibilityLabel="Dismiss thought"
					accessibilityRole="button"
					style={{
						maxWidth: 480,
						minWidth: 240,
						borderRadius: 14,
						borderWidth: 1,
						borderColor: "rgba(111, 243, 200, 0.18)",
						backgroundColor: "rgba(7, 17, 23, 0.88)",
						paddingHorizontal: 20,
						paddingVertical: 12,
						pointerEvents: "auto",
					}}
				>
					<Text
						style={{
							fontFamily: "monospace",
							fontSize: 13,
							lineHeight: 20,
							letterSpacing: 0.3,
							color: "#e3fff5",
						}}
					>
						{thought.text}
					</Text>
					<Text
						style={{
							marginTop: 6,
							fontFamily: "monospace",
							fontSize: 8,
							textTransform: "uppercase",
							letterSpacing: 1.5,
							color: "rgba(255, 255, 255, 0.25)",
						}}
					>
						Tap to dismiss
					</Text>
				</Pressable>
			</Animated.View>
		</View>
	);
}
