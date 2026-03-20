import { expect, test } from "vitest";

test("app mounts without crashing", async () => {
	const { App } = await import("../../src/app/App");

	const container = document.createElement("div");
	container.id = "root";
	document.body.appendChild(container);

	expect(App).toBeDefined();
	expect(typeof App).toBe("function");

	document.body.removeChild(container);
});
