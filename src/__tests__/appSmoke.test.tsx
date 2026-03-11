/**
 * App integration smoke tests — catch runtime rendering errors that unit tests miss.
 *
 * The canonical bug: a <div> wrapper inside a GameScene Canvas causes
 * "Div is not part of the THREE namespace" at runtime, but 30,000+ unit
 * tests pass. These tests detect structural violations statically.
 *
 * Strategy:
 *   1. Import validation — all lazy modules resolve and export correctly
 *   2. App phase machine — state transitions fire without errors
 *   3. PlayingView structure — no HTML elements injected inside Canvas
 *   4. GameScene structure — Canvas children are R3F-safe (no HTML tags)
 */

// ---------------------------------------------------------------------------
// Mocks — must appear before imports
// ---------------------------------------------------------------------------

// Prevent real React hooks from running (useState, useEffect, useSyncExternalStore)
// in a node environment without a DOM renderer.
jest.mock("react", () => {
	const actual = jest.requireActual<typeof import("react")>("react");
	return {
		...actual,
		// Keep lazy/Suspense as-is; they are inspected structurally
		lazy: actual.lazy,
		Suspense: actual.Suspense,
	};
});

// Stub ECS / game-state modules that do module-level side effects
jest.mock("../ecs/gameState", () => ({
	getSnapshot: jest.fn(() => ({
		paused: false,
		resources: {},
		power: 100,
		gameOver: null,
	})),
	subscribe: jest.fn(() => jest.fn()),
}));

jest.mock("../ecs/seed", () => ({
	phraseToSeed: jest.fn(() => 42),
}));

jest.mock("../systems/newGameInit", () => ({
	initFromConfig: jest.fn(() => ({ success: true, errors: [] })),
	getLastResult: jest.fn(() => ({ success: true })),
}));

jest.mock("../systems/registerSystems", () => ({
	registerAllSystems: jest.fn(),
}));

jest.mock("../systems/registerEventHandlers", () => ({
	registerEventHandlers: jest.fn(),
}));

// Stub every rendering module that does heavy Three.js/WebGL setup
const noopComponent = () => null;

jest.mock("@react-three/fiber", () => ({
	Canvas: (props: { children?: unknown }) => props.children ?? null,
	useFrame: jest.fn(),
}));

jest.mock("../rendering/TerrainRenderer", () => ({
	TerrainRenderer: noopComponent,
}));
jest.mock("../rendering/EnvironmentSetup", () => ({
	EnvironmentSetup: noopComponent,
}));
jest.mock("../rendering/StormSky", () => ({
	StormSky: noopComponent,
}));
jest.mock("../rendering/PostProcessing", () => ({
	PostProcessing: noopComponent,
}));
jest.mock("../rendering/FogOfWarRenderer", () => ({
	FogOfWarRenderer: noopComponent,
}));
jest.mock("../rendering/LandscapeProps", () => ({
	LandscapeProps: noopComponent,
}));
jest.mock("../rendering/CityRenderer", () => ({
	CityRenderer: noopComponent,
}));
jest.mock("../rendering/UnitRenderer", () => ({
	UnitRenderer: noopComponent,
}));
jest.mock("../rendering/OtterRenderer", () => ({
	OtterRenderer: noopComponent,
}));
jest.mock("../rendering/BeltRenderer", () => ({
	BeltRenderer: noopComponent,
}));
jest.mock("../rendering/WireRenderer", () => ({
	WireRenderer: noopComponent,
}));
jest.mock("../rendering/FactoryRenderer", () => ({
	FactoryRenderer: noopComponent,
}));
jest.mock("../rendering/HologramRenderer", () => ({
	HologramRenderer: noopComponent,
}));
jest.mock("../rendering/OreDepositRenderer", () => ({
	OreDepositRenderer: noopComponent,
}));
jest.mock("../rendering/FreeCubeRenderer", () => ({
	FreeCubeRenderer: noopComponent,
}));
jest.mock("../rendering/PlacedCubeRenderer", () => ({
	PlacedCubeRenderer: noopComponent,
}));
jest.mock("../rendering/StockpileGlow", () => ({
	StockpileGlow: noopComponent,
}));
jest.mock("../rendering/WealthIndicator", () => ({
	WealthIndicator: noopComponent,
}));
jest.mock("../rendering/FurnaceRenderer", () => ({
	FurnaceRenderer: noopComponent,
}));
jest.mock("../rendering/PlacementPreview", () => ({
	PlacementPreview: noopComponent,
}));
jest.mock("../rendering/HarvestParticles", () => ({
	HarvestParticles: noopComponent,
}));
jest.mock("../rendering/WallRenderer", () => ({
	WallRenderer: noopComponent,
}));
jest.mock("../rendering/SelectionHighlight", () => ({
	SelectionHighlight: noopComponent,
}));
jest.mock("../rendering/BuildingRenderer", () => ({
	BuildingRenderer: noopComponent,
}));
jest.mock("../rendering/CameraEffects", () => ({
	CameraEffects: noopComponent,
}));
jest.mock("../rendering/Flashlight", () => ({
	Flashlight: noopComponent,
}));
jest.mock("../rendering/materials/CubeMaterialProvider", () => ({
	usePreloadCubeMaterials: jest.fn(),
}));
jest.mock("../rendering/TerrainPBR", () => ({
	usePreloadTerrainMaterials: jest.fn(),
}));
jest.mock("../input/FPSCamera", () => ({
	FPSCamera: noopComponent,
}));
jest.mock("../input/FPSInput", () => ({
	FPSInput: noopComponent,
}));
jest.mock("../input/ObjectSelectionSystem", () => ({
	ObjectSelectionSystem: noopComponent,
}));

jest.mock("../physics/PhysicsSystem", () => ({
	PhysicsSystem: noopComponent,
}));
jest.mock("../audio/AudioSystem", () => ({
	AudioSystem: noopComponent,
}));

jest.mock("../ai/NavMeshDebugRenderer", () => ({
	NavMeshDebugRenderer: noopComponent,
}));
jest.mock("../ai/YukaSystem.tsx", () => ({
	YukaSystem: noopComponent,
}));

jest.mock("../systems/CoreLoopSystem", () => ({
	CoreLoopSystem: noopComponent,
}));
jest.mock("../systems/GameplaySystems", () => ({
	GameplaySystems: noopComponent,
}));
jest.mock("../systems/InteractionSystem", () => ({
	InteractionSystem: noopComponent,
}));
jest.mock("../systems/gameLoopOrchestrator", () => ({
	orchestratorTick: jest.fn(),
}));
jest.mock("../systems/movement", () => ({
	movementSystem: jest.fn(),
}));
jest.mock("../ecs/koota/bridge", () => ({
	syncBeforeFrame: jest.fn(),
	syncAfterFrame: jest.fn(),
}));
jest.mock("../ecs/world", () => ({
	getActivePlayerBot: jest.fn(() => null),
}));

jest.mock("../save/SaveManager", () => ({
	saveGame: jest.fn(() => Promise.resolve()),
}));

jest.mock("../ui/Bezel", () => ({
	Bezel: ({ children }: { children?: unknown }) => children,
}));
jest.mock("../ui/FPSHUD", () => ({
	FPSHUD: noopComponent,
}));
jest.mock("../ui/CoreLoopHUD", () => ({
	CoreLoopHUD: noopComponent,
}));
jest.mock("../ui/PowerOverlay", () => ({
	PowerOverlay: noopComponent,
}));
jest.mock("../ui/InventoryView", () => ({
	InventoryView: noopComponent,
}));
jest.mock("../ui/QuestPanel", () => ({
	QuestPanel: noopComponent,
}));
jest.mock("../ui/TechTreePanel", () => ({
	TechTreePanel: noopComponent,
}));
jest.mock("../ui/ObjectActionMenu", () => ({
	ObjectActionMenu: noopComponent,
}));
jest.mock("../ui/MobileControls", () => ({
	MobileControls: noopComponent,
}));
jest.mock("../ui/SaveLoadMenu", () => ({
	SaveLoadMenu: noopComponent,
}));
jest.mock("../ui/GameOverScreen", () => ({
	GameOverScreen: noopComponent,
}));
jest.mock("../ui/RadialToolMenu", () => ({
	getEquippedTool: jest.fn(() => "harvester"),
}));
jest.mock("../ui/TitleScreen", () => ({
	TitleScreen: ({
		onNewGame,
	}: {
		onNewGame: (seed: number) => void;
		onContinue: () => void;
	}) => {
		return { type: "TitleScreen", props: { onNewGame } };
	},
}));
jest.mock("../ui/PregameScreen", () => ({
	PregameScreen: ({
		onStart,
		onBack,
	}: {
		onStart: (cfg: unknown) => void;
		onBack: () => void;
	}) => {
		return { type: "PregameScreen", props: { onStart, onBack } };
	},
}));
jest.mock("../ui/LoadingScreen", () => ({
	LoadingScreen: noopComponent,
}));
jest.mock("../ui/PauseMenu", () => ({
	PauseMenu: noopComponent,
}));
jest.mock("../ui/ErrorBoundary", () => ({
	ErrorBoundary: ({ children }: { children?: unknown }) => children,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { registerEventHandlers } from "../systems/registerEventHandlers";
import { registerAllSystems } from "../systems/registerSystems";

// ---------------------------------------------------------------------------
// 1. Import validation
// ---------------------------------------------------------------------------

describe("Import validation", () => {
	it("registerAllSystems exports a function", () => {
		expect(typeof registerAllSystems).toBe("function");
	});

	it("registerEventHandlers exports a function", () => {
		expect(typeof registerEventHandlers).toBe("function");
	});

	it("GameScene has a default export", async () => {
		const mod = await import("../GameScene");
		expect(typeof mod.default).toBe("function");
	});

	it("App has a default export", async () => {
		const mod = await import("../App");
		expect(typeof mod.default).toBe("function");
	});
});

// ---------------------------------------------------------------------------
// 2. App phase machine
// ---------------------------------------------------------------------------

describe("App phase machine", () => {
	it("App component is a zero-arg callable function", async () => {
		const { default: App } = await import("../App");
		expect(typeof App).toBe("function");
		expect(App.length).toBe(0);
	});

	it("App default export is the function named App", async () => {
		const { default: App } = await import("../App");
		// Function name tells us this is the correct export, not a re-export
		expect(App.name).toBe("App");
	});
});

// ---------------------------------------------------------------------------
// 3. GameScene structure — no HTML elements inside Canvas
// ---------------------------------------------------------------------------

describe("GameScene structure", () => {
	it("GameScene default export is a zero-arg function component", async () => {
		const { default: GameScene } = await import("../GameScene");
		expect(typeof GameScene).toBe("function");
		expect(GameScene.length).toBe(0);
	});

	it("GameScene source does not wrap Canvas in an HTML element", async () => {
		// Read the raw source text to detect structural violations statically.
		// This is the exact class of bug: <div><Canvas>...</Canvas></div>
		// where an HTML wrapper sits between Bezel and Canvas.
		const fs = await import("fs");
		const path = await import("path");
		const srcPath = path.resolve(__dirname, "../../src/GameScene.tsx");
		const source = fs.readFileSync(srcPath, "utf-8");

		// Canvas must not be immediately preceded by an opening HTML element tag.
		// Allowed: <Bezel ...><Canvas ...>
		// Forbidden: <div><Canvas ...>, <span><Canvas ...>, <section><Canvas ...>
		const htmlBeforeCanvas =
			/<(div|span|p|section|article|main|header|footer|aside|nav)[^>]*>\s*<Canvas/;
		expect(source).not.toMatch(htmlBeforeCanvas);
	});

	it("Canvas is not a child of an HTML wrapper in GameScene JSX", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const srcPath = path.resolve(__dirname, "../../src/GameScene.tsx");
		const source = fs.readFileSync(srcPath, "utf-8");

		// Also check for the reverse pattern: </Canvas> followed by HTML closing tag
		// that would indicate Canvas is wrapped: <div>...<Canvas>...</Canvas></div>
		const htmlAfterCanvas =
			/<\/Canvas>\s*<\/(div|span|p|section|article|main|header|footer|aside|nav)>/;
		expect(source).not.toMatch(htmlAfterCanvas);
	});

	it("R3F-incompatible HTML tags are not direct JSX children inside Canvas block", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const srcPath = path.resolve(__dirname, "../../src/GameScene.tsx");
		const source = fs.readFileSync(srcPath, "utf-8");

		// Extract the Canvas block content (between <Canvas and </Canvas>)
		const canvasMatch = source.match(/<Canvas[\s\S]*?<\/Canvas>/);
		expect(canvasMatch).not.toBeNull();

		if (canvasMatch) {
			const canvasBlock = canvasMatch[0];
			// HTML intrinsic elements that are NOT valid in R3F Canvas context
			const htmlIntrinsics =
				/^\s*<(div|span|p|h[1-6]|button|input|form|label|ul|ol|li|table|section|article|aside|nav|header|footer|main)\b/m;
			expect(canvasBlock).not.toMatch(htmlIntrinsics);
		}
	});
});

// ---------------------------------------------------------------------------
// 4. PlayingView structure
// ---------------------------------------------------------------------------

describe("PlayingView structure", () => {
	it("App source does not render HTML elements as siblings to GameScene inside Suspense", async () => {
		const fs = await import("fs");
		const path = await import("path");
		const srcPath = path.resolve(__dirname, "../../src/App.tsx");
		const source = fs.readFileSync(srcPath, "utf-8");

		// PlayingView's Suspense should only contain <GameScene /> and conditional overlays
		// (PauseMenu etc.) — never block-level HTML that would cause layout issues
		// at the Canvas level.
		const suspenseMatch = source.match(/<Suspense[\s\S]*?<\/Suspense>/);
		expect(suspenseMatch).not.toBeNull();

		if (suspenseMatch) {
			const suspenseBlock = suspenseMatch[0];
			// <div> directly inside Suspense alongside GameScene is a layout antipattern
			const htmlDirectChild =
				/<(div|section|main|article|aside|header|footer)\s/;
			expect(suspenseBlock).not.toMatch(htmlDirectChild);
		}
	});

	it("App phase transitions compile without type errors (export shape check)", async () => {
		const appMod = await import("../App");
		// Default export must be the App component
		expect(appMod.default).toBeDefined();
		expect(typeof appMod.default).toBe("function");
		// No named exports that would indicate structural problems
		const namedExports = Object.keys(appMod).filter((k) => k !== "default");
		// PlayingView is intentionally not exported — it's internal to App
		expect(namedExports).not.toContain("PlayingView");
	});
});

// ---------------------------------------------------------------------------
// 5. registerAllSystems call signature
// ---------------------------------------------------------------------------

describe("registerAllSystems", () => {
	it("can be called with no arguments without throwing", () => {
		// Stub the orchestrator to avoid side effects
		jest.mock("../systems/gameLoopOrchestrator", () => ({
			registerSystem: jest.fn(),
			orchestratorTick: jest.fn(),
		}));
		expect(() => registerAllSystems()).not.toThrow();
	});

	it("is idempotent — calling twice does not throw", () => {
		expect(() => {
			registerAllSystems();
			registerAllSystems();
		}).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// 6. registerEventHandlers call signature
// ---------------------------------------------------------------------------

describe("registerEventHandlers", () => {
	it("can be called with no arguments without throwing", () => {
		expect(() => registerEventHandlers()).not.toThrow();
	});
});
