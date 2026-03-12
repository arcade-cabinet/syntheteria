import { useEffect, useRef } from "react";
import {
	Animated,
	PanResponder,
	useWindowDimensions,
	View,
} from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import radialConfig from "../config/radialMenu.json";
import {
	closeRadialMenu,
	confirmRadialSelection,
	getRadialGeometry,
	getRadialMenuState,
	type RadialPetal,
	updateRadialHover,
} from "../systems/radialMenu";

/**
 * Dual-Layer SVG Radial Menu Renderer
 *
 * Pure renderer — reads getRadialMenuState() for inner/outer ring petals.
 * Inner ring = categories, outer ring = specific actions.
 *
 * Works on both mobile (tap-hold-drag-release) and desktop (right-click).
 * Works in both world and city scenes.
 */

const { strokeWidth, labelFontSize, animationDuration } =
	radialConfig.appearance;

// --- SVG arc path helpers ---

function polarToCartesian(
	cx: number,
	cy: number,
	radius: number,
	angleDeg: number,
): { x: number; y: number } {
	const rad = (angleDeg * Math.PI) / 180;
	return {
		x: cx + radius * Math.cos(rad),
		y: cy + radius * Math.sin(rad),
	};
}

function describeArc(
	cx: number,
	cy: number,
	innerR: number,
	outerR: number,
	startAngle: number,
	endAngle: number,
): string {
	const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
	const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
	const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
	const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
	const arcSweep = endAngle - startAngle <= 180 ? 0 : 1;

	return [
		"M", outerStart.x, outerStart.y,
		"A", outerR, outerR, 0, arcSweep, 1, outerEnd.x, outerEnd.y,
		"L", innerStart.x, innerStart.y,
		"A", innerR, innerR, 0, arcSweep, 0, innerEnd.x, innerEnd.y,
		"Z",
	].join(" ");
}

interface ToneColors {
	stroke: string;
	hover: string;
	iconColor: string;
}

function getToneColors(tone: string): ToneColors {
	const toneOverrides =
		radialConfig.toneOverrides[
			tone as keyof typeof radialConfig.toneOverrides
		];
	if (toneOverrides && typeof toneOverrides !== "string") {
		const override = toneOverrides as {
			petalStroke: string;
			petalHover: string;
			iconColor: string;
		};
		return {
			stroke: override.petalStroke,
			hover: override.petalHover,
			iconColor: override.iconColor,
		};
	}
	return {
		stroke: radialConfig.colors.petalStroke,
		hover: radialConfig.colors.petalHover,
		iconColor: radialConfig.colors.iconColor,
	};
}

// --- Icon paths ---

function getIconPath(iconName: string): string {
	const icons: Record<string, string> = {
		arrow: "M0,-7 L5,3 L2,3 L2,7 L-2,7 L-2,3 L-5,3 Z",
		sword: "M0,-8 L2,-3 L1,-3 L1,5 L3,7 L-3,7 L-1,5 L-1,-3 L-2,-3 Z",
		loop: "M-4,-4 A5.5,5.5 0 1,1 4,-4 L4,-7 L8,-3 L4,1 L4,-2 A3,3 0 1,0 -4,-2 Z",
		wrench: "M-3,-7 L-1,-4 L-1,4 L-3,7 L3,7 L1,4 L1,-4 L3,-7 Z",
		signal: "M0,3 L0,3 M-6,2 Q0,-6 6,2 M-4,0 Q0,-4 4,0 M-2,-1 Q0,-3 2,-1",
		x: "M-5,-5 L-3,-5 L0,-2 L3,-5 L5,-5 L2,0 L5,5 L3,5 L0,2 L-3,5 L-5,5 L-2,0 Z",
		gear: "M-1,-7 L1,-7 L2,-5 L4,-4 L6,-5 L7,-3 L5,-1 L5,1 L7,3 L6,5 L4,4 L2,5 L1,7 L-1,7 L-2,5 L-4,4 L-6,5 L-7,3 L-5,1 L-5,-1 L-7,-3 L-6,-5 L-4,-4 L-2,-5 Z",
		arrow_up: "M0,-7 L5,0 L2,0 L2,7 L-2,7 L-2,0 L-5,0 Z",
		bolt: "M1,-8 L-3,1 L0,1 L-1,8 L3,-1 L0,-1 Z",
		eye: "M-7,0 Q0,-5 7,0 Q0,5 -7,0 Z M-2,0 A2,2 0 1,0 2,0 A2,2 0 1,0 -2,0",
		pickaxe: "M-5,-5 L-2,-2 L2,-6 L6,-2 L2,2 L-2,-2 L-5,4 L-7,2 Z",
		pause: "M-4,-6 L-1,-6 L-1,6 L-4,6 Z M1,-6 L4,-6 L4,6 L1,6 Z",
		slow: "M-3,-5 L-3,5 L4,0 Z",
		normal: "M-3,-5 L-3,5 L4,0 Z",
		fast: "M-5,-5 L-5,5 L1,0 Z M1,-5 L1,5 L7,0 Z",
		city: "M-5,6 L-5,-2 L-2,-2 L-2,-6 L2,-6 L2,-2 L5,-2 L5,6 Z",
	};
	return icons[iconName] ?? "M-3,-3 L3,-3 L3,3 L-3,3 Z";
}

// --- Petal ring component ---

function PetalRing({
	cx,
	cy,
	petals,
	innerR,
	outerR,
	hoveredIndex,
	isExpanded,
}: {
	cx: number;
	cy: number;
	petals: RadialPetal[];
	innerR: number;
	outerR: number;
	hoveredIndex: number;
	isExpanded?: boolean;
}) {
	return (
		<G opacity={isExpanded === false ? 0.4 : 1}>
			{petals.map((petal, i) => {
				const isHovered = hoveredIndex === i;
				const toneColors = getToneColors(petal.tone);
				const fill = isHovered
					? toneColors.hover
					: radialConfig.colors.petalFill;
				const stroke = isHovered
					? toneColors.stroke
					: radialConfig.colors.petalStroke;

				const arcPath = describeArc(
					cx, cy, innerR, outerR,
					petal.startAngle, petal.endAngle,
				);

				const midAngle = (petal.startAngle + petal.endAngle) / 2;
				const iconR = (innerR + outerR) / 2 - 2;
				const iconPos = polarToCartesian(cx, cy, iconR, midAngle);

				const labelR = outerR + 10;
				const labelPos = polarToCartesian(cx, cy, labelR, midAngle);

				return (
					<G key={petal.id}>
						<Path
							d={arcPath}
							fill={fill}
							stroke={stroke}
							strokeWidth={strokeWidth}
							opacity={petal.enabled ? 1 : 0.35}
						/>
						<Path
							d={getIconPath(petal.icon)}
							fill={
								petal.enabled
									? toneColors.iconColor
									: radialConfig.colors.labelDisabled
							}
							transform={`translate(${iconPos.x}, ${iconPos.y}) scale(0.6)`}
						/>
						{/* Child count badge for categories with multiple actions */}
						{petal.childCount > 1 && (
							<>
								<Circle
									cx={iconPos.x + 10}
									cy={iconPos.y - 10}
									r={6}
									fill="rgba(111, 243, 200, 0.2)"
									stroke="rgba(111, 243, 200, 0.4)"
									strokeWidth={0.5}
								/>
								<SvgText
									x={iconPos.x + 10}
									y={iconPos.y - 10}
									fill={radialConfig.colors.labelColor}
									fontSize={7}
									fontFamily="monospace"
									textAnchor="middle"
									alignmentBaseline="central"
								>
									{petal.childCount}
								</SvgText>
							</>
						)}
						<SvgText
							x={labelPos.x}
							y={labelPos.y + 1}
							fill={
								petal.enabled
									? radialConfig.colors.labelColor
									: radialConfig.colors.labelDisabled
							}
							fontSize={labelFontSize}
							fontFamily="monospace"
							textAnchor="middle"
							alignmentBaseline="middle"
							opacity={isHovered ? 1 : 0.7}
						>
							{petal.label}
						</SvgText>
					</G>
				);
			})}
		</G>
	);
}

// --- Main renderer ---

export function RadialMenu() {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const outerScaleAnim = useRef(new Animated.Value(0)).current;
	const state = getRadialMenuState();

	useEffect(() => {
		Animated.timing(scaleAnim, {
			toValue: state.open ? 1 : 0,
			duration: animationDuration,
			useNativeDriver: true,
		}).start();
	}, [state.open, scaleAnim]);

	useEffect(() => {
		Animated.spring(outerScaleAnim, {
			toValue: state.outerRingOpen ? 1 : 0,
			tension: 80,
			friction: 10,
			useNativeDriver: true,
		}).start();
	}, [state.outerRingOpen, outerScaleAnim]);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderMove: (evt) => {
				const touch = evt.nativeEvent;
				updateRadialHover(touch.pageX, touch.pageY);
			},
			onPanResponderRelease: () => {
				confirmRadialSelection();
			},
		}),
	).current;

	if (!state.open || state.innerPetals.length === 0) {
		return null;
	}

	const geo = getRadialGeometry();
	const totalRadius = geo.outerRingOuter + 20;
	const svgSize = totalRadius * 2;
	const cx = svgSize / 2;
	const cy = svgSize / 2;

	const menuX = Math.max(
		svgSize / 2,
		Math.min(screenWidth - svgSize / 2, state.centerX),
	);
	const menuY = Math.max(
		svgSize / 2,
		Math.min(screenHeight - svgSize / 2, state.centerY),
	);

	return (
		<View
			{...panResponder.panHandlers}
			className="absolute inset-0 pointer-events-auto"
			style={{ zIndex: 100 }}
		>
			<View
				className="absolute inset-0"
				onTouchEnd={() => closeRadialMenu()}
			/>

			<Animated.View
				style={{
					position: "absolute",
					left: menuX - svgSize / 2,
					top: menuY - svgSize / 2,
					width: svgSize,
					height: svgSize,
					transform: [{ scale: scaleAnim }],
					opacity: scaleAnim,
				}}
			>
				<Svg
					width={svgSize}
					height={svgSize}
					viewBox={`0 0 ${svgSize} ${svgSize}`}
				>
					{/* Center dot */}
					<Circle
						cx={cx}
						cy={cy}
						r={geo.innerRingInner * 0.4}
						fill={radialConfig.colors.centerDot}
					/>

					{/* Inner ring (categories) */}
					<PetalRing
						cx={cx}
						cy={cy}
						petals={state.innerPetals}
						innerR={geo.innerRingInner}
						outerR={geo.innerRingOuter}
						hoveredIndex={state.innerHoveredIndex}
						isExpanded={!state.outerRingOpen ? undefined : false}
					/>

					{/* Outer ring (actions) — only when expanded */}
					{state.outerRingOpen && state.outerPetals.length > 0 && (
						<PetalRing
							cx={cx}
							cy={cy}
							petals={state.outerPetals}
							innerR={geo.outerRingInner}
							outerR={geo.outerRingOuter}
							hoveredIndex={state.outerHoveredIndex}
						/>
					)}
				</Svg>
			</Animated.View>
		</View>
	);
}
