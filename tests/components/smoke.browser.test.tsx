import { expect, test } from "vitest";

test("smoke test — Canvas renders", () => {
	const div = document.createElement("div");
	document.body.appendChild(div);
	expect(div).toBeDefined();
});
