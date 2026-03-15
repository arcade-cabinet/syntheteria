/**
 * T04: ResourcePool Koota entity — reactive mirror of module-level resource pool.
 */
import { ResourcePool as ResourcePoolTrait } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	addResource,
	getResourcePoolEntity,
	getResources,
	initResourcePoolEntity,
	resetResources,
	setResources,
	spendResource,
} from "../resources";

beforeEach(() => {
	resetResources();
	initResourcePoolEntity();
});

afterEach(() => {
	// Destroy any stray ResourcePool entities
	for (const e of Array.from(world.query(ResourcePoolTrait))) {
		if (e.isAlive()) e.destroy();
	}
});

test("initResourcePoolEntity spawns entity with zero values", () => {
	const entity = getResourcePoolEntity();
	const pool = entity.get(ResourcePoolTrait)!;
	expect(pool.scrapMetal).toBe(0);
	expect(pool.eWaste).toBe(0);
	expect(pool.intactComponents).toBe(0);
});

test("addResource updates entity trait scrapMetal", () => {
	addResource("scrapMetal", 5);
	const resources = getResources();
	expect(resources.scrapMetal).toBe(5);
	const entityPool = getResourcePoolEntity().get(ResourcePoolTrait)!;
	expect(entityPool.scrapMetal).toBe(5);
});

test("addResource updates entity trait eWaste", () => {
	addResource("eWaste", 3);
	const entityPool = getResourcePoolEntity().get(ResourcePoolTrait)!;
	expect(entityPool.eWaste).toBe(3);
});

test("addResource updates entity trait intactComponents", () => {
	addResource("intactComponents", 7);
	const entityPool = getResourcePoolEntity().get(ResourcePoolTrait)!;
	expect(entityPool.intactComponents).toBe(7);
});

test("spendResource decrements entity trait and returns true", () => {
	addResource("scrapMetal", 10);
	const result = spendResource("scrapMetal", 4);
	expect(result).toBe(true);
	const entityPool = getResourcePoolEntity().get(ResourcePoolTrait)!;
	expect(entityPool.scrapMetal).toBe(6);
});

test("spendResource returns false when insufficient and does not update entity", () => {
	addResource("scrapMetal", 2);
	const result = spendResource("scrapMetal", 5);
	expect(result).toBe(false);
	const entityPool = getResourcePoolEntity().get(ResourcePoolTrait)!;
	expect(entityPool.scrapMetal).toBe(2);
});

test("setResources syncs entity", () => {
	setResources({ scrapMetal: 42, eWaste: 15 });
	const entityPool = getResourcePoolEntity().get(ResourcePoolTrait)!;
	expect(entityPool.scrapMetal).toBe(42);
	expect(entityPool.eWaste).toBe(15);
});

test("resetResources zeroes entity trait fields", () => {
	addResource("scrapMetal", 100);
	addResource("eWaste", 50);
	resetResources();
	// resetResources zeros module state and syncs entity
	const entityPool = getResourcePoolEntity().get(ResourcePoolTrait)!;
	expect(entityPool.scrapMetal).toBe(0);
	expect(entityPool.eWaste).toBe(0);
});

test("entity is queryable via world.query(ResourcePoolTrait)", () => {
	const entities = Array.from(world.query(ResourcePoolTrait));
	// After initResourcePoolEntity(), exactly one entity exists
	expect(entities.length).toBe(1);
	expect(entities[0].get(ResourcePoolTrait)!.scrapMetal).toBe(0);
});
