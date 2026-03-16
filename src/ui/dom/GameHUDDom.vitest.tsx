import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameHUDDom } from "./GameHUDDom";

const mockSnapshot = {
	resources: { scrapMetal: 100, intactComponents: 5 },
	weather: { phase: "day", dayNumber: 1 },
	power: { stormIntensity: 0.3 },
};
vi.mock("../../ecs/gameState", () => ({
	getSnapshot: () => mockSnapshot,
	subscribe: (_listener: () => void) => () => {},
}));

vi.mock("../hooks/useTurnState", () => ({
	useTurnState: () => ({
		turnNumber: 42,
		phase: "player",
		activeFaction: "player",
	}),
}));

vi.mock("../hooks/useResourcePool", () => ({
	useResourcePool: () => ({ scrapMetal: 100, eWaste: 0, intactComponents: 5 }),
}));

describe("GameHUDDom", () => {
	it("renders turn number and scrap", () => {
		const onQuit = vi.fn();
		render(<GameHUDDom onQuit={onQuit} />);
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("100")).toBeInTheDocument();
		expect(screen.getByText("30%")).toBeInTheDocument();
	});

	it("renders Quit to title button", () => {
		const onQuit = vi.fn();
		render(<GameHUDDom onQuit={onQuit} />);
		const btn = screen.getByRole("button", { name: /quit to title/i });
		expect(btn).toBeInTheDocument();
		btn.click();
		expect(onQuit).toHaveBeenCalledTimes(1);
	});
});
