import { expect, test } from "@playwright/test";

async function clearPersistence(page: import("@playwright/test").Page) {
	await page.goto("/");
	await page.evaluate(async () => {
		try {
			localStorage.clear();
			sessionStorage.clear();
		} catch (_error) {
			// Some environments gate storage during early document bootstrap.
		}
		if ("caches" in window) {
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));
		}
		if (typeof indexedDB.databases === "function") {
			const databases = await indexedDB.databases();
			await Promise.all(
				databases.map(
					(database) =>
						new Promise<void>((resolve) => {
							if (!database.name) {
								resolve();
								return;
							}
							const request = indexedDB.deleteDatabase(database.name);
							request.onsuccess = () => resolve();
							request.onerror = () => resolve();
							request.onblocked = () => resolve();
						}),
				),
			);
		}
	});
}

async function dismissThoughtIfVisible(
	page: import("@playwright/test").Page,
	maxDismissals = 8,
) {
	for (let index = 0; index < maxDismissals; index += 1) {
		const dismiss = page.getByText(/tap to dismiss/i);
		if ((await dismiss.count()) === 0) {
			return;
		}
		try {
			await dismiss.first().click({ force: true, timeout: 2000 });
		} catch (_error) {
			if ((await dismiss.count()) === 0) {
				continue;
			}
			await dismiss.first().dispatchEvent("click");
		}
		await page.waitForTimeout(150);
	}
}

async function expectNoRenderError(page: import("@playwright/test").Page) {
	await expect(page.getByText(/Render Error:/i)).toHaveCount(0);
}

async function openSelectedUnitRadial(page: import("@playwright/test").Page) {
	const canvas = page.locator("canvas").first();
	const box = await canvas.boundingBox();
	if (!box) {
		throw new Error("Expected world canvas bounding box.");
	}

	await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45, {
		button: "right",
	});
	await expect(page.getByTestId("radial-menu")).toBeVisible({
		timeout: 10000,
	});
}

async function openNearbySiteBrief(page: import("@playwright/test").Page) {
	await dismissThoughtIfVisible(page);
	const bubble = page.getByTestId("briefing-bubble-nearby-site");
	await expect(bubble).toBeVisible({
		timeout: 15000,
	});
	await bubble.click({ force: true });
	const closeButton = page.getByTestId("city-site-close");
	if (!(await closeButton.isVisible().catch(() => false))) {
		await bubble.dispatchEvent("click");
	}
	await expect(closeButton).toBeVisible({ timeout: 5000 });
}

async function openActiveSiteBrief(page: import("@playwright/test").Page) {
	await dismissThoughtIfVisible(page);
	const bubble = page.getByTestId("briefing-bubble-active-site");
	await expect(bubble).toBeVisible({
		timeout: 15000,
	});
	await bubble.click({ force: true });
	const closeButton = page.getByTestId("city-site-close");
	if (!(await closeButton.isVisible().catch(() => false))) {
		await bubble.dispatchEvent("click");
	}
	await expect(closeButton).toBeVisible({ timeout: 5000 });
}

async function establishNearbySubstation(
	page: import("@playwright/test").Page,
) {
	await openNearbySiteBrief(page);

	const surveyButton = page.getByTestId("city-site-survey");
	if (await surveyButton.isVisible().catch(() => false)) {
		await surveyButton.click();
		await expect(page.getByTestId("city-site-close")).toBeVisible({
			timeout: 15000,
		});
	}

	const foundButton = page.getByTestId("city-site-found");
	if (await foundButton.isVisible().catch(() => false)) {
		await foundButton.click();
	}
	await expect(page.getByTestId("city-site-enter")).toBeVisible({
		timeout: 15000,
	});
}

test.describe("world and city onboarding", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
	});

	test("generates a world, opens the site brief, enters a city, and returns", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page).toHaveScreenshot("onboarding-title-screen.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.03,
		});
		await page.getByTestId("title-new_game").click();
		await expect(page.getByText("Campaign Initialization")).toBeVisible();
		await expect(page).toHaveScreenshot("onboarding-new-game-modal.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.03,
		});
		await page.getByTestId("new-game-confirm").click();
		await expect(page.getByTestId("game-scene-ready")).toBeVisible({
			timeout: 20000,
		});
		await expect(page.getByTestId("briefing-bubble-selected-unit")).toBeVisible(
			{
				timeout: 15000,
			},
		);
		await expectNoRenderError(page);
		await expect(page).toHaveScreenshot("onboarding-starting-sector.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.04,
		});
		await openSelectedUnitRadial(page);
		await expect(page.getByTestId("radial-petal-label-move")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByTestId("radial-petal-label-survey")).toBeVisible({
			timeout: 10000,
		});
		await expect(page).toHaveScreenshot("onboarding-selected-unit-radial.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.04,
		});
		await page.mouse.click(24, 24);

		await establishNearbySubstation(page);
		await expect(page).toHaveScreenshot("onboarding-substation-brief.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.04,
		});

		await page.getByTestId("city-site-operation-stage_salvage").click();
		await page.getByTestId("city-site-close").click();
		await expect(page.getByText("Scrap", { exact: true }).first()).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("3", { exact: true }).first()).toBeVisible({
			timeout: 15000,
		});
		await expect(page).toHaveScreenshot("onboarding-district-operation.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.04,
		});

		await openNearbySiteBrief(page);
		await page.getByTestId("city-site-enter").click();
		await expect(page.getByTestId("game-scene-ready")).toBeVisible({
			timeout: 20000,
		});
		await expectNoRenderError(page);

		await openActiveSiteBrief(page);
		await expect(page).toHaveScreenshot("onboarding-city-district-brief.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.04,
		});
		await page.getByTestId("city-site-return").click();
		await expect(page.getByTestId("briefing-bubble-nearby-site")).toBeVisible({
			timeout: 15000,
		});
	});

	test("continues directly back into a persisted city scene", async ({
		page,
	}) => {
		await page.goto("/");
		await page.getByTestId("title-new_game").click();
		await page.getByTestId("new-game-confirm").click();
		await expect(page.getByTestId("game-scene-ready")).toBeVisible({
			timeout: 20000,
		});

		await establishNearbySubstation(page);
		await page.getByTestId("city-site-enter").click();
		await expect(page.getByTestId("game-scene-ready")).toBeVisible({
			timeout: 20000,
		});
		await openActiveSiteBrief(page);
		await page.getByTestId("city-site-close").click();

		await page.reload();
		const loadGameButton = page.getByTestId("title-load_game");
		if (await loadGameButton.isVisible().catch(() => false)) {
			await loadGameButton.click();
		}
		await expectNoRenderError(page);
		await openActiveSiteBrief(page);
		await expect(page.getByTestId("city-site-return")).toBeVisible();
	});
});
