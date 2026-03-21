import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HUD } from "../game/HUD";

describe("HUD", () => {
	const defaultProps = {
		turn: 1,
		ap: 3,
		maxAp: 3,
		onEndTurn: vi.fn(),
		resources: null,
	};

	it('renders "CYCLE 1" when turn=1', () => {
		render(<HUD {...defaultProps} turn={1} />);
		expect(screen.getByTestId("turn-display").textContent).toBe("CYCLE 1");
	});

	it('renders "CYCLE 5" when turn=5', () => {
		render(<HUD {...defaultProps} turn={5} />);
		expect(screen.getByTestId("turn-display").textContent).toBe("CYCLE 5");
	});

	it('renders "CYC 3 / 3" when ap=3, maxAp=3', () => {
		render(<HUD {...defaultProps} />);
		expect(screen.getByTestId("ap-display").textContent).toBe("CYC 3 / 3");
	});

	it('renders "CYC 0 / 3" when ap=0, maxAp=3', () => {
		render(<HUD {...defaultProps} ap={0} />);
		expect(screen.getByTestId("ap-display").textContent).toBe("CYC 0 / 3");
	});

	it("Advance button is present", () => {
		render(<HUD {...defaultProps} />);
		expect(screen.getByTestId("end-turn-btn")).toBeInTheDocument();
	});

	it("clicking Advance calls onEndTurn once", () => {
		const onEndTurn = vi.fn();
		render(<HUD {...defaultProps} onEndTurn={onEndTurn} />);
		fireEvent.click(screen.getByTestId("end-turn-btn"));
		expect(onEndTurn).toHaveBeenCalledTimes(1);
	});

	it("onEndTurn is not called on render", () => {
		const onEndTurn = vi.fn();
		render(<HUD {...defaultProps} onEndTurn={onEndTurn} />);
		expect(onEndTurn).not.toHaveBeenCalled();
	});
});

describe("HUD resource display", () => {
	const defaultProps = {
		turn: 1,
		ap: 3,
		maxAp: 3,
		onEndTurn: vi.fn(),
	};

	it("shows resource counters for non-zero values", () => {
		render(
			<HUD
				{...defaultProps}
				resources={{ stone: 10, iron_ore: 5, steel: 0 }}
			/>,
		);

		const display = screen.getByTestId("resource-display");
		expect(display).toBeInTheDocument();
		expect(screen.getByTestId("resource-stone").textContent).toBe("STN 10");
		expect(screen.getByTestId("resource-iron_ore").textContent).toBe("ORE 5");
	});

	it("hides zero-value resources", () => {
		render(<HUD {...defaultProps} resources={{ stone: 0, iron_ore: 0 }} />);

		expect(screen.queryByTestId("resource-display")).not.toBeInTheDocument();
	});

	it("shows all non-zero resources", () => {
		render(
			<HUD
				{...defaultProps}
				resources={{
					stone: 10,
					iron_ore: 5,
					steel: 3,
					timber: 2,
					circuits: 1,
					fuel: 7,
					glass: 4,
				}}
			/>,
		);

		const display = screen.getByTestId("resource-display");
		expect(display.children.length).toBe(7);
	});

	it("does not render resource display when resources is null", () => {
		render(<HUD {...defaultProps} resources={null} />);
		expect(screen.queryByTestId("resource-display")).not.toBeInTheDocument();
	});
});
