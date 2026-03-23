import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./AppVite";

// Stub all heavy deps so we only test the shell
vi.mock("./db/saveGames", () => ({
	createSaveGameSync: vi.fn(() => null),
	getLatestSaveGameSync: vi.fn(() => null),
	touchSaveGameSync: vi.fn(),
}));
vi.mock("./db/worldPersistence", () => ({
	getPersistedWorldSync: vi.fn(() => {
		throw new Error("no world");
	}),
	persistGeneratedWorldSync: vi.fn(),
}));
vi.mock("./world/session", () => ({
	setActiveWorldSession: vi.fn(),
	clearActiveWorldSession: vi.fn(),
}));
vi.mock("./ecs/gameState", () => ({ setWorldReady: vi.fn() }));
vi.mock("./ecs/seed", () => ({
	setWorldSeed: vi.fn(),
	initGameplayPRNG: vi.fn(),
}));
vi.mock("./ecs/initialization", () => ({ initializeNewGame: vi.fn() }));
vi.mock("./world/snapshots", () => ({
	toWorldSessionSnapshot: vi.fn(() => ({})),
}));
vi.mock("./world/generation", () => ({ generateWorldData: vi.fn(() => ({})) }));
vi.mock("./GameSceneR3F", () => ({
	GameSceneR3F: () => <div data-testid="game-scene" />,
}));
vi.mock("./systems/radialProviders", () => ({}));
vi.mock("./systems/turnPhaseHandlers", () => ({}));
vi.mock("./systems/autosave", () => ({}));
vi.mock("./db/saveAllState", () => ({ saveAllStateSync: vi.fn() }));

describe("AppVite", () => {
	it("renders title screen with SYNTHETERIA", () => {
		render(<App />);
		expect(screen.getByText("SYNTHETERIA")).toBeInTheDocument();
	});

	it("renders New Game and Continue buttons", () => {
		render(<App />);
		expect(
			screen.getByRole("button", { name: /new game/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /continue/i }),
		).toBeInTheDocument();
	});
});
