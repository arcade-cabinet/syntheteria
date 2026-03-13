import {
	initializeDatabaseSync,
	resetDatabaseBootstrapForTests,
} from "../bootstrap";
import { FakeDatabase } from "./helpers/fakeDatabase";

describe("database bootstrap", () => {
	it("creates the required tables on first initialization", () => {
		const database = new FakeDatabase();

		initializeDatabaseSync(database);

		expect(database.execCalls).toHaveLength(1);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS save_games",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS ecumenopolis_maps",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS sector_cells",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS world_points_of_interest",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS city_instances",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS campaign_states",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS resource_states",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS world_entities",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS unlocked_techniques",
		);
		expect(database.execCalls[0]).toContain(
			"CREATE TABLE IF NOT EXISTS map_discovery",
		);
	});

	it("adds missing save_game columns for existing installs", () => {
		const database = new FakeDatabase();
		database.setColumns("save_games", [
			"id",
			"name",
			"last_played_at",
			"playtime_seconds",
		]);

		initializeDatabaseSync(database);

		expect(
			database.execCalls.some((sql) => sql.includes("ADD COLUMN world_seed")),
		).toBe(true);
		expect(
			database.execCalls.some((sql) => sql.includes("ADD COLUMN sector_scale")),
		).toBe(true);
		expect(
			database.execCalls.some((sql) => sql.includes("ADD COLUMN difficulty")),
		).toBe(true);
		expect(
			database.execCalls.some((sql) =>
				sql.includes("ADD COLUMN climate_profile"),
			),
		).toBe(true);
		expect(
			database.execCalls.some((sql) =>
				sql.includes("ADD COLUMN storm_profile"),
			),
		).toBe(true);
		expect(
			database.execCalls.some((sql) => sql.includes("ADD COLUMN created_at")),
		).toBe(true);
	});

	it("is idempotent per database instance", () => {
		const database = new FakeDatabase();

		initializeDatabaseSync(database);
		initializeDatabaseSync(database);

		expect(database.execCalls).toHaveLength(1);
		resetDatabaseBootstrapForTests(database);
		initializeDatabaseSync(database);
		expect(database.execCalls).toHaveLength(2);
	});
});
