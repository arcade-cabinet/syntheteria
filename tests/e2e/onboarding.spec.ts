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
	maxDismissals = 3,
) {
	for (let index = 0; index < maxDismissals; index += 1) {
		const dismiss = page.getByText(/tap to dismiss/i);
		if ((await dismiss.count()) === 0) {
			return;
		}
		await dismiss.first().click();
	}
}

test.describe("world and city onboarding", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
	});

	test("generates a world, opens the site brief, enters a city, and returns", async ({
		page,
	}) => {
		await page.goto("/");
		await page.getByTestId("title-new_game").click();
		await expect(page.getByText("New Game Configuration")).toBeVisible();
		await page.getByTestId("new-game-confirm").click();

		await dismissThoughtIfVisible(page);
		await expect(page.getByTestId("location-open-site-brief")).toBeVisible({
			timeout: 15000,
		});
		await page.getByTestId("location-open-site-brief").click();
		await expect(page.getByText("Relay Home Base")).toBeVisible();
		await page.getByTestId("city-site-enter").click();

		await expect(page.getByTestId("location-open-city-brief")).toBeVisible({
			timeout: 15000,
		});
		await page.getByTestId("location-return-world").click();
		await expect(page.getByTestId("location-open-site-brief")).toBeVisible({
			timeout: 15000,
		});
	});

	test("continues directly back into a persisted city scene", async ({
		page,
	}) => {
		await page.goto("/");
		await page.getByTestId("title-new_game").click();
		await page.getByTestId("new-game-confirm").click();

		await dismissThoughtIfVisible(page);
		await expect(page.getByTestId("location-open-site-brief")).toBeVisible({
			timeout: 15000,
		});
		await page.getByTestId("location-open-site-brief").click();
		await page.getByTestId("city-site-enter").click();
		await expect(page.getByTestId("location-open-city-brief")).toBeVisible({
			timeout: 15000,
		});

		await page.reload();
		await page.getByTestId("title-load_game").click();
		await expect(page.getByTestId("location-open-city-brief")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByTestId("location-return-world")).toBeVisible();
	});
});
