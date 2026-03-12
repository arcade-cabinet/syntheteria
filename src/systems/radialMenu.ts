import radialConfig from "../config/radialMenu.json";

/**
 * Composable Dual-Layer Radial Menu System
 *
 * Pure TS system — no React, no SVG, no rendering.
 *
 * Architecture:
 * - Systems register ACTION PROVIDERS via registerRadialProvider()
 * - Each provider belongs to a CATEGORY (Build, Combat, System, etc.)
 * - Categories form the INNER RING
 * - When user selects a category, its actions form the OUTER RING
 *   centered around the selected inner petal
 * - Providers with a single action skip the outer ring (direct execute)
 *
 * This is composable because:
 * - No system knows about any other system's actions
 * - The menu is populated dynamically at open time
 * - Providers can enable/disable actions based on ECS state
 * - Adding a new system's actions = one registerRadialProvider() call
 *
 * Dual-layer behavior:
 * - Inner ring: drag to a category and HOLD → outer ring appears
 * - Outer ring: continue dragging to specific action → release to execute
 * - If a category has only 1 action, it executes immediately on inner selection
 */

// --- Types ---

/** Context passed to providers when the menu opens */
export interface RadialOpenContext {
	/** Type of thing under the pointer */
	selectionType: "unit" | "building" | "empty_sector" | "resource_node" | "none";
	/** Entity ID of the selected unit/building (null for open sector space) */
	targetEntityId: string | null;
	/** Sector coordinates of the interaction point */
	targetSector: { q: number; r: number } | null;
	/** Current faction of the selected entity */
	targetFaction: string | null;
}

/** A single executable action provided by a system */
export interface RadialAction {
	id: string;
	label: string;
	icon: string;
	tone: string;
	enabled: boolean;
	/** Called when this action is selected */
	onExecute: (context: RadialOpenContext) => void;
}

/** A category that groups related actions */
export interface RadialCategory {
	id: string;
	label: string;
	icon: string;
	tone: string;
	/** Priority for clockwise ordering (lower = earlier, starting from 12 o'clock) */
	priority: number;
}

/** A provider registered by a game system */
export interface RadialActionProvider {
	/** Unique provider ID */
	id: string;
	/** Which category this provider contributes to */
	category: RadialCategory;
	/** Return available actions for the given context. Empty array = don't show category. */
	getActions: (context: RadialOpenContext) => RadialAction[];
}

/** Computed petal with angle geometry */
export interface RadialPetal {
	id: string;
	label: string;
	icon: string;
	tone: string;
	enabled: boolean;
	startAngle: number;
	endAngle: number;
	/** For inner ring: number of sub-actions. 0 = direct action. */
	childCount: number;
}

/** Full menu state exposed to the renderer */
export interface RadialMenuState {
	open: boolean;
	centerX: number;
	centerY: number;
	/** Inner ring petals (categories) */
	innerPetals: RadialPetal[];
	/** Outer ring petals (actions within selected category) */
	outerPetals: RadialPetal[];
	/** Which inner petal is hovered (-1 = none) */
	innerHoveredIndex: number;
	/** Which outer petal is hovered (-1 = none) */
	outerHoveredIndex: number;
	/** Whether the outer ring is visible */
	outerRingOpen: boolean;
	/** Index of the inner petal that expanded the outer ring */
	expandedInnerIndex: number;
	/** The context that was passed when the menu opened */
	context: RadialOpenContext | null;
}

// --- Provider registry ---

const providers: RadialActionProvider[] = [];

/**
 * Register an action provider. Call this from any system's module scope.
 * The provider's getActions() is called each time the menu opens.
 */
export function registerRadialProvider(provider: RadialActionProvider) {
	// Replace existing provider with same ID
	const existing = providers.findIndex((p) => p.id === provider.id);
	if (existing >= 0) {
		providers[existing] = provider;
	} else {
		providers.push(provider);
	}
}

// --- Module state ---

let menuState: RadialMenuState = closedState();
let resolvedActions = new Map<string, RadialAction[]>();

function closedState(): RadialMenuState {
	return {
		open: false,
		centerX: 0,
		centerY: 0,
		innerPetals: [],
		outerPetals: [],
		innerHoveredIndex: -1,
		outerHoveredIndex: -1,
		outerRingOpen: false,
		expandedInnerIndex: -1,
		context: null,
	};
}

// --- Angle computation ---

function computePetalAngles(
	count: number,
	gapAngle: number,
): Array<{ startAngle: number; endAngle: number }> {
	if (count === 0) return [];

	const totalGap = gapAngle * count;
	const availableDegrees = 360 - totalGap;
	const petalArc = availableDegrees / count;

	const result: Array<{ startAngle: number; endAngle: number }> = [];
	let currentAngle = -90; // Start from 12 o'clock

	for (let i = 0; i < count; i++) {
		const start = currentAngle + gapAngle / 2;
		const end = start + petalArc;
		result.push({ startAngle: start, endAngle: end });
		currentAngle = end + gapAngle / 2;
	}

	return result;
}

/**
 * Compute outer ring angles centered around a specific inner petal's midpoint.
 * The outer ring fans out from the inner petal's angle, spanning an arc.
 */
function computeOuterPetalAngles(
	innerPetal: RadialPetal,
	count: number,
	gapAngle: number,
): Array<{ startAngle: number; endAngle: number }> {
	if (count === 0) return [];

	const midAngle = (innerPetal.startAngle + innerPetal.endAngle) / 2;
	const totalGap = gapAngle * count;

	// Outer ring arc: proportional to count, max 180°
	const maxArc = Math.min(180, count * 45);
	const availableArc = maxArc - totalGap;
	const petalArc = availableArc / count;

	const result: Array<{ startAngle: number; endAngle: number }> = [];
	let startOffset = midAngle - maxArc / 2;

	for (let i = 0; i < count; i++) {
		const start = startOffset + gapAngle / 2;
		const end = start + petalArc;
		result.push({ startAngle: start, endAngle: end });
		startOffset = end + gapAngle / 2;
	}

	return result;
}

// --- Hit testing ---

function hitTestRing(
	dx: number,
	dy: number,
	petals: RadialPetal[],
	innerR: number,
	outerR: number,
): number {
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist < innerR || dist > outerR * 1.2) return -1;

	const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

	for (let i = 0; i < petals.length; i++) {
		const petal = petals[i];
		let start = petal.startAngle;
		let end = petal.endAngle;
		let testAngle = angle;

		if (start < -180) {
			start += 360;
			end += 360;
			if (testAngle < 0) testAngle += 360;
		}

		if (testAngle >= start && testAngle <= end) return i;
		if (testAngle + 360 >= start && testAngle + 360 <= end) return i;
	}

	return -1;
}

/**
 * Hit test both rings. Returns which ring and index.
 * Exported for testing.
 */
export function hitTestRadial(
	dx: number,
	dy: number,
): { ring: "inner" | "outer" | "none"; index: number } {
	const { innerRadius, outerRadius } = radialConfig.appearance;
	const outerRingInner = outerRadius + 8; // Gap between rings
	const outerRingOuter = outerRingInner + (outerRadius - innerRadius);

	// Check outer ring first (it's on top)
	if (menuState.outerRingOpen && menuState.outerPetals.length > 0) {
		const outerIdx = hitTestRing(
			dx,
			dy,
			menuState.outerPetals,
			outerRingInner,
			outerRingOuter,
		);
		if (outerIdx >= 0) return { ring: "outer", index: outerIdx };
	}

	// Then inner ring
	const innerIdx = hitTestRing(
		dx,
		dy,
		menuState.innerPetals,
		innerRadius,
		outerRadius,
	);
	if (innerIdx >= 0) return { ring: "inner", index: innerIdx };

	return { ring: "none", index: -1 };
}

// --- Composing the menu from providers ---

function composeMenu(context: RadialOpenContext): {
	innerPetals: RadialPetal[];
	actionsByCategory: Map<string, RadialAction[]>;
} {
	// Collect actions from all providers
	const categoryActions = new Map<string, RadialAction[]>();
	const categories = new Map<string, RadialCategory>();

	for (const provider of providers) {
		const actions = provider.getActions(context);
		if (actions.length === 0) continue;

		const catId = provider.category.id;
		if (!categories.has(catId)) {
			categories.set(catId, provider.category);
			categoryActions.set(catId, []);
		}
		categoryActions.get(catId)!.push(...actions);
	}

	// Sort categories by priority
	const sortedCategories = Array.from(categories.values()).sort(
		(a, b) => a.priority - b.priority,
	);

	// Build inner ring petals
	const gapAngle = radialConfig.appearance.gapAngle;
	const angles = computePetalAngles(sortedCategories.length, gapAngle);

	const innerPetals: RadialPetal[] = sortedCategories.map((cat, i) => {
		const actions = categoryActions.get(cat.id) ?? [];
		const anyEnabled = actions.some((a) => a.enabled);
		return {
			id: cat.id,
			label: cat.label,
			icon: cat.icon,
			tone: cat.tone,
			enabled: anyEnabled,
			startAngle: angles[i].startAngle,
			endAngle: angles[i].endAngle,
			childCount: actions.length,
		};
	});

	return { innerPetals, actionsByCategory: categoryActions };
}

// --- Public API ---

export function getRadialMenuState(): RadialMenuState {
	return menuState;
}

export function getResolvedActionsForCategory(categoryId: string) {
	return [...(resolvedActions.get(categoryId) ?? [])];
}

/**
 * Open the radial menu with dynamically composed actions.
 */
export function openRadialMenu(
	screenX: number,
	screenY: number,
	context: RadialOpenContext,
) {
	const { innerPetals, actionsByCategory } = composeMenu(context);

	if (innerPetals.length === 0) return;

	resolvedActions = actionsByCategory;

	menuState = {
		open: true,
		centerX: screenX,
		centerY: screenY,
		innerPetals,
		outerPetals: [],
		innerHoveredIndex: -1,
		outerHoveredIndex: -1,
		outerRingOpen: false,
		expandedInnerIndex: -1,
		context,
	};
}

/**
 * Update hover state from pointer position.
 */
export function updateRadialHover(screenX: number, screenY: number) {
	if (!menuState.open) return;

	const dx = screenX - menuState.centerX;
	const dy = screenY - menuState.centerY;
	const hit = hitTestRadial(dx, dy);

	if (hit.ring === "outer") {
		menuState.outerHoveredIndex = hit.index;
		menuState.innerHoveredIndex = menuState.expandedInnerIndex;
	} else if (hit.ring === "inner") {
		menuState.innerHoveredIndex = hit.index;
		menuState.outerHoveredIndex = -1;

		// Expand outer ring when hovering a category with children
		if (hit.index !== menuState.expandedInnerIndex) {
			expandOuterRing(hit.index);
		}
	} else {
		menuState.innerHoveredIndex = -1;
		menuState.outerHoveredIndex = -1;

		// Collapse outer ring when not hovering anything
		if (menuState.outerRingOpen) {
			menuState.outerRingOpen = false;
			menuState.outerPetals = [];
			menuState.expandedInnerIndex = -1;
		}
	}
}

/**
 * Expand the outer ring for a given inner petal index.
 */
function expandOuterRing(innerIndex: number) {
	const innerPetal = menuState.innerPetals[innerIndex];
	if (!innerPetal) return;

	const actions = resolvedActions.get(innerPetal.id);
	if (!actions || actions.length === 0) return;

	// Single action = no outer ring needed (will execute directly)
	if (actions.length === 1) {
		menuState.outerRingOpen = false;
		menuState.outerPetals = [];
		menuState.expandedInnerIndex = innerIndex;
		return;
	}

	const gapAngle = radialConfig.appearance.gapAngle;
	const angles = computeOuterPetalAngles(innerPetal, actions.length, gapAngle);

	const outerPetals: RadialPetal[] = actions.map((action, i) => ({
		id: action.id,
		label: action.label,
		icon: action.icon,
		tone: action.tone,
		enabled: action.enabled,
		startAngle: angles[i].startAngle,
		endAngle: angles[i].endAngle,
		childCount: 0,
	}));

	menuState.outerRingOpen = true;
	menuState.outerPetals = outerPetals;
	menuState.expandedInnerIndex = innerIndex;
}

/**
 * Confirm selection and execute the action.
 */
export function confirmRadialSelection() {
	if (!menuState.open || !menuState.context) return;

	// Outer ring selection
	if (
		menuState.outerRingOpen &&
		menuState.outerHoveredIndex >= 0 &&
		menuState.expandedInnerIndex >= 0
	) {
		const innerPetal = menuState.innerPetals[menuState.expandedInnerIndex];
		const actions = resolvedActions.get(innerPetal.id);
		if (actions) {
			const action = actions[menuState.outerHoveredIndex];
			if (action?.enabled) {
				action.onExecute(menuState.context);
			}
		}
		closeRadialMenu();
		return;
	}

	// Inner ring selection (single-action categories execute immediately)
	if (menuState.innerHoveredIndex >= 0) {
		const innerPetal = menuState.innerPetals[menuState.innerHoveredIndex];
		const actions = resolvedActions.get(innerPetal.id);
		if (actions && actions.length === 1 && actions[0].enabled) {
			actions[0].onExecute(menuState.context);
		}
		// Multi-action categories don't execute on inner selection
		// (they expand the outer ring instead)
	}

	closeRadialMenu();
}

export function closeRadialMenu() {
	menuState = closedState();
	resolvedActions.clear();
}

export function resetRadialMenu() {
	closeRadialMenu();
}

/**
 * Get the radii for the dual rings (for renderer).
 */
export function getRadialGeometry() {
	const { innerRadius, outerRadius } = radialConfig.appearance;
	return {
		innerRingInner: innerRadius,
		innerRingOuter: outerRadius,
		outerRingInner: outerRadius + 8,
		outerRingOuter: outerRadius + 8 + (outerRadius - innerRadius),
	};
}
