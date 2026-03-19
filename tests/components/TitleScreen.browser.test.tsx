import { describe, expect, test } from "vitest";
import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-react";
import { LoadingOverlay } from "../../src/ui/LoadingOverlay";
import { NewGameModal } from "../../src/ui/NewGameModal";
import { createNewGameConfig } from "../../src/world/config";

describe("title and new game flow surfaces", () => {
	test("new game modal renders branded configuration controls", async () => {
		const screen = render(
			<NewGameModal
				visible={true}
				initialConfig={createNewGameConfig(1337)}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		await expect
			.element(screen.getByText("Campaign Initialization", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Sector Scale", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Climate Pattern", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Storm Intensity", { exact: false }))
			.toBeVisible();
		await expect(page.screenshot()).toMatchSnapshot("new-game-modal.png");
	});

	test("loading overlay renders world generation status", async () => {
		const screen = render(
			<div
				style={{
					width: 1280,
					height: 720,
					position: "relative",
					background: "#02050a",
				}}
			>
				<LoadingOverlay label="Encoding world" />
			</div>,
		);

		await expect
			.element(screen.getByText("Encoding world", { exact: false }))
			.toBeVisible();
		await expect
			.element(screen.getByText("Encoding sector lattice", { exact: false }))
			.toBeVisible();
		await expect(page.screenshot()).toMatchSnapshot("loading-overlay.png");
	});
});
