/**
 * RadialMenu — SVG overlay rendering the dual-ring radial context menu.
 * Reads state from radialMenu.ts, renders petals as SVG arc paths.
 */

import { useEffect, useRef, useState } from "react";
import {
	closeRadialMenu,
	confirmRadialSelection,
	getRadialGeometry,
	getRadialMenuState,
	type RadialPetal,
	updateRadialHover,
} from "../../systems/radialMenu";

// Tone colors
const TONE_COLORS: Record<string, { fill: string; hover: string; text: string }> = {
	neutral: { fill: "rgba(139,230,255,0.15)", hover: "rgba(139,230,255,0.35)", text: "#8be6ff" },
	harvest: { fill: "rgba(126,231,203,0.15)", hover: "rgba(126,231,203,0.35)", text: "#7ee7cb" },
	hostile: { fill: "rgba(204,68,68,0.15)", hover: "rgba(204,68,68,0.35)", text: "#cc4444" },
	construct: { fill: "rgba(232,200,106,0.15)", hover: "rgba(232,200,106,0.35)", text: "#e8c86a" },
	// Fallbacks for tones used by the full provider set
	default: { fill: "rgba(139,230,255,0.15)", hover: "rgba(139,230,255,0.35)", text: "#8be6ff" },
	power: { fill: "rgba(232,200,106,0.15)", hover: "rgba(232,200,106,0.35)", text: "#e8c86a" },
	combat: { fill: "rgba(204,68,68,0.15)", hover: "rgba(204,68,68,0.35)", text: "#cc4444" },
	signal: { fill: "rgba(139,230,255,0.15)", hover: "rgba(139,230,255,0.35)", text: "#8be6ff" },
};

function getTone(tone: string) {
	return TONE_COLORS[tone] ?? TONE_COLORS.default;
}

/** Convert degrees to radians */
function deg2rad(deg: number) {
	return (deg * Math.PI) / 180;
}

/** Build an SVG arc path between two angles at given radii */
function arcPath(
	cx: number,
	cy: number,
	innerR: number,
	outerR: number,
	startDeg: number,
	endDeg: number,
): string {
	const startRad = deg2rad(startDeg);
	const endRad = deg2rad(endDeg);
	const largeArc = endDeg - startDeg > 180 ? 1 : 0;

	const outerStart = {
		x: cx + Math.cos(startRad) * outerR,
		y: cy + Math.sin(startRad) * outerR,
	};
	const outerEnd = {
		x: cx + Math.cos(endRad) * outerR,
		y: cy + Math.sin(endRad) * outerR,
	};
	const innerStart = {
		x: cx + Math.cos(endRad) * innerR,
		y: cy + Math.sin(endRad) * innerR,
	};
	const innerEnd = {
		x: cx + Math.cos(startRad) * innerR,
		y: cy + Math.sin(startRad) * innerR,
	};

	return [
		`M ${outerStart.x} ${outerStart.y}`,
		`A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
		`L ${innerStart.x} ${innerStart.y}`,
		`A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
		"Z",
	].join(" ");
}

function PetalPath({
	petal,
	cx,
	cy,
	innerR,
	outerR,
	isHovered,
}: {
	petal: RadialPetal;
	cx: number;
	cy: number;
	innerR: number;
	outerR: number;
	isHovered: boolean;
}) {
	const tone = getTone(petal.tone);
	const midAngle = deg2rad((petal.startAngle + petal.endAngle) / 2);
	const labelR = (innerR + outerR) / 2;
	const labelX = cx + Math.cos(midAngle) * labelR;
	const labelY = cy + Math.sin(midAngle) * labelR;

	return (
		<g opacity={petal.enabled ? 1 : 0.4}>
			<path
				d={arcPath(cx, cy, innerR, outerR, petal.startAngle, petal.endAngle)}
				fill={isHovered ? tone.hover : tone.fill}
				stroke={tone.text}
				strokeWidth={isHovered ? 2 : 1}
			/>
			<text
				x={labelX}
				y={labelY - 4}
				textAnchor="middle"
				dominantBaseline="middle"
				fill={tone.text}
				fontSize={12}
				fontFamily="monospace"
				pointerEvents="none"
			>
				{petal.icon}
			</text>
			<text
				x={labelX}
				y={labelY + 10}
				textAnchor="middle"
				dominantBaseline="middle"
				fill={tone.text}
				fontSize={8}
				fontFamily="monospace"
				letterSpacing={0.5}
				pointerEvents="none"
			>
				{petal.label}
			</text>
		</g>
	);
}

export function RadialMenu() {
	const [tick, setTick] = useState(0);
	const rafRef = useRef(0);

	// Poll state at 30fps to pick up hover changes
	useEffect(() => {
		let running = true;
		const loop = () => {
			if (!running) return;
			setTick((t) => t + 1);
			rafRef.current = requestAnimationFrame(loop);
		};
		rafRef.current = requestAnimationFrame(loop);
		return () => {
			running = false;
			cancelAnimationFrame(rafRef.current);
		};
	}, []);

	// Read current state (re-read each render via tick)
	void tick;
	const state = getRadialMenuState();
	const geo = getRadialGeometry();

	if (!state.open) return null;

	const handlePointerMove = (e: React.PointerEvent) => {
		updateRadialHover(e.clientX, e.clientY);
	};

	const handleClick = (e: React.MouseEvent) => {
		// If clicking outside both rings, close
		const dx = e.clientX - state.centerX;
		const dy = e.clientY - state.centerY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < geo.innerRingInner) {
			closeRadialMenu();
			return;
		}

		if (dist > geo.outerRingOuter * 1.3) {
			closeRadialMenu();
			return;
		}

		confirmRadialSelection();
	};

	// SVG viewport large enough to contain the menu
	const size = geo.outerRingOuter * 2 + 60;
	const svgCx = size / 2;
	const svgCy = size / 2;

	return (
		<div
			data-testid="radial-menu"
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 60,
				pointerEvents: "none",
			}}
		>
			{/* Backdrop for closing */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					pointerEvents: "auto",
				}}
				onClick={() => closeRadialMenu()}
				onPointerMove={handlePointerMove}
			/>

			{/* SVG radial menu */}
			<svg
				data-testid="radial-svg"
				style={{
					position: "absolute",
					left: state.centerX - size / 2,
					top: state.centerY - size / 2,
					width: size,
					height: size,
					pointerEvents: "auto",
				}}
				viewBox={`0 0 ${size} ${size}`}
				onPointerMove={handlePointerMove}
				onClick={handleClick}
			>
				{/* Inner ring: categories */}
				{state.innerPetals.map((petal, i) => (
					<PetalPath
						key={petal.id}
						petal={petal}
						cx={svgCx}
						cy={svgCy}
						innerR={geo.innerRingInner}
						outerR={geo.innerRingOuter}
						isHovered={state.innerHoveredIndex === i}
					/>
				))}

				{/* Outer ring: actions within expanded category */}
				{state.outerRingOpen &&
					state.outerPetals.map((petal, i) => (
						<PetalPath
							key={petal.id}
							petal={petal}
							cx={svgCx}
							cy={svgCy}
							innerR={geo.outerRingInner}
							outerR={geo.outerRingOuter}
							isHovered={state.outerHoveredIndex === i}
						/>
					))}
			</svg>
		</div>
	);
}
