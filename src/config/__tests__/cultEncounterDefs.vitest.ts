import { describe, expect, it } from "vitest";
import type { CultEncounterTrigger } from "../cultEncounterDefs";
import { CULT_ENCOUNTERS, getCultEncounter } from "../cultEncounterDefs";

describe("cultEncounterDefs", () => {
	const ALL_TRIGGERS: CultEncounterTrigger[] = [
		"first_cult_sighting",
		"first_cult_structure",
		"cult_stronghold_found",
		"cult_corruption_spread",
		"cult_archon_appears",
		"cult_war_party",
		"cult_final_assault",
		"all_cults_destroyed",
	];

	it("defines encounters for all triggers", () => {
		expect(CULT_ENCOUNTERS.length).toBe(ALL_TRIGGERS.length);
		for (const trigger of ALL_TRIGGERS) {
			const encounter = getCultEncounter(trigger);
			expect(encounter).toBeDefined();
			expect(encounter!.trigger).toBe(trigger);
		}
	});

	it("getCultEncounter returns correct encounter for each trigger", () => {
		const sighting = getCultEncounter("first_cult_sighting");
		expect(sighting).toBeDefined();
		expect(sighting!.title).toBe("Contact");

		const destroyed = getCultEncounter("all_cults_destroyed");
		expect(destroyed).toBeDefined();
		expect(destroyed!.title).toBe("Silence at Last");
	});

	it("all encounters have required fields", () => {
		for (const enc of CULT_ENCOUNTERS) {
			expect(enc.trigger).toBeTruthy();
			expect(enc.title).toBeTruthy();
			expect(enc.description).toBeTruthy();
			expect(enc.speechLine).toBeTruthy();
			expect(enc.toastMessage).toBeTruthy();
			expect(enc.minEpoch).toBeGreaterThanOrEqual(1);
			expect(enc.minEpoch).toBeLessThanOrEqual(5);
		}
	});

	it("triggers are unique", () => {
		const triggers = CULT_ENCOUNTERS.map((e) => e.trigger);
		expect(new Set(triggers).size).toBe(triggers.length);
	});

	it("getCultEncounter returns undefined for unknown trigger", () => {
		expect(
			getCultEncounter("nonexistent" as CultEncounterTrigger),
		).toBeUndefined();
	});
});
