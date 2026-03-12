import { expect, test } from "@playwright/experimental-ct-react";
import { FakeDatabase } from "../../src/db/__tests__/helpers/fakeDatabase";
import { initializeDatabaseSync } from "../../src/db/bootstrap";
import { setWorldPersistenceDatabaseResolver } from "../../src/db/worldPersistence";
import { LocationPanelPreview } from "./LocationPanelPreview";

test.describe("location panel", () => {
	test.beforeEach(() => {
		const database = new FakeDatabase();
		initializeDatabaseSync(database);
		setWorldPersistenceDatabaseResolver(() => database);
	});

	test.afterEach(() => {
		setWorldPersistenceDatabaseResolver(null);
	});

	test("renders world-side site briefing controls", async ({ mount }) => {
		const component = await mount(<LocationPanelPreview scene="world" />);

		await expect(component).toContainText("Science Campus");
		await expect(component).toContainText("Surveyed Interior");
		await expect(
			component.getByTestId("location-open-site-brief"),
		).toBeVisible();
	});

	test("renders city-side city briefing controls", async ({ mount }) => {
		const component = await mount(<LocationPanelPreview scene="city" />);

		await expect(component).toContainText("Science Campus");
		await expect(component).toContainText("Surveyed Interior");
		await expect(
			component.getByTestId("location-open-city-brief"),
		).toBeVisible();
		await expect(component.getByTestId("location-return-world")).toBeVisible();
	});
});
