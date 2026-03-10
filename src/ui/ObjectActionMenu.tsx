/**
 * ObjectActionMenu — context-sensitive radial action menu.
 *
 * Appears when the player clicks/selects an entity in the world.
 * Shows different actions depending on the entity type (ore deposit,
 * furnace, bot, building, cube, lightning rod, signal relay).
 *
 * Renders as an SVG radial menu centered on the crosshair with
 * wedge-shaped buttons arranged in a circle. Each wedge has an icon
 * and label in the machine-vision aesthetic (terminal green, dark
 * backgrounds, monospace font).
 *
 * Wired into InteractionSystem via getMenuState()/subscribeMenu().
 * Dispatches actions via the `coreloop:action` custom event.
 */

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from "react";
import type { EntityCategory } from "../input/ObjectSelectionSystem";
import type { Action } from "../systems/actionRegistry";
import { getMenuState, subscribeMenu } from "../systems/InteractionSystem";

// ─── Constants ──────────────────────────────────────────────────────────────

const MONO = "'Courier New', monospace";

/** Radius of the action button circle from center. */
const RING_RADIUS = 85;

/** Radius of each wedge button hit area. */
const WEDGE_RADIUS = 30;

/** Minimum touch target size (44px per WCAG). */
const MIN_TOUCH = 44;

/** Background ring outer radius. */
const BG_OUTER = RING_RADIUS + WEDGE_RADIUS + 10;

/** SVG viewBox half-size. */
const HALF_VIEW = BG_OUTER + 4;

/** Full SVG viewBox size. */
const VIEW_SIZE = HALF_VIEW * 2;

// ─── Color Palette ──────────────────────────────────────────────────────────

const COLORS = {
	// Entity type header colors
	entityType: {
		unit: "#00aaff",
		building: "#aa8844",
		belt: "#44ff88",
		wire: "#ffaa00",
		miner: "#ff8844",
		processor: "#aa44ff",
		item: "#00ffaa",
		otter: "#88cc44",
		hackable: "#ff4488",
		signalRelay: "#ff4488",
		ground: "#00ffaa44",
	} as Record<string, string>,

	// Action category colors
	primary: "#00ffaa",
	secondary: "#00aaff",
	danger: "#ff4444",
	default: "#00ffaa",

	// Background
	bgDark: "rgba(0, 8, 4, 0.92)",
	bgWedge: "rgba(0, 20, 10, 0.9)",
	bgWedgeDisabled: "rgba(20, 20, 20, 0.7)",
	bgWedgeHover: "rgba(0, 40, 20, 0.95)",

	// Borders
	borderDim: "#00ffaa22",
	borderMed: "#00ffaa44",
	borderBright: "#00ffaa88",
} as const;

// ─── Entity Type Labels ─────────────────────────────────────────────────────

const ENTITY_TYPE_LABELS: Record<string, string> = {
	unit: "BOT",
	building: "BUILDING",
	belt: "CONVEYOR",
	wire: "WIRE",
	miner: "DRILL",
	processor: "PROCESSOR",
	item: "ITEM",
	otter: "OTTER",
	hackable: "HACKABLE",
	signalRelay: "RELAY",
	ground: "TERRAIN",
};

/** Derive a display label from entity traits when no category is available. */
function labelFromTraits(traits: string[]): string {
	if (traits.includes("OreDeposit")) return "ORE DEPOSIT";
	if (traits.includes("Furnace")) return "FURNACE";
	if (traits.includes("MaterialCube")) return "CUBE";
	if (traits.includes("LightningRod")) return "LIGHTNING ROD";
	if (traits.includes("SignalRelay")) return "SIGNAL RELAY";
	if (traits.includes("Hackable")) return "HACKABLE";
	if (traits.includes("Unit")) return "BOT";
	if (traits.includes("Building")) return "BUILDING";
	if (traits.includes("Belt")) return "CONVEYOR";
	if (traits.includes("Otter")) return "OTTER";
	return "UNKNOWN";
}

/** Get the accent color for an entity based on its category or traits. */
function getEntityAccent(category: EntityCategory, traits: string[]): string {
	if (category && COLORS.entityType[category]) {
		return COLORS.entityType[category];
	}
	// Fallback based on traits
	if (traits.includes("OreDeposit")) return "#ffaa00";
	if (traits.includes("Furnace")) return "#ff6600";
	if (traits.includes("MaterialCube")) return "#00aaff";
	if (traits.includes("LightningRod")) return "#ffaa00";
	if (traits.includes("SignalRelay")) return "#ff4488";
	return COLORS.default;
}

/** Get color for an action based on its category. */
function getActionColor(action: Action): string {
	switch (action.category) {
		case "primary":
			return COLORS.primary;
		case "secondary":
			return COLORS.secondary;
		case "danger":
			return COLORS.danger;
		default:
			return COLORS.default;
	}
}

// ─── Wedge Path Generator ───────────────────────────────────────────────────

/**
 * Generate an SVG path for a wedge (arc segment) of the radial menu.
 * Each wedge spans an angular range around the ring.
 */
function wedgePath(
	angle: number,
	wedgeAngle: number,
	innerR: number,
	outerR: number,
): string {
	const startAngle = angle - wedgeAngle / 2;
	const endAngle = angle + wedgeAngle / 2;

	const ix1 = Math.cos(startAngle) * innerR;
	const iy1 = Math.sin(startAngle) * innerR;
	const ix2 = Math.cos(endAngle) * innerR;
	const iy2 = Math.sin(endAngle) * innerR;

	const ox1 = Math.cos(startAngle) * outerR;
	const oy1 = Math.sin(startAngle) * outerR;
	const ox2 = Math.cos(endAngle) * outerR;
	const oy2 = Math.sin(endAngle) * outerR;

	const largeArc = wedgeAngle > Math.PI ? 1 : 0;

	return [
		`M ${ix1} ${iy1}`,
		`L ${ox1} ${oy1}`,
		`A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
		`L ${ix2} ${iy2}`,
		`A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
		"Z",
	].join(" ");
}

// ─── ActionWedge Sub-component ──────────────────────────────────────────────

interface ActionWedgeProps {
	action: Action;
	index: number;
	total: number;
	onAction: (id: string) => void;
}

function ActionWedge({ action, index, total, onAction }: ActionWedgeProps) {
	const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
	const wedgeAngle = (Math.PI * 2) / total;

	// Position for icon and label (on the ring)
	const cx = Math.cos(angle) * RING_RADIUS;
	const cy = Math.sin(angle) * RING_RADIUS;

	const color = getActionColor(action);
	const innerR = RING_RADIUS - WEDGE_RADIUS;
	const outerR = RING_RADIUS + WEDGE_RADIUS;

	// Gap between wedges
	const gapAngle = total > 1 ? 0.04 : 0;
	const effectiveWedgeAngle = wedgeAngle - gapAngle;

	const path = wedgePath(angle, effectiveWedgeAngle, innerR, outerR);

	return (
		<g
			onClick={(e) => {
				e.stopPropagation();
				if (action.enabled) {
					onAction(action.id);
				}
			}}
			style={{
				cursor: action.enabled ? "pointer" : "not-allowed",
			}}
		>
			{/* Wedge shape */}
			<path
				d={path}
				fill={action.enabled ? COLORS.bgWedge : COLORS.bgWedgeDisabled}
				stroke={action.enabled ? `${color}44` : COLORS.borderDim}
				strokeWidth="1"
			>
				<title>{action.label}</title>
			</path>

			{/* Invisible touch target circle for accessibility */}
			<circle
				cx={cx}
				cy={cy}
				r={Math.max(WEDGE_RADIUS, MIN_TOUCH / 2)}
				fill="transparent"
			/>

			{/* Icon */}
			<text
				x={cx}
				y={cy - 5}
				textAnchor="middle"
				dominantBaseline="central"
				fill={action.enabled ? color : `${color}44`}
				fontSize="16"
				style={{ pointerEvents: "none" }}
			>
				{action.icon}
			</text>

			{/* Label */}
			<text
				x={cx}
				y={cy + 11}
				textAnchor="middle"
				fill={action.enabled ? `${color}cc` : `${color}33`}
				fontSize="8"
				fontFamily={MONO}
				letterSpacing="0.08em"
				fontWeight="bold"
				style={{ pointerEvents: "none" }}
			>
				{action.label}
			</text>
		</g>
	);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ObjectActionMenu() {
	const menu = useSyncExternalStore(subscribeMenu, getMenuState);
	const containerRef = useRef<HTMLDivElement>(null);

	// Derive display info
	const entityLabel = useMemo(() => {
		if (!menu.visible) return "";
		if (menu.entityCategory && ENTITY_TYPE_LABELS[menu.entityCategory]) {
			return ENTITY_TYPE_LABELS[menu.entityCategory];
		}
		return labelFromTraits(menu.entityTraits);
	}, [menu.visible, menu.entityCategory, menu.entityTraits]);

	const entityAccent = useMemo(() => {
		if (!menu.visible) return COLORS.default;
		return getEntityAccent(menu.entityCategory, menu.entityTraits);
	}, [menu.visible, menu.entityCategory, menu.entityTraits]);

	// ── Dispatch action to InteractionSystem ──
	const handleAction = useCallback((actionId: string) => {
		window.dispatchEvent(
			new CustomEvent("coreloop:action", {
				detail: { actionId },
			}),
		);
	}, []);

	// ── Dismiss ──
	const handleDismiss = useCallback(() => {
		window.dispatchEvent(
			new CustomEvent("coreloop:action", {
				detail: { actionId: "__dismiss__" },
			}),
		);
	}, []);

	// ── ESC key to close ──
	useEffect(() => {
		if (!menu.visible) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				handleDismiss();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [menu.visible, handleDismiss]);

	// ── Click outside to close ──
	useEffect(() => {
		if (!menu.visible) return;

		const onMouseDown = (e: MouseEvent) => {
			const dx = e.clientX - menu.position.x;
			const dy = e.clientY - menu.position.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > BG_OUTER + 8) {
				handleDismiss();
			}
		};

		// Delay adding listener to avoid catching the opening click
		const timerId = window.setTimeout(() => {
			window.addEventListener("mousedown", onMouseDown);
		}, 50);

		return () => {
			window.clearTimeout(timerId);
			window.removeEventListener("mousedown", onMouseDown);
		};
	}, [menu.visible, menu.position.x, menu.position.y, handleDismiss]);

	if (!menu.visible || menu.actions.length === 0) return null;

	return (
		<div
			ref={containerRef}
			style={{
				position: "absolute",
				left: menu.position.x - HALF_VIEW,
				top: menu.position.y - HALF_VIEW,
				width: VIEW_SIZE,
				height: VIEW_SIZE,
				zIndex: 60,
				pointerEvents: "auto",
			}}
		>
			<svg
				width={VIEW_SIZE}
				height={VIEW_SIZE}
				viewBox={`${-HALF_VIEW} ${-HALF_VIEW} ${VIEW_SIZE} ${VIEW_SIZE}`}
			>
				{/* ── Background ring ── */}
				<circle
					cx={0}
					cy={0}
					r={BG_OUTER}
					fill={COLORS.bgDark}
					stroke={COLORS.borderDim}
					strokeWidth="1"
				/>

				{/* ── Subtle ring guides ── */}
				<circle
					cx={0}
					cy={0}
					r={RING_RADIUS + WEDGE_RADIUS}
					fill="none"
					stroke={COLORS.borderDim}
					strokeWidth="0.5"
				/>
				<circle
					cx={0}
					cy={0}
					r={RING_RADIUS - WEDGE_RADIUS}
					fill="none"
					stroke={COLORS.borderDim}
					strokeWidth="0.5"
				/>

				{/* ── Scan line effect (decorative) ── */}
				{Array.from({ length: 8 }).map((_, i) => {
					const a = (i / 8) * Math.PI * 2;
					const x1 = Math.cos(a) * (RING_RADIUS - WEDGE_RADIUS - 4);
					const y1 = Math.sin(a) * (RING_RADIUS - WEDGE_RADIUS - 4);
					const x2 = Math.cos(a) * (RING_RADIUS + WEDGE_RADIUS + 4);
					const y2 = Math.sin(a) * (RING_RADIUS + WEDGE_RADIUS + 4);
					return (
						<line
							key={i}
							x1={x1}
							y1={y1}
							x2={x2}
							y2={y2}
							stroke={COLORS.borderDim}
							strokeWidth="0.3"
						/>
					);
				})}

				{/* ── Action wedges ── */}
				{menu.actions.map((action, i) => (
					<ActionWedge
						key={action.id}
						action={action}
						index={i}
						total={menu.actions.length}
						onAction={handleAction}
					/>
				))}

				{/* ── Center hub ── */}
				<circle
					cx={0}
					cy={0}
					r={RING_RADIUS - WEDGE_RADIUS - 6}
					fill={COLORS.bgDark}
					stroke={`${entityAccent}44`}
					strokeWidth="1.5"
				/>

				{/* Center crosshair dot */}
				<circle cx={0} cy={0} r={2.5} fill={`${entityAccent}88`} />

				{/* Entity type label */}
				<text
					x={0}
					y={-12}
					textAnchor="middle"
					fill={entityAccent}
					fontSize="9"
					fontFamily={MONO}
					letterSpacing="0.15em"
					fontWeight="bold"
					style={{ pointerEvents: "none" }}
				>
					{entityLabel}
				</text>

				{/* Entity ID (truncated) */}
				<text
					x={0}
					y={2}
					textAnchor="middle"
					fill={`${entityAccent}66`}
					fontSize="7"
					fontFamily={MONO}
					letterSpacing="0.05em"
					style={{ pointerEvents: "none" }}
				>
					{menu.entityId
						? menu.entityId.length > 8
							? `${menu.entityId.slice(0, 8)}..`
							: menu.entityId
						: ""}
				</text>

				{/* Action count */}
				<text
					x={0}
					y={14}
					textAnchor="middle"
					fill={`${entityAccent}44`}
					fontSize="7"
					fontFamily={MONO}
					style={{ pointerEvents: "none" }}
				>
					{menu.actions.length} ACTION{menu.actions.length !== 1 ? "S" : ""}
				</text>
			</svg>
		</div>
	);
}
