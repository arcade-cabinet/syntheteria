/**
 * Radial action menu — appears when a player selects an object.
 *
 * Shows available actions (from the action registry) arranged in a
 * circular layout around the clicked screen position. Each action
 * is a button with label text and a 44px minimum touch target.
 *
 * Pure layout/hit-testing functions are exported for testability.
 */

import { useEffect, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RadialAction {
	id: string;
	label: string;
	icon: string;
	enabled: boolean;
}

export interface RadialActionMenuProps {
	actions: RadialAction[];
	position: { x: number; y: number };
	onAction: (id: string) => void;
	onDismiss: () => void;
}

export interface ButtonPosition {
	x: number;
	y: number;
	angle: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_RADIUS = 80;
const MIN_TOUCH_TARGET = 44;
const BUTTON_RADIUS = 24;

// ─── Pure functions (exported for testing) ──────────────────────────────────

/**
 * Distribute `count` buttons evenly around a circle centered at (centerX, centerY).
 * Starts from -PI/2 (top) so the first button appears above center.
 * Returns an array of {x, y, angle} for each button.
 */
export function calculateButtonPositions(
	count: number,
	centerX: number,
	centerY: number,
	radius: number = DEFAULT_RADIUS,
): ButtonPosition[] {
	if (count <= 0) return [];

	const positions: ButtonPosition[] = [];
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
		positions.push({
			x: centerX + Math.cos(angle) * radius,
			y: centerY + Math.sin(angle) * radius,
			angle,
		});
	}
	return positions;
}

/**
 * Test whether a click at (clickX, clickY) is outside the menu area.
 * The menu area is defined as a circle from center with the given radius,
 * plus a generous margin for the buttons themselves.
 */
export function isClickOutsideMenu(
	clickX: number,
	clickY: number,
	centerX: number,
	centerY: number,
	menuRadius: number,
): boolean {
	const dx = clickX - centerX;
	const dy = clickY - centerY;
	const distance = Math.sqrt(dx * dx + dy * dy);
	// The outer edge is at menuRadius + button hit area
	return distance > menuRadius + BUTTON_RADIUS + 4;
}

/**
 * Navigate focus among radial menu items using arrow keys.
 * Returns the index to focus next given the current index, direction, and
 * the enabled state of each action. Cycles through enabled items only,
 * wrapping around. Returns -1 if no enabled items exist.
 *
 * direction: 1 = forward (ArrowRight/ArrowDown), -1 = backward (ArrowLeft/ArrowUp)
 */
export function getNextFocusIndex(
	currentIndex: number,
	direction: 1 | -1,
	actions: Pick<RadialAction, "enabled">[],
): number {
	const count = actions.length;
	if (count === 0) return -1;

	// Find the first enabled item if nothing focused yet
	if (currentIndex < 0) {
		const first = direction === 1 ? 0 : count - 1;
		for (let i = 0; i < count; i++) {
			const idx = (first + i * direction + count * count) % count;
			if (actions[idx].enabled) return idx;
		}
		return -1;
	}

	// Cycle to the next/previous enabled item, wrapping around
	for (let step = 1; step <= count; step++) {
		const idx = ((currentIndex + step * direction) % count + count) % count;
		if (actions[idx].enabled) return idx;
	}
	return -1;
}

// ─── Component ──────────────────────────────────────────────────────────────

const MONO = "'Courier New', monospace";

export function RadialActionMenu({
	actions,
	position,
	onAction,
	onDismiss,
}: RadialActionMenuProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const itemRefs = useRef<(SVGGElement | null)[]>([]);

	// ESC key dismisses the menu; arrow keys navigate; Enter/Space activate
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onDismiss();
				return;
			}
			if (
				e.key === "ArrowRight" ||
				e.key === "ArrowDown" ||
				e.key === "ArrowLeft" ||
				e.key === "ArrowUp"
			) {
				e.preventDefault();
				const direction =
					e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
				const next = getNextFocusIndex(focusedIndex, direction, actions);
				if (next >= 0) {
					setFocusedIndex(next);
					itemRefs.current[next]?.focus();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onDismiss, focusedIndex, actions]);

	// Click outside dismisses the menu
	useEffect(() => {
		const handleMouseDown = (e: MouseEvent) => {
			if (
				isClickOutsideMenu(
					e.clientX,
					e.clientY,
					position.x,
					position.y,
					DEFAULT_RADIUS,
				)
			) {
				onDismiss();
			}
		};
		window.addEventListener("mousedown", handleMouseDown);
		return () => window.removeEventListener("mousedown", handleMouseDown);
	}, [position.x, position.y, onDismiss]);

	const positions = calculateButtonPositions(
		actions.length,
		0,
		0,
		DEFAULT_RADIUS,
	);

	// SVG viewBox is centered on (0,0), offset by the menu radius + button size
	const viewSize = (DEFAULT_RADIUS + BUTTON_RADIUS + 8) * 2;
	const halfView = viewSize / 2;

	return (
		<div
			ref={containerRef}
			style={{
				position: "absolute",
				left: position.x - halfView,
				top: position.y - halfView,
				width: viewSize,
				height: viewSize,
				zIndex: 60,
				pointerEvents: "auto",
			}}
		>
			<svg
				role="menu"
				aria-label="Object actions"
				width={viewSize}
				height={viewSize}
				viewBox={`${-halfView} ${-halfView} ${viewSize} ${viewSize}`}
			>
				{/* Background ring */}
				<circle
					cx={0}
					cy={0}
					r={DEFAULT_RADIUS + BUTTON_RADIUS + 4}
					fill="rgba(0, 8, 4, 0.85)"
					stroke="#00ffaa22"
					strokeWidth="1"
				/>

				{/* Center indicator */}
				<circle
					cx={0}
					cy={0}
					r={12}
					fill="rgba(0, 8, 4, 0.9)"
					stroke="#00ffaa44"
					strokeWidth="1"
				/>
				<circle cx={0} cy={0} r={3} fill="#00ffaa66" />

				{/* Action buttons */}
				{actions.map((action, i) => {
					const pos = positions[i];
					const buttonSize = Math.max(BUTTON_RADIUS, MIN_TOUCH_TARGET / 2);
					const isFocused = focusedIndex === i;

					return (
						<g
							key={action.id}
							ref={(el) => {
								itemRefs.current[i] = el;
							}}
							role="menuitem"
							tabIndex={action.enabled ? 0 : -1}
							aria-label={action.label}
							aria-disabled={!action.enabled}
							onFocus={() => setFocusedIndex(i)}
							onBlur={() => setFocusedIndex(-1)}
							onClick={() => {
								if (action.enabled) {
									onAction(action.id);
								}
							}}
							onKeyDown={(e) => {
								if (action.enabled && (e.key === "Enter" || e.key === " ")) {
									e.preventDefault();
									onAction(action.id);
								}
							}}
							style={{
								cursor: action.enabled ? "pointer" : "not-allowed",
							}}
						>
							{/* Touch target (invisible, ensures 44px minimum) */}
							<circle
								cx={pos.x}
								cy={pos.y}
								r={Math.max(buttonSize, MIN_TOUCH_TARGET / 2)}
								fill="transparent"
							/>
							{/* Visible button */}
							<circle
								cx={pos.x}
								cy={pos.y}
								r={buttonSize}
								fill={
									action.enabled
										? "rgba(0, 20, 10, 0.9)"
										: "rgba(20, 20, 20, 0.7)"
								}
								stroke={
									isFocused
										? "#00ffaa"
										: action.enabled
											? "#00ffaa66"
											: "#00ffaa22"
								}
								strokeWidth={isFocused ? "2" : "1"}
							/>
							{/* Focus ring — visible keyboard focus indicator */}
							{isFocused && (
								<circle
									cx={pos.x}
									cy={pos.y}
									r={buttonSize + 4}
									fill="none"
									stroke="#00ffaa"
									strokeWidth="1.5"
									strokeDasharray="4 3"
									opacity="0.7"
								/>
							)}
							{/* Icon */}
							<text
								x={pos.x}
								y={pos.y - 4}
								textAnchor="middle"
								dominantBaseline="central"
								fill={action.enabled ? "#00ffaa" : "#00ffaa44"}
								fontSize="14"
							>
								{action.icon}
							</text>
							{/* Label */}
							<text
								x={pos.x}
								y={pos.y + 12}
								textAnchor="middle"
								fill={action.enabled ? "#00ffaa99" : "#00ffaa33"}
								fontSize="8"
								fontFamily={MONO}
								letterSpacing="0.05em"
							>
								{action.label}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
