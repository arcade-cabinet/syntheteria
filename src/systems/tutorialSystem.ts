/**
 * Tutorial system — step-by-step onboarding that teaches core mechanics.
 *
 * Tracks tutorial progress through a sequence of steps. Each step has
 * a trigger condition, instruction text, and completion condition.
 * Otter holograms guide the player through each step.
 *
 * Steps cover: movement, harvesting, compression, carrying, furnace,
 * crafting, building, and territory basics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TutorialStep {
	id: string;
	title: string;
	instruction: string;
	otterDialogue: string;
	completionType: "action" | "item" | "position" | "build" | "custom";
	completionKey: string; // what specific action/item/position completes this
	completionTarget: number; // how many times (1 for most)
	current: number;
	completed: boolean;
	skipped: boolean;
}

export interface TutorialState {
	active: boolean;
	currentStepIndex: number;
	steps: TutorialStep[];
	completedAt: number | null; // tick when tutorial finished
	startedAt: number;
}

// ---------------------------------------------------------------------------
// Tutorial step definitions
// ---------------------------------------------------------------------------

const TUTORIAL_STEPS: Omit<TutorialStep, "current" | "completed" | "skipped">[] = [
	{
		id: "move",
		title: "Find Your Bearings",
		instruction: "Use WASD or the virtual joystick to move around.",
		otterDialogue:
			"Hey there, rusty! You just booted up. Try moving around — WASD keys or the joystick.",
		completionType: "action",
		completionKey: "move",
		completionTarget: 10,
	},
	{
		id: "look",
		title: "Survey the Wasteland",
		instruction: "Look around by moving your mouse or swiping.",
		otterDialogue:
			"Good legs! Now swivel that camera. See all that scrap? That's your future empire.",
		completionType: "action",
		completionKey: "look",
		completionTarget: 5,
	},
	{
		id: "harvest",
		title: "Grind Some Ore",
		instruction:
			"Walk up to an ore deposit and hold click to grind it into powder.",
		otterDialogue:
			"See those shiny veins sticking out of the ground? Walk up close, hold click, and GRIND. Watch the powder bar fill up!",
		completionType: "action",
		completionKey: "harvest",
		completionTarget: 1,
	},
	{
		id: "compress",
		title: "Compress a Cube",
		instruction:
			"When your powder is full, press C to compress it into a physical cube.",
		otterDialogue:
			"Powder's full! Now the fun part — press C to COMPRESS. Feel that screen shake? That's a cube being born!",
		completionType: "action",
		completionKey: "compress",
		completionTarget: 1,
	},
	{
		id: "grab",
		title: "Pick Up the Cube",
		instruction: "Click on the cube to grab it with your magnetic beam.",
		otterDialogue:
			"There it is — your first cube! Click it to grab. These things are worth their weight in... well, metal.",
		completionType: "action",
		completionKey: "grab_cube",
		completionTarget: 1,
	},
	{
		id: "furnace",
		title: "Feed the Furnace",
		instruction:
			"Carry the cube to your furnace and drop it in the hopper.",
		otterDialogue:
			"See that furnace over there? It's your best friend. Carry the cube over and drop it in the hopper!",
		completionType: "action",
		completionKey: "furnace_feed",
		completionTarget: 1,
	},
	{
		id: "craft",
		title: "Craft Your First Tool",
		instruction: "Open the furnace menu and select a recipe to craft.",
		otterDialogue:
			"Tap the furnace, pick a recipe from the radial menu. I recommend a better drill — you'll need it!",
		completionType: "action",
		completionKey: "craft",
		completionTarget: 1,
	},
	{
		id: "build",
		title: "Place a Structure",
		instruction: "Open the build menu and place a lightning rod or wall.",
		otterDialogue:
			"Time to build! Open the build menu and place something. Lightning rods give you power. Walls keep raiders out.",
		completionType: "build",
		completionKey: "any_building",
		completionTarget: 1,
	},
	{
		id: "territory",
		title: "Claim Territory",
		instruction: "Build an outpost to claim territory around your base.",
		otterDialogue:
			"To expand, you need outposts. Build one and watch your territory grow. The other factions are watching...",
		completionType: "build",
		completionKey: "outpost",
		completionTarget: 1,
	},
	{
		id: "complete",
		title: "Tutorial Complete",
		instruction:
			"You've learned the basics! Explore, expand, exploit, and exterminate.",
		otterDialogue:
			"That's the basics! Now get out there and build an empire. I'll be around if you need more quests. *holographic wink*",
		completionType: "custom",
		completionKey: "auto",
		completionTarget: 1,
	},
];

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let tutorialState: TutorialState = createFreshState();

/** useSyncExternalStore-compatible listeners. */
const tutorialListeners = new Set<() => void>();

function notifyTutorial(): void {
	for (const fn of tutorialListeners) fn();
}

/** Subscribe to tutorial state changes (useSyncExternalStore API). */
export function subscribeTutorial(callback: () => void): () => void {
	tutorialListeners.add(callback);
	return () => tutorialListeners.delete(callback);
}

/** Snapshot for useSyncExternalStore — returns a stable reference per change. */
export function getTutorialSnapshot(): TutorialState {
	return tutorialState;
}

function createFreshState(): TutorialState {
	return {
		active: false,
		currentStepIndex: 0,
		steps: TUTORIAL_STEPS.map((s) => ({
			...s,
			current: 0,
			completed: false,
			skipped: false,
		})),
		completedAt: null,
		startedAt: 0,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start the tutorial.
 */
export function startTutorial(startTick = 0): void {
	tutorialState = createFreshState();
	tutorialState.active = true;
	tutorialState.startedAt = startTick;
	notifyTutorial();
}

/**
 * Get the current tutorial state.
 */
export function getTutorialState(): TutorialState {
	return { ...tutorialState, steps: tutorialState.steps.map((s) => ({ ...s })) };
}

/**
 * Get the current step (or null if tutorial is not active or completed).
 */
export function getCurrentStep(): TutorialStep | null {
	if (!tutorialState.active) return null;
	if (tutorialState.currentStepIndex >= tutorialState.steps.length)
		return null;
	return { ...tutorialState.steps[tutorialState.currentStepIndex] };
}

/**
 * Report a player action to advance tutorial progress.
 */
export function reportTutorialAction(
	actionKey: string,
	amount = 1,
): boolean {
	if (!tutorialState.active) return false;

	const step = tutorialState.steps[tutorialState.currentStepIndex];
	if (!step || step.completed) return false;

	if (step.completionKey !== actionKey && step.completionKey !== "auto") {
		return false;
	}

	step.current = Math.min(step.completionTarget, step.current + amount);

	if (step.current >= step.completionTarget) {
		step.completed = true;
		advanceStep();
		return true;
	}

	return true;
}

/**
 * Skip the current tutorial step.
 */
export function skipCurrentStep(): boolean {
	if (!tutorialState.active) return false;

	const step = tutorialState.steps[tutorialState.currentStepIndex];
	if (!step) return false;

	step.skipped = true;
	step.completed = true;
	advanceStep();
	return true;
}

/**
 * Skip the entire tutorial.
 */
export function skipTutorial(currentTick = 0): void {
	tutorialState.active = false;
	tutorialState.completedAt = currentTick;
	for (const step of tutorialState.steps) {
		if (!step.completed) {
			step.skipped = true;
		}
	}
	notifyTutorial();
}

/**
 * Check if the tutorial is complete.
 */
export function isTutorialComplete(): boolean {
	return tutorialState.completedAt !== null;
}

/**
 * Check if the tutorial is currently active.
 */
export function isTutorialActive(): boolean {
	return tutorialState.active;
}

/**
 * Get completion percentage (0-100).
 */
export function getTutorialProgress(): number {
	const completed = tutorialState.steps.filter((s) => s.completed).length;
	const total = tutorialState.steps.length;
	return total > 0 ? Math.round((completed / total) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function advanceStep(): void {
	tutorialState.currentStepIndex++;

	// Check if the next step auto-completes
	if (tutorialState.currentStepIndex < tutorialState.steps.length) {
		const nextStep = tutorialState.steps[tutorialState.currentStepIndex];
		if (nextStep.completionKey === "auto") {
			nextStep.completed = true;
			nextStep.current = nextStep.completionTarget;
			tutorialState.active = false;
			tutorialState.completedAt = Date.now();
		}
	}

	// Past last step
	if (tutorialState.currentStepIndex >= tutorialState.steps.length) {
		tutorialState.active = false;
		tutorialState.completedAt = Date.now();
	}

	notifyTutorial();
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export function resetTutorial(): void {
	tutorialState = createFreshState();
	notifyTutorial();
}
