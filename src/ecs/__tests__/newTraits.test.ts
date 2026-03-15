import {
	AIFactionTrait,
	AnimationState,
	BotLOD,
	ChunkDiscovery,
	Experience,
	FactionResearch,
	FactionResourcePool,
	FactionStanding,
	FloorCell,
	HarvestOp,
	POITrait,
	ResourcePool,
	SpeechBubble,
	TerritoryCell,
	TurnStateKoota,
	UnitTurnState,
} from "../traits";
import { world } from "../world";

afterEach(() => {
	for (const e of world.query(TerritoryCell)) e.destroy();
	for (const e of world.query(FloorCell)) e.destroy();
	for (const e of world.query(ResourcePool)) e.destroy();
	for (const e of world.query(TurnStateKoota)) e.destroy();
	for (const e of world.query(SpeechBubble)) e.destroy();
	for (const e of world.query(HarvestOp)) e.destroy();
	for (const e of world.query(POITrait)) e.destroy();
	for (const e of world.query(AIFactionTrait)) e.destroy();
	for (const e of world.query(FactionResearch)) e.destroy();
	for (const e of world.query(FactionStanding)) e.destroy();
	for (const e of world.query(FactionResourcePool)) e.destroy();
	for (const e of world.query(ChunkDiscovery)) e.destroy();
	for (const e of world.query(UnitTurnState)) e.destroy();
	for (const e of world.query(Experience)) e.destroy();
	for (const e of world.query(AnimationState)) e.destroy();
	for (const e of world.query(BotLOD)) e.destroy();
});

test("ResourcePool trait spawns with correct defaults", () => {
	const e = world.spawn(ResourcePool);
	const pool = e.get(ResourcePool)!;
	expect(pool.scrapMetal).toBe(0);
	expect(pool.darkMatter).toBe(0);
	expect(pool.nanoComposites).toBe(0);
	e.destroy();
});

test("TerritoryCell entity set/get round-trip", () => {
	const e = world.spawn(TerritoryCell);
	e.set(TerritoryCell, { q: 3, r: 7, owner: "player", strength: 5 });
	const c = e.get(TerritoryCell)!;
	expect(c.q).toBe(3);
	expect(c.r).toBe(7);
	expect(c.owner).toBe("player");
	expect(c.strength).toBe(5);
	e.destroy();
});

test("FloorCell discoveryState defaults to 0", () => {
	const e = world.spawn(FloorCell);
	expect(e.get(FloorCell)!.discoveryState).toBe(0);
	e.destroy();
});

test("world queries return spawned entities", () => {
	const e = world.spawn(TerritoryCell);
	const found = world.query(TerritoryCell);
	expect(Array.from(found).some((x) => x === e)).toBe(true);
	e.destroy();
});

test("TurnStateKoota defaults", () => {
	const e = world.spawn(TurnStateKoota);
	const ts = e.get(TurnStateKoota)!;
	expect(ts.turnNumber).toBe(0);
	expect(ts.phase).toBe("player");
	expect(ts.activeFaction).toBe("player");
	e.destroy();
});

test("SpeechBubble set/get round-trip", () => {
	const e = world.spawn(SpeechBubble);
	e.set(SpeechBubble, {
		entityId: "bot-1",
		text: "Hello",
		expiresAtTick: 10,
		opacity: 0.5,
		wx: 1,
		wy: 2,
		wz: 3,
	});
	const b = e.get(SpeechBubble)!;
	expect(b.entityId).toBe("bot-1");
	expect(b.text).toBe("Hello");
	expect(b.opacity).toBe(0.5);
	e.destroy();
});

test("HarvestOp defaults harvestType to structure", () => {
	const e = world.spawn(HarvestOp);
	expect(e.get(HarvestOp)!.harvestType).toBe("structure");
	e.destroy();
});

test("AIFactionTrait defaults", () => {
	const e = world.spawn(AIFactionTrait);
	const af = e.get(AIFactionTrait)!;
	expect(af.phase).toBe("dormant");
	expect(af.ticksUntilDecision).toBe(0);
	e.destroy();
});

test("FactionResearch activeResearchId defaults to null", () => {
	const e = world.spawn(FactionResearch);
	expect(e.get(FactionResearch)!.activeResearchId).toBeNull();
	e.destroy();
});

test("FactionStanding set/get round-trip", () => {
	const e = world.spawn(FactionStanding);
	e.set(FactionStanding, {
		factionId: "reclaimers",
		targetFactionId: "player",
		standing: -50,
		atWar: true,
		allied: false,
		tradingWith: false,
	});
	const fs = e.get(FactionStanding)!;
	expect(fs.factionId).toBe("reclaimers");
	expect(fs.atWar).toBe(true);
	expect(fs.standing).toBe(-50);
	e.destroy();
});

test("ChunkDiscovery defaults to unexplored", () => {
	const e = world.spawn(ChunkDiscovery);
	expect(e.get(ChunkDiscovery)!.discoveryLevel).toBe("unexplored");
	e.destroy();
});

test("UnitTurnState defaults", () => {
	const e = world.spawn(UnitTurnState);
	const uts = e.get(UnitTurnState)!;
	expect(uts.apRemaining).toBe(0);
	expect(uts.mpRemaining).toBe(0);
	expect(uts.hasActed).toBe(false);
	e.destroy();
});

test("Experience defaults level to 1", () => {
	const e = world.spawn(Experience);
	expect(e.get(Experience)!.level).toBe(1);
	expect(e.get(Experience)!.xp).toBe(0);
	e.destroy();
});

test("AnimationState defaults blendWeight to 1", () => {
	const e = world.spawn(AnimationState);
	expect(e.get(AnimationState)!.blendWeight).toBe(1);
	expect(e.get(AnimationState)!.clipName).toBe("");
	e.destroy();
});

test("BotLOD defaults to full", () => {
	const e = world.spawn(BotLOD);
	expect(e.get(BotLOD)!.level).toBe("full");
	e.destroy();
});
