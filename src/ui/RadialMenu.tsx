import { useEffect, useRef } from "react";
import {
	Animated,
	PanResponder,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import radialConfig from "../config/radialMenu.json";
import {
	closeRadialMenu,
	confirmRadialSelection,
	getRadialMenuState,
	type RadialPetal,
	updateRadialHover,
} from "../systems/radialMenu";

/**
 * Prompt-Style Radial Menu Renderer
 *
 * Reads the composable radial menu state and renders positioned circular
 * buttons arranged around the open point. Each category is an inner circle;
 * when expanded, sub-actions appear as smaller outer circles.
 *
 * Visual style: dark translucent circles with colored borders, matching
 * the game's cyan/amber/crimson signal language. Spring animations on
 * open/close via RN Animated.
 *
 * Preserves existing PanResponder interaction (drag-to-select on mobile,
 * click on desktop) and all testIDs for e2e compatibility.
 */

const INNER_RADIUS = 110; // Distance from center for inner ring buttons
const OUTER_RADIUS = 70; // Distance from selected inner button for outer ring
const BUTTON_SIZE = 64; // Inner button diameter
const SUB_BUTTON_SIZE = 52; // Outer button diameter
const CENTER_SIZE = 48; // Close button diameter

// Tone colors from the radial config
const TONE_COLORS: Record<
	string,
	{ border: string; text: string; bg: string; hover: string }
> = {
	default: {
		border: "rgba(126, 231, 203, 0.4)",
		text: "#d9fff3",
		bg: "rgba(7, 17, 23, 0.88)",
		hover: "rgba(126, 231, 203, 0.18)",
	},
	power: {
		border: "rgba(246, 197, 106, 0.4)",
		text: "#ffe9b0",
		bg: "rgba(7, 17, 23, 0.88)",
		hover: "rgba(246, 197, 106, 0.18)",
	},
	combat: {
		border: "rgba(255, 120, 120, 0.4)",
		text: "#ffd7d7",
		bg: "rgba(7, 17, 23, 0.88)",
		hover: "rgba(255, 120, 120, 0.18)",
	},
	system: {
		border: "rgba(139, 230, 255, 0.4)",
		text: "#d0f4ff",
		bg: "rgba(7, 17, 23, 0.88)",
		hover: "rgba(139, 230, 255, 0.18)",
	},
};

function getToneColors(tone: string) {
	return TONE_COLORS[tone] ?? TONE_COLORS.default;
}

// Position helpers
function angleForIndex(index: number, total: number): number {
	return (index / total) * Math.PI * 2 - Math.PI / 2; // Start from top
}

function positionAtAngle(
	centerX: number,
	centerY: number,
	angle: number,
	radius: number,
): { x: number; y: number } {
	return {
		x: centerX + Math.cos(angle) * radius,
		y: centerY + Math.sin(angle) * radius,
	};
}

// ─── Circular Button ─────────────────────────────────────────────────────────

function RadialButton({
	petal,
	x,
	y,
	size,
	isHovered,
	testIDPrefix,
}: {
	petal: RadialPetal;
	x: number;
	y: number;
	size: number;
	isHovered: boolean;
	testIDPrefix: string;
}) {
	const colors = getToneColors(petal.tone);

	return (
		<View
			testID={`${testIDPrefix}-${petal.id}`}
			style={{
				position: "absolute",
				left: x - size / 2,
				top: y - size / 2,
				width: size,
				height: size,
				borderRadius: size / 2,
				borderWidth: 1.5,
				borderColor: isHovered ? colors.text : colors.border,
				backgroundColor: isHovered ? colors.hover : colors.bg,
				alignItems: "center",
				justifyContent: "center",
				opacity: petal.enabled ? 1 : 0.4,
			}}
		>
			{/* Icon */}
			<Text
				style={{
					fontSize: size > 56 ? 20 : 16,
					color: colors.text,
					textAlign: "center",
				}}
			>
				{petal.icon}
			</Text>

			{/* Label or disabled reason */}
			<Text
				testID={`radial-petal-label-${petal.label.toLowerCase()}`}
				style={{
					fontSize: 8,
					fontFamily: "monospace",
					letterSpacing: 1,
					color: !petal.enabled && petal.disabledReason
						? "rgba(255, 140, 140, 0.7)"
						: colors.text,
					textTransform: "uppercase",
					marginTop: 2,
					textAlign: "center",
				}}
				numberOfLines={1}
			>
				{!petal.enabled && petal.disabledReason && isHovered
					? petal.disabledReason
					: petal.label}
			</Text>

			{/* Child count badge */}
			{petal.childCount > 1 && (
				<View
					style={{
						position: "absolute",
						top: -4,
						right: -4,
						width: 16,
						height: 16,
						borderRadius: 8,
						backgroundColor: colors.border,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Text
						style={{
							fontSize: 8,
							fontFamily: "monospace",
							color: "#071117",
							fontWeight: "700",
						}}
					>
						{petal.childCount}
					</Text>
				</View>
			)}
		</View>
	);
}

// ─── Main Radial Menu ────────────────────────────────────────────────────────

export function RadialMenu() {
	const { width: vw, height: vh } = useWindowDimensions();
	const state = getRadialMenuState();
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	const wasOpen = useRef(false);

	useEffect(() => {
		if (state.open && !wasOpen.current) {
			// Open animation
			scaleAnim.setValue(0.6);
			opacityAnim.setValue(0);
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 1,
					damping: 18,
					stiffness: 200,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 120,
					useNativeDriver: true,
				}),
			]).start();
		} else if (!state.open && wasOpen.current) {
			// Close
			Animated.parallel([
				Animated.spring(scaleAnim, {
					toValue: 0.6,
					damping: 20,
					stiffness: 300,
					useNativeDriver: true,
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 100,
					useNativeDriver: true,
				}),
			]).start();
		}
		wasOpen.current = state.open;
	}, [state.open, scaleAnim, opacityAnim]);

	// PanResponder for drag-to-select
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderMove: (_, gesture) => {
				if (!state.open) return;
				updateRadialHover(
					state.centerX + gesture.dx,
					state.centerY + gesture.dy,
				);
			},
			onPanResponderRelease: () => {
				if (!state.open) return;
				confirmRadialSelection();
			},
		}),
	).current;

	if (!state.open) return null;

	// Clamp center to viewport
	const cx = Math.max(
		INNER_RADIUS + 40,
		Math.min(vw - INNER_RADIUS - 40, state.centerX),
	);
	const cy = Math.max(
		INNER_RADIUS + 40,
		Math.min(vh - INNER_RADIUS - 40, state.centerY),
	);

	return (
		<View
			testID="radial-menu"
			className="absolute inset-0"
			style={{ zIndex: 60 }}
			pointerEvents="box-none"
			{...panResponder.panHandlers}
		>
			{/* Backdrop tap-to-close */}
			<Pressable
				className="absolute inset-0"
				style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}
				onPress={closeRadialMenu}
			/>

			<Animated.View
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					right: 0,
					bottom: 0,
					opacity: opacityAnim,
					transform: [{ scale: scaleAnim }],
				}}
				pointerEvents="box-none"
			>
				{/* Center close button */}
				<Pressable
					onPress={closeRadialMenu}
					style={{
						position: "absolute",
						left: cx - CENTER_SIZE / 2,
						top: cy - CENTER_SIZE / 2,
						width: CENTER_SIZE,
						height: CENTER_SIZE,
						borderRadius: CENTER_SIZE / 2,
						borderWidth: 2,
						borderColor: "rgba(139, 230, 255, 0.5)",
						backgroundColor: "rgba(7, 17, 23, 0.92)",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Text
						style={{
							fontSize: 18,
							color: "#8be6ff",
							fontWeight: "700",
						}}
					>
						✕
					</Text>
				</Pressable>

				{/* Inner ring: categories */}
				{state.innerPetals.map((petal, index) => {
					const angle = angleForIndex(index, state.innerPetals.length);
					const pos = positionAtAngle(cx, cy, angle, INNER_RADIUS);

					return (
						<RadialButton
							key={petal.id}
							petal={petal}
							x={pos.x}
							y={pos.y}
							size={BUTTON_SIZE}
							isHovered={state.innerHoveredIndex === index}
							testIDPrefix="radial-inner"
						/>
					);
				})}

				{/* Outer ring: sub-actions */}
				{state.outerRingOpen &&
					state.expandedInnerIndex >= 0 &&
					state.outerPetals.map((petal, index) => {
						const innerAngle = angleForIndex(
							state.expandedInnerIndex,
							state.innerPetals.length,
						);
						const innerPos = positionAtAngle(cx, cy, innerAngle, INNER_RADIUS);

						// Fan out from the inner button
						const subAngleStart = innerAngle - Math.PI / 6;
						const subAngleSpan = state.outerPetals.length > 1 ? Math.PI / 3 : 0;
						const subAngle =
							state.outerPetals.length > 1
								? subAngleStart +
									(index / (state.outerPetals.length - 1)) * subAngleSpan
								: innerAngle;

						const pos = positionAtAngle(
							innerPos.x,
							innerPos.y,
							subAngle,
							OUTER_RADIUS,
						);

						return (
							<RadialButton
								key={petal.id}
								petal={petal}
								x={pos.x}
								y={pos.y}
								size={SUB_BUTTON_SIZE}
								isHovered={state.outerHoveredIndex === index}
								testIDPrefix="radial-outer"
							/>
						);
					})}
			</Animated.View>
		</View>
	);
}
