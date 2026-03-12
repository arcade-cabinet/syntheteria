import {
	createSaveGameSync,
	getLatestSaveGameSync,
	getSaveGameCountSync,
	touchSaveGameSync,
} from "../saveGames";
import { FakeDatabase } from "./helpers/fakeDatabase";

describe("save game persistence", () => {
	beforeEach(() => {
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("creates and counts save games", () => {
		const database = new FakeDatabase();

		const saveGame = createSaveGameSync({ worldSeed: 1337 }, database);

		expect(saveGame).not.toBeNull();
		expect(saveGame?.world_seed).toBe(1337);
		expect(saveGame?.map_size).toBe("standard");
		expect(saveGame?.difficulty).toBe("standard");
		expect(saveGame?.climate_profile).toBe("temperate");
		expect(saveGame?.storm_profile).toBe("volatile");
		expect(saveGame?.name).toContain("Network");
		expect(getSaveGameCountSync(database)).toBe(1);
	});

	it("returns the latest save game by last played timestamp", () => {
		const database = new FakeDatabase();

		const first = createSaveGameSync({ worldSeed: 1 }, database);
		jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_500);
		const second = createSaveGameSync({ worldSeed: 2 }, database);

		expect(getLatestSaveGameSync(database)?.id).toBe(second?.id);

		jest.spyOn(Date, "now").mockReturnValue(1_700_000_001_000);
		touchSaveGameSync(first!.id, database);

		expect(getLatestSaveGameSync(database)?.id).toBe(first?.id);
	});
});
