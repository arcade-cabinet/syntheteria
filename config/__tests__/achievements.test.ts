import achievementsConfig from "../achievements.json";

describe("achievements.json", () => {
	const achievements = achievementsConfig.achievements;

	it("has at least 10 achievements", () => {
		expect(achievements.length).toBeGreaterThanOrEqual(10);
	});

	it("each achievement has required fields", () => {
		for (const ach of achievements) {
			expect(typeof ach.id).toBe("string");
			expect(ach.id.length).toBeGreaterThan(0);
			expect(typeof ach.title).toBe("string");
			expect(typeof ach.description).toBe("string");
			expect(typeof ach.type).toBe("string");
			expect(typeof ach.tier).toBe("string");
			expect(typeof ach.requirement).toBe("number");
			expect(ach.requirement).toBeGreaterThan(0);
			expect(typeof ach.statKey).toBe("string");
		}
	});

	it("achievement IDs are unique", () => {
		const ids = achievements.map((a) => a.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("tiers are from expected set", () => {
		const validTiers = ["bronze", "silver", "gold"];
		for (const ach of achievements) {
			expect(validTiers).toContain(ach.tier);
		}
	});

	it("within same stat, higher tiers require more", () => {
		const byStatKey = new Map<string, typeof achievements>();
		for (const ach of achievements) {
			const arr = byStatKey.get(ach.statKey) ?? [];
			arr.push(ach);
			byStatKey.set(ach.statKey, arr);
		}

		const tierOrder = { bronze: 0, silver: 1, gold: 2 } as Record<string, number>;
		for (const [, achs] of byStatKey) {
			if (achs.length <= 1) continue;
			achs.sort((a, b) => (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0));
			for (let i = 1; i < achs.length; i++) {
				expect(achs[i].requirement).toBeGreaterThan(achs[i - 1].requirement);
			}
		}
	});
});
