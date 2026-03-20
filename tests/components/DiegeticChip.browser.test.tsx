import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { DiegeticChip } from "../../src/ui/dom/DiegeticChip";

describe("DiegeticChip", () => {
	test("renders label and value", async () => {
		const screen = render(<DiegeticChip label="Turn" value={3} />);
		await expect.element(screen.getByText("Turn")).toBeVisible();
		await expect.element(screen.getByText("3")).toBeVisible();
	});

	test("renders string value", async () => {
		const screen = render(<DiegeticChip label="Phase" value="player" />);
		await expect.element(screen.getByText("Phase")).toBeVisible();
		await expect.element(screen.getByText("player")).toBeVisible();
	});

	test("accepts custom value color", async () => {
		const screen = render(
			<DiegeticChip label="Storm" value="42%" valueColor="#ffe9b0" />,
		);
		await expect.element(screen.getByText("Storm")).toBeVisible();
		await expect.element(screen.getByText("42%")).toBeVisible();
	});
});
