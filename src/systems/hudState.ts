/**
 * HUD state manager — centralized state for all HUD elements.
 *
 * Pure data layer that tracks what the HUD should display. React
 * components subscribe to this state and render accordingly.
 * Separates game logic from UI rendering.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PowderGauge {
	current: number;
	max: number;
	resourceType: string;
}

export interface CompressionOverlay {
	active: boolean;
	progress: number; // 0-1
	pressure: number; // 0-1
	temperature: number; // 0-1
}

export interface CrosshairState {
	visible: boolean;
	style: "default" | "harvest" | "interact" | "combat" | "build";
	targetName?: string;
	targetDistance?: number;
}

export interface RadialMenuItem {
	id: string;
	label: string;
	icon: string;
	enabled: boolean;
	hotkey?: string;
}

export interface RadialMenuState {
	open: boolean;
	items: RadialMenuItem[];
	selectedIndex: number;
	targetId?: string;
	targetType?: string;
}

export interface StatusBar {
	label: string;
	current: number;
	max: number;
	color: string;
}

export interface HUDState {
	// Resource display
	powderGauge: PowderGauge;
	cubesCarried: number;
	maxCubesCarried: number;

	// Compression
	compression: CompressionOverlay;

	// Crosshair
	crosshair: CrosshairState;

	// Radial menu
	radialMenu: RadialMenuState;

	// Status bars
	componentHealth: StatusBar;
	powerLevel: StatusBar;
	signalStrength: StatusBar;

	// Info
	factionName: string;
	botName: string;
	currentBiome: string;
	coords: { x: number; z: number };
	gameSpeed: number;
	tickCount: number;

	// Overlays
	showMinimap: boolean;
	showInventory: boolean;
	showBuildMenu: boolean;
	showTechTree: boolean;
	showDiplomacy: boolean;

	// Alerts
	damageFlashIntensity: number; // 0-1, red flash on taking damage
	lowHealthWarning: boolean;
	lowPowerWarning: boolean;
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

function createDefaultState(): HUDState {
	return {
		powderGauge: { current: 0, max: 100, resourceType: "" },
		cubesCarried: 0,
		maxCubesCarried: 4,
		compression: { active: false, progress: 0, pressure: 0, temperature: 0 },
		crosshair: { visible: true, style: "default" },
		radialMenu: { open: false, items: [], selectedIndex: -1 },
		componentHealth: { label: "Health", current: 100, max: 100, color: "#00ff88" },
		powerLevel: { label: "Power", current: 0, max: 100, color: "#ffcc00" },
		signalStrength: { label: "Signal", current: 0, max: 100, color: "#00ccff" },
		factionName: "player",
		botName: "Bot-01",
		currentBiome: "rust_plains",
		coords: { x: 0, z: 0 },
		gameSpeed: 1,
		tickCount: 0,
		showMinimap: true,
		showInventory: false,
		showBuildMenu: false,
		showTechTree: false,
		showDiplomacy: false,
		damageFlashIntensity: 0,
		lowHealthWarning: false,
		lowPowerWarning: false,
	};
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let state: HUDState = createDefaultState();
const listeners = new Set<() => void>();

function notify(): void {
	for (const fn of listeners) fn();
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/**
 * Get the full HUD state.
 */
export function getHUDState(): HUDState {
	return { ...state };
}

/**
 * Subscribe to HUD state changes.
 */
export function subscribeHUD(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Public API — Updates
// ---------------------------------------------------------------------------

export function updatePowderGauge(gauge: Partial<PowderGauge>): void {
	state.powderGauge = { ...state.powderGauge, ...gauge };
	notify();
}

export function updateCompression(overlay: Partial<CompressionOverlay>): void {
	state.compression = { ...state.compression, ...overlay };
	notify();
}

export function updateCrosshair(crosshair: Partial<CrosshairState>): void {
	state.crosshair = { ...state.crosshair, ...crosshair };
	notify();
}

export function openRadialMenu(
	items: RadialMenuItem[],
	targetId?: string,
	targetType?: string,
): void {
	state.radialMenu = {
		open: true,
		items,
		selectedIndex: -1,
		targetId,
		targetType,
	};
	notify();
}

export function closeRadialMenu(): void {
	state.radialMenu = { open: false, items: [], selectedIndex: -1 };
	notify();
}

export function selectRadialItem(index: number): void {
	if (index >= 0 && index < state.radialMenu.items.length) {
		state.radialMenu.selectedIndex = index;
		notify();
	}
}

export function updateStatusBar(
	bar: "componentHealth" | "powerLevel" | "signalStrength",
	values: Partial<StatusBar>,
): void {
	state[bar] = { ...state[bar], ...values };

	// Auto-set warnings
	if (bar === "componentHealth") {
		state.lowHealthWarning = state.componentHealth.current / state.componentHealth.max < 0.25;
	}
	if (bar === "powerLevel") {
		state.lowPowerWarning = state.powerLevel.current / state.powerLevel.max < 0.15;
	}

	notify();
}

export function updateCoords(x: number, z: number): void {
	state.coords = { x: Math.round(x), z: Math.round(z) };
}

export function updateBotInfo(name: string, faction: string): void {
	state.botName = name;
	state.factionName = faction;
	notify();
}

export function updateGameInfo(
	speed: number,
	tick: number,
	biome: string,
): void {
	state.gameSpeed = speed;
	state.tickCount = tick;
	state.currentBiome = biome;
}

export function setCubesCarried(count: number, max: number): void {
	state.cubesCarried = count;
	state.maxCubesCarried = max;
	notify();
}

export function triggerDamageFlash(intensity: number): void {
	state.damageFlashIntensity = Math.min(1, intensity);
	notify();
}

export function toggleOverlay(
	overlay: "showMinimap" | "showInventory" | "showBuildMenu" | "showTechTree" | "showDiplomacy",
): void {
	state[overlay] = !state[overlay];
	notify();
}

export function setOverlay(
	overlay: "showMinimap" | "showInventory" | "showBuildMenu" | "showTechTree" | "showDiplomacy",
	visible: boolean,
): void {
	state[overlay] = visible;
	notify();
}

// ---------------------------------------------------------------------------
// HUD tick — decay effects
// ---------------------------------------------------------------------------

/**
 * Called each frame to decay transient effects.
 */
export function hudTick(delta: number): void {
	let changed = false;

	// Decay damage flash
	if (state.damageFlashIntensity > 0) {
		state.damageFlashIntensity = Math.max(
			0,
			state.damageFlashIntensity - delta * 2,
		);
		changed = true;
	}

	if (changed) notify();
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetHUDState(): void {
	state = createDefaultState();
	listeners.clear();
}
