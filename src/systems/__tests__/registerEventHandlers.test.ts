import { registerEventHandlers } from "../registerEventHandlers";
import { reset as resetEventBus } from "../eventBus";
import { reset as resetNotifications } from "../notificationSystem";
import { reset as resetParticles } from "../particleEventIntegration";
import { reset as resetAudio } from "../audioEventIntegration";

beforeEach(() => {
	resetEventBus();
	resetNotifications();
	resetParticles();
	resetAudio();
});

afterEach(() => {
	resetEventBus();
	resetNotifications();
	resetParticles();
	resetAudio();
});

test("registerEventHandlers runs without error", () => {
	expect(() => registerEventHandlers()).not.toThrow();
});

test("registerEventHandlers can be called multiple times safely", () => {
	expect(() => {
		registerEventHandlers();
		registerEventHandlers();
	}).not.toThrow();
});
