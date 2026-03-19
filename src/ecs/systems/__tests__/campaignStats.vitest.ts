import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getCampaignStats,
	recordBuildingDestroyed,
	recordCellDiscovered,
	recordCombatEngagement,
	recordCultistDestroyed,
	recordIncursionSurvived,
	recordLightningStrike,
	recordMaterialGathered,
	recordStructureBuilt,
	recordStructureHarvested,
	recordTurnEnd,
	recordUnitBuilt,
	recordUnitHacked,
	recordUnitLost,
	rehydrateCampaignStats,
	resetCampaignStats,
	serializeCampaignStats,
	setCampaignStats,
	subscribeCampaignStats,
	updateTerritorySize,
} from "../campaignStats";

beforeEach(() => {
	resetCampaignStats();
});

describe("campaignStats", () => {
	it("starts with zeroed stats", () => {
		const stats = getCampaignStats();
		expect(stats.turnsElapsed).toBe(0);
		expect(stats.structuresHarvested).toBe(0);
		expect(stats.unitsBuilt).toBe(0);
		expect(stats.unitsLost).toBe(0);
		expect(stats.unitsHacked).toBe(0);
		expect(stats.structuresBuilt).toBe(0);
		expect(stats.cellsDiscovered).toBe(0);
		expect(stats.totalCells).toBe(0);
	});

	it("records turn ends", () => {
		recordTurnEnd();
		recordTurnEnd();
		recordTurnEnd();
		expect(getCampaignStats().turnsElapsed).toBe(3);
	});

	it("records structure harvested", () => {
		recordStructureHarvested();
		recordStructureHarvested();
		expect(getCampaignStats().structuresHarvested).toBe(2);
	});

	it("records material gathered by type", () => {
		recordMaterialGathered("scrapMetal", 10);
		recordMaterialGathered("eWaste", 5);
		recordMaterialGathered("scrapMetal", 3);

		const stats = getCampaignStats();
		expect(stats.materialsGathered.scrapMetal).toBe(13);
		expect(stats.materialsGathered.eWaste).toBe(5);
	});

	it("records cell discovery", () => {
		recordCellDiscovered(25, 100);
		const stats = getCampaignStats();
		expect(stats.cellsDiscovered).toBe(25);
		expect(stats.totalCells).toBe(100);
	});

	it("records unit built", () => {
		recordUnitBuilt();
		expect(getCampaignStats().unitsBuilt).toBe(1);
	});

	it("records unit lost", () => {
		recordUnitLost();
		recordUnitLost();
		expect(getCampaignStats().unitsLost).toBe(2);
	});

	it("records unit hacked", () => {
		recordUnitHacked();
		expect(getCampaignStats().unitsHacked).toBe(1);
	});

	it("records structure built", () => {
		recordStructureBuilt();
		recordStructureBuilt();
		recordStructureBuilt();
		expect(getCampaignStats().structuresBuilt).toBe(3);
	});

	it("setCampaignStats merges partial updates", () => {
		recordTurnEnd();
		setCampaignStats({ unitsBuilt: 5, unitsLost: 2 });
		const stats = getCampaignStats();
		expect(stats.turnsElapsed).toBe(1);
		expect(stats.unitsBuilt).toBe(5);
		expect(stats.unitsLost).toBe(2);
	});

	it("reset clears all stats", () => {
		recordTurnEnd();
		recordUnitBuilt();
		recordStructureHarvested();
		resetCampaignStats();
		const stats = getCampaignStats();
		expect(stats.turnsElapsed).toBe(0);
		expect(stats.unitsBuilt).toBe(0);
		expect(stats.structuresHarvested).toBe(0);
	});

	it("notifies subscribers on changes", () => {
		const listener = vi.fn();
		const unsub = subscribeCampaignStats(listener);

		recordTurnEnd();
		expect(listener).toHaveBeenCalledTimes(1);

		recordUnitBuilt();
		expect(listener).toHaveBeenCalledTimes(2);

		unsub();
		recordUnitLost();
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("records cultist incursions survived", () => {
		recordIncursionSurvived();
		recordIncursionSurvived();
		expect(getCampaignStats().cultistIncursionsSurvived).toBe(2);
	});

	it("records cultists destroyed", () => {
		recordCultistDestroyed();
		recordCultistDestroyed();
		recordCultistDestroyed();
		expect(getCampaignStats().cultistsDestroyed).toBe(3);
	});

	it("records buildings destroyed", () => {
		recordBuildingDestroyed();
		expect(getCampaignStats().buildingsDestroyed).toBe(1);
	});

	it("records lightning strikes received", () => {
		recordLightningStrike();
		recordLightningStrike();
		expect(getCampaignStats().lightningStrikesReceived).toBe(2);
	});

	it("records combat engagements", () => {
		recordCombatEngagement();
		expect(getCampaignStats().totalCombatEngagements).toBe(1);
	});

	it("tracks peak territory size", () => {
		updateTerritorySize(10);
		expect(getCampaignStats().peakTerritorySize).toBe(10);
		updateTerritorySize(25);
		expect(getCampaignStats().peakTerritorySize).toBe(25);
		updateTerritorySize(15); // smaller — should not update
		expect(getCampaignStats().peakTerritorySize).toBe(25);
	});

	it("new fields start at zero", () => {
		const stats = getCampaignStats();
		expect(stats.cultistIncursionsSurvived).toBe(0);
		expect(stats.cultistsDestroyed).toBe(0);
		expect(stats.buildingsDestroyed).toBe(0);
		expect(stats.lightningStrikesReceived).toBe(0);
		expect(stats.totalCombatEngagements).toBe(0);
		expect(stats.peakTerritorySize).toBe(0);
	});

	it("round-trips through serialize/rehydrate", () => {
		recordTurnEnd();
		recordCultistDestroyed();
		updateTerritorySize(42);
		const serialized = serializeCampaignStats();
		resetCampaignStats();
		expect(getCampaignStats().turnsElapsed).toBe(0);
		rehydrateCampaignStats(serialized);
		expect(getCampaignStats().turnsElapsed).toBe(1);
		expect(getCampaignStats().cultistsDestroyed).toBe(1);
		expect(getCampaignStats().peakTerritorySize).toBe(42);
	});
});
