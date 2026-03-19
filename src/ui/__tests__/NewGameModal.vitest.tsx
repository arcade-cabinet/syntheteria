import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { phraseToSeed } from "../../ecs/seed";
import { SECTOR_SCALE_SPECS } from "../../world/config";
import { NewGameModal } from "../landing/NewGameModal";

describe("NewGameModal", () => {
	it("renders the modal", () => {
		render(<NewGameModal onStart={vi.fn()} onCancel={vi.fn()} />);
		expect(screen.getByTestId("new-game-modal")).toBeInTheDocument();
	});

	it("standard sector scale card is selected by default", () => {
		render(<NewGameModal onStart={vi.fn()} onCancel={vi.fn()} />);
		const card = screen.getByTestId("scale-standard");
		expect(card).toHaveAttribute("aria-pressed", "true");
	});

	it("clicking a sector scale card selects it", () => {
		render(<NewGameModal onStart={vi.fn()} onCancel={vi.fn()} />);
		fireEvent.click(screen.getByTestId("scale-small"));
		expect(screen.getByTestId("scale-small")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByTestId("scale-standard")).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});

	it("seed input has a non-empty initial value (phrase format)", () => {
		render(<NewGameModal onStart={vi.fn()} onCancel={vi.fn()} />);
		const input = screen.getByTestId("seed-input") as HTMLInputElement;
		expect(input.value.length).toBeGreaterThan(0);
		// Phrase format: two hyphens
		expect(input.value.split("-").length).toBeGreaterThanOrEqual(3);
	});

	it("clicking reseed-btn generates a new seed phrase", () => {
		render(<NewGameModal onStart={vi.fn()} onCancel={vi.fn()} />);
		const input = screen.getByTestId("seed-input") as HTMLInputElement;
		const initial = input.value;
		fireEvent.click(screen.getByTestId("reseed-btn"));
		// Note: extremely unlikely to collide — both are random phrases
		expect(input.value).not.toBe(initial);
	});

	it("clicking cancel-btn calls onCancel", () => {
		const onCancel = vi.fn();
		render(<NewGameModal onStart={vi.fn()} onCancel={onCancel} />);
		fireEvent.click(screen.getByTestId("cancel-btn"));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("submitting calls onStart with NewGameConfig shape", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		fireEvent.click(screen.getByTestId("start-btn"));
		expect(onStart).toHaveBeenCalledTimes(1);
		const config = onStart.mock.calls[0][0];
		expect(config).toHaveProperty("worldSeed");
		expect(config).toHaveProperty("sectorScale");
		expect(config).toHaveProperty("difficulty");
		expect(config).toHaveProperty("climateProfile");
		expect(config).toHaveProperty("stormProfile");
		expect(config).toHaveProperty("factions");
	});

	it("worldSeed in config is a number", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		fireEvent.click(screen.getByTestId("start-btn"));
		const { worldSeed } = onStart.mock.calls[0][0];
		expect(typeof worldSeed).toBe("number");
		expect(worldSeed).toBeGreaterThanOrEqual(0);
	});

	it("sectorScale in config matches selected card", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		fireEvent.click(screen.getByTestId("scale-large"));
		fireEvent.click(screen.getByTestId("start-btn"));
		expect(onStart.mock.calls[0][0].sectorScale).toBe("large");
	});

	it("valid phrase seed produces deterministic worldSeed", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		// "hollow-bright-forge" is a valid phrase (all words are in the word lists)
		fireEvent.change(screen.getByTestId("seed-input"), {
			target: { value: "hollow-bright-forge" },
		});
		fireEvent.click(screen.getByTestId("start-btn"));
		const expected = phraseToSeed("hollow-bright-forge");
		expect(onStart.mock.calls[0][0].worldSeed).toBe(expected);
	});

	it("sector scale cards all render with correct dimensions in tooltip", () => {
		render(<NewGameModal onStart={vi.fn()} onCancel={vi.fn()} />);
		for (const [scale, spec] of Object.entries(SECTOR_SCALE_SPECS)) {
			const card = screen.getByTestId(`scale-${scale}`);
			expect(card.textContent).toContain(`${spec.width}×${spec.height}`);
		}
	});

	it("default factions: 4 slots, reclaimers is player, rest are AI", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		fireEvent.click(screen.getByTestId("start-btn"));
		const { factions } = onStart.mock.calls[0][0];
		expect(factions).toHaveLength(4);
		const playerSlot = factions.find((f: { role: string }) => f.role === "player");
		expect(playerSlot).toBeDefined();
		expect(playerSlot.factionId).toBe("reclaimers");
		const aiSlots = factions.filter((f: { role: string }) => f.role === "ai");
		expect(aiSlots).toHaveLength(3);
	});

	it("clicking player radio deselects current player (observer mode)", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		// Deselect reclaimers player radio
		fireEvent.click(screen.getByTestId("faction-reclaimers-player-radio"));
		fireEvent.click(screen.getByTestId("start-btn"));
		const { factions } = onStart.mock.calls[0][0];
		// All should be AI now (no player)
		const playerSlots = factions.filter((f: { role: string }) => f.role === "player");
		expect(playerSlots).toHaveLength(0);
	});

	it("clicking a different player radio switches the player faction", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		// Select signal_choir as player
		fireEvent.click(screen.getByTestId("faction-signal_choir-player-radio"));
		fireEvent.click(screen.getByTestId("start-btn"));
		const { factions } = onStart.mock.calls[0][0];
		const playerSlot = factions.find((f: { role: string }) => f.role === "player");
		expect(playerSlot?.factionId).toBe("signal_choir");
		// Reclaimers should now be AI
		const reclaimers = factions.find((f: { factionId: string }) => f.factionId === "reclaimers");
		expect(reclaimers?.role).toBe("ai");
	});

	it("toggling AI/Off role removes faction from active play", () => {
		const onStart = vi.fn();
		render(<NewGameModal onStart={onStart} onCancel={vi.fn()} />);
		// Toggle volt_collective to off
		fireEvent.click(screen.getByTestId("faction-volt_collective-role"));
		fireEvent.click(screen.getByTestId("start-btn"));
		const { factions } = onStart.mock.calls[0][0];
		const volt = factions.find((f: { factionId: string }) => f.factionId === "volt_collective");
		expect(volt?.role).toBe("off");
	});
});
