/**
 * LandingScreen tests.
 *
 * @react-three/fiber Canvas cannot run in JSDOM (no WebGL/ResizeObserver),
 * so it's stubbed to a plain div. TitleMenuScene + StormSky are mocked too.
 * Assertions target the TitleMenuOverlay testIDs.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GameSummary } from "../../db/types";
import { LandingScreen } from "../landing/LandingScreen";

// ── Canvas stub — no WebGL in JSDOM ──────────────────────────────────────────
vi.mock("@react-three/fiber", () => ({
	Canvas: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="r3f-canvas-stub">{children}</div>
	),
	useFrame: vi.fn(),
	useThree: () => ({ scene: {}, camera: {} }),
}));

vi.mock("../landing/title/TitleMenuScene", () => ({
	TitleMenuScene: () => null,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeSave = (id: string): GameSummary => ({
	id,
	seed: "AABB1122",
	boardW: 32,
	boardH: 32,
	difficulty: "normal",
	turn: 5,
	createdAt: "2026-03-17T00:00:00.000Z",
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LandingScreen", () => {
	it('renders the brand logo (aria-label "Syntheteria")', () => {
		render(<LandingScreen onStartGame={vi.fn()} />);
		expect(screen.getByLabelText("Syntheteria")).toBeInTheDocument();
	});

	it("New Game button is visible", () => {
		render(<LandingScreen onStartGame={vi.fn()} />);
		expect(screen.getByTestId("title-new_game")).toBeInTheDocument();
	});

	it("Continue button is NOT visible when savedGames is empty (default)", () => {
		render(<LandingScreen onStartGame={vi.fn()} />);
		expect(screen.queryByTestId("title-load_game")).toBeNull();
	});

	it("Continue button IS visible when savedGames has entries", () => {
		render(
			<LandingScreen
				onStartGame={vi.fn()}
				onLoadGame={vi.fn()}
				savedGames={[makeSave("save-1")]}
			/>,
		);
		expect(screen.getByTestId("title-load_game")).toBeInTheDocument();
	});

	it("clicking New Game button opens the NewGameModal", () => {
		render(<LandingScreen onStartGame={vi.fn()} />);
		expect(screen.queryByTestId("new-game-modal")).toBeNull();
		fireEvent.click(screen.getByTestId("title-new_game"));
		expect(screen.getByTestId("new-game-modal")).toBeInTheDocument();
	});

	it("NewGameModal is not visible initially", () => {
		render(<LandingScreen onStartGame={vi.fn()} />);
		expect(screen.queryByTestId("new-game-modal")).toBeNull();
	});

	it("clicking Continue (with saves) opens the save list modal", () => {
		render(
			<LandingScreen
				onStartGame={vi.fn()}
				onLoadGame={vi.fn()}
				savedGames={[makeSave("save-1")]}
			/>,
		);
		fireEvent.click(screen.getByTestId("title-load_game"));
		expect(screen.getByTestId("save-list-modal")).toBeInTheDocument();
	});

	it("save rows are rendered with correct testids in the save list modal", () => {
		const saves = [makeSave("save-abc"), makeSave("save-xyz")];
		render(
			<LandingScreen
				onStartGame={vi.fn()}
				onLoadGame={vi.fn()}
				savedGames={saves}
			/>,
		);
		fireEvent.click(screen.getByTestId("title-load_game"));
		expect(screen.getByTestId("save-row-save-abc")).toBeInTheDocument();
		expect(screen.getByTestId("save-row-save-xyz")).toBeInTheDocument();
	});

	it("clicking Back in save list modal closes it", () => {
		render(
			<LandingScreen
				onStartGame={vi.fn()}
				onLoadGame={vi.fn()}
				savedGames={[makeSave("save-1")]}
			/>,
		);
		fireEvent.click(screen.getByTestId("title-load_game"));
		expect(screen.getByTestId("save-list-modal")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Back"));
		expect(screen.queryByTestId("save-list-modal")).toBeNull();
	});

	it("when NewGameModal calls onStart, LandingScreen calls onStartGame with NewGameConfig", () => {
		const onStartGame = vi.fn();
		render(<LandingScreen onStartGame={onStartGame} />);
		fireEvent.click(screen.getByTestId("title-new_game"));
		fireEvent.click(screen.getByTestId("start-btn"));
		expect(onStartGame).toHaveBeenCalledTimes(1);
		const config = onStartGame.mock.calls[0][0];
		expect(config).toHaveProperty("worldSeed");
		expect(config).toHaveProperty("sectorScale");
		expect(config).toHaveProperty("difficulty");
		expect(config).toHaveProperty("climateProfile");
		expect(config).toHaveProperty("stormProfile");
		expect(config).toHaveProperty("factions");
	});
});
