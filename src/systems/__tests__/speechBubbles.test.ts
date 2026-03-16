import { SpeechBubble as SpeechBubbleTrait } from "../../ecs/traits";
import { world } from "../../ecs/world";
import {
	resetBotSpeechState,
	spawnSpeechBubble,
	tickSpeechBubbles,
} from "../botSpeech";

afterEach(() => {
	resetBotSpeechState();
	// Destroy any stray SpeechBubble entities
	for (const e of Array.from(world.query(SpeechBubbleTrait))) {
		if (e.isAlive()) e.destroy();
	}
});

test("spawnSpeechBubble creates a SpeechBubble entity", () => {
	spawnSpeechBubble("bot_1", "Hello world", 50, 10, 0, 20);

	const entities = Array.from(world.query(SpeechBubbleTrait));
	expect(entities.length).toBe(1);
	const b = entities[0].get(SpeechBubbleTrait)!;
	expect(b.entityId).toBe("bot_1");
	expect(b.text).toBe("Hello world");
	expect(b.expiresAtTick).toBe(50);
	expect(b.wx).toBe(10);
	expect(b.wy).toBe(0);
	expect(b.wz).toBe(20);
	expect(b.opacity).toBe(1);
});

test("spawnSpeechBubble replaces existing bubble for same entityId", () => {
	spawnSpeechBubble("bot_1", "First", 50, 0, 0, 0);
	spawnSpeechBubble("bot_1", "Second", 60, 1, 0, 1);

	const entities = Array.from(world.query(SpeechBubbleTrait));
	expect(entities.length).toBe(1);
	expect(entities[0].get(SpeechBubbleTrait)!.text).toBe("Second");
});

test("tickSpeechBubbles destroys expired entities", () => {
	spawnSpeechBubble("bot_1", "Hi", 10, 0, 0, 0);

	tickSpeechBubbles(10); // at expiry tick
	expect(Array.from(world.query(SpeechBubbleTrait)).length).toBe(0);
});

test("tickSpeechBubbles keeps non-expired entities", () => {
	spawnSpeechBubble("bot_1", "Hi", 20, 0, 0, 0);

	tickSpeechBubbles(5);
	expect(Array.from(world.query(SpeechBubbleTrait)).length).toBe(1);
});

test("tickSpeechBubbles fades opacity for entities near expiry", () => {
	spawnSpeechBubble("bot_1", "Fading", 20, 0, 0, 0);

	tickSpeechBubbles(15); // 5 ticks remaining out of 10-tick fade window
	const b = Array.from(world.query(SpeechBubbleTrait))[0]?.get(
		SpeechBubbleTrait,
	);
	expect(b).toBeDefined();
	expect(b!.opacity).toBeLessThan(1);
});
