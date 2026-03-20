import { useEffect, useRef, useState } from "react";
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
 * the game's cyan/amber/crimson signal language. CSS transitions on
 * open/close.
 *
 * Supports drag-to-select on mobile (pointer events) and click on desktop.
 * Preserves all testIDs for e2e compatibility.
 */

// radialConfig is imported for side-effect / future use
void radialConfig;

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
		<div
			data-testid={`${testIDPrefix}-${petal.id}`}
			style={{
				position: "absolute",
				left: x - size / 2,
				top: y - size / 2,
				width: size,
				height: size,
				borderRadius: "50%",
				borderWidth: 1.5,
				borderStyle: "solid",
				borderColor: isHovered ? colors.text : colors.border,
				backgroundColor: isHovered ? colors.hover : colors.bg,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				opacity: petal.enabled ? 1 : 0.4,
			}}
		>
			{/* Icon */}
			<span
				style={{
					fontSize: size > 56 ? 20 : 16,
					color: colors.text,
					textAlign: "center",
				}}
			>
				{petal.icon}
			</span>

			{/* Label or disabled reason */}
			<span
				data-testid={`radial-petal-label-${petal.label.toLowerCase()}`}
				style={{
					fontSize: 8,
					fontFamily: "monospace",
					letterSpacing: 1,
					color:
						!petal.enabled && petal.disabledReason
							? "rgba(255, 140, 140, 0.7)"
							: colors.text,
					textTransform: "uppercase",
					marginTop: 2,
					textAlign: "center",
					overflow: "hidden",
					whiteSpace: "nowrap",
					maxWidth: size - 8,
				}}
			>
				{!petal.enabled && petal.disabledReason && isHovered
					? petal.disabledReason
					: petal.label}
			</span>

			{/* Child count badge */}
			{petal.childCount > 1 && (
				<div
					style={{
						position: "absolute",
						top: -4,
						right: -4,
						width: 16,
						height: 16,
						borderRadius: "50%",
						backgroundColor: colors.border,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<span
						style={{
							fontSize: 8,
							fontFamily: "monospace",
							color: "#071117",
							fontWeight: 700,
						}}
					>
						{petal.childCount}
					</span>
				</div>
			)}
		</div>
	);
}

// ─── Main Radial Menu ────────────────────────────────────────────────────────

export function RadialMenu() {
	const state = getRadialMenuState();
	const [vw, setVw] = useState(window.innerWidth);
	const [vh, setVh] = useState(window.innerHeight);
	const [visible, setVisible] = useState(false);
	const [animScale, setAnimScale] = useState(0.6);
	const [animOpacity, setAnimOpacity] = useState(0);
	const wasOpen = useRef(false);
	const pointerOrigin = useRef<{ x: number; y: number } | null>(null);

	// Track viewport size
	useEffect(() => {
		const handleResize = () => {
			setVw(window.innerWidth);
			setVh(window.innerHeight);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Open/close animation via CSS transitions
	useEffect(() => {
		if (state.open && !wasOpen.current) {
			setVisible(true);
			// Trigger open animation on next frame
			requestAnimationFrame(() => {
				setAnimScale(1);
				setAnimOpacity(1);
			});
		} else if (!state.open && wasOpen.current) {
			setAnimScale(0.6);
			setAnimOpacity(0);
			// Hide after transition
			const t = setTimeout(() => setVisible(false), 150);
			return () => clearTimeout(t);
		}
		wasOpen.current = state.open;
	}, [state.open]);

	const handlePointerDown = (e: React.PointerEvent) => {
		pointerOrigin.current = { x: e.clientX, y: e.clientY };
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!state.open || !pointerOrigin.current) return;
		updateRadialHover(
			state.centerX + (e.clientX - pointerOrigin.current.x),
			state.centerY + (e.clientY - pointerOrigin.current.y),
		);
	};

	const handlePointerUp = () => {
		if (!state.open) return;
		confirmRadialSelection();
		pointerOrigin.current = null;
	};

	if (!state.open && !visible) return null;

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
		<div
			data-testid="radial-menu"
			className="absolute inset-0"
			style={{ zIndex: 60, pointerEvents: "none" }}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		>
			{/* Backdrop tap-to-close */}
			<button
				type="button"
				aria-label="Close radial menu"
				className="absolute inset-0 w-full h-full"
				style={{
					backgroundColor: "rgba(0, 0, 0, 0.35)",
					pointerEvents: "auto",
					border: "none",
					cursor: "default",
				}}
				onClick={closeRadialMenu}
			/>

			<div
				style={{
					position: "absolute",
					left: 0,
					top: 0,
					right: 0,
					bottom: 0,
					opacity: animOpacity,
					transform: `scale(${animScale})`,
					transition:
						"opacity 120ms ease, transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)",
					pointerEvents: "none",
				}}
			>
				{/* Center close button */}
				<button
					type="button"
					onClick={closeRadialMenu}
					style={{
						position: "absolute",
						left: cx - CENTER_SIZE / 2,
						top: cy - CENTER_SIZE / 2,
						width: CENTER_SIZE,
						height: CENTER_SIZE,
						borderRadius: "50%",
						borderWidth: 2,
						borderStyle: "solid",
						borderColor: "rgba(139, 230, 255, 0.5)",
						backgroundColor: "rgba(7, 17, 23, 0.92)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						pointerEvents: "auto",
					}}
				>
					<span
						style={{
							fontSize: 18,
							color: "#8be6ff",
							fontWeight: 700,
						}}
					>
						✕
					</span>
				</button>

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
			</div>
		</div>
	);
}
