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

test.describe("title screen", () => {
	test.beforeEach(async ({ page }) => {
		await clearPersistence(page);
		await expect(page.getByText("SYNTHETERIA")).toBeVisible();
	});

	test("shows new game and settings before a save exists", async ({ page }) => {
		await expect(page.getByTestId("title-new_game")).toBeVisible();
		await expect(page.getByTestId("title-settings")).toBeVisible();
		await expect(page.getByTestId("title-load_game")).toHaveCount(0);
	});

	test("opens and closes the settings overlay", async ({ page }) => {
		await page.getByTestId("title-settings").click();
		await expect(page.getByText("Settings")).toBeVisible();
		await page.getByTestId("settings-close").click();
		await expect(page.getByText("Settings")).toHaveCount(0);
	});
});
