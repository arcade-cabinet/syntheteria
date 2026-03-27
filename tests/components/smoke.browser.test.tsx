/**
 * Smoke test — verifies the browser test environment is working.
 *
 * Checks that Tailwind CSS is loaded, React can render,
 * and the ECS world is available.
 */

import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { world } from "../../src/ecs/world";

test("browser environment has Tailwind CSS loaded", () => {
	const el = document.createElement("div");
	el.className = "text-cyan-400";
	document.body.appendChild(el);

	const color = getComputedStyle(el).color;
	// Tailwind text-cyan-400 should resolve to a non-black color
	expect(color, "Tailwind CSS should be loaded").not.toBe("rgb(0, 0, 0)");

	el.remove();
});

test("React can render a component", async () => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);

	root.render(<div data-testid="smoke">Hello</div>);
	await new Promise((r) => setTimeout(r, 50));

	const rendered = container.querySelector("[data-testid='smoke']");
	expect(rendered).not.toBeNull();
	expect(rendered!.textContent).toBe("Hello");

	root.unmount();
	container.remove();
});

test("Koota ECS world is available", () => {
	expect(world).toBeDefined();
	// World should support basic operations
	expect(typeof world.spawn).toBe("function");
	expect(typeof world.query).toBe("function");
});
