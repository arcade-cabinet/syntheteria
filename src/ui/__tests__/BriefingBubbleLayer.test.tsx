import { render, screen } from "@testing-library/react-native";
import { BriefingBubbleLayer } from "../BriefingBubbleLayer";

jest.mock("../../world/briefingBubbles", () => ({
	getActiveBriefingBubbles: () => [
		{
			id: "test-bubble",
			title: "Field Technician",
			body: "compute, signal, and fabrication-adjacent",
			tone: "signal" as const,
			anchor: "nearby-site" as const,
			screenHint: "top-center" as const,
		},
	],
}));

const stableRuntime = {};
jest.mock("../../world/runtimeState", () => ({
	getRuntimeState: () => stableRuntime,
	subscribeRuntimeState: (fn: () => unknown) => fn,
	setCitySiteModalOpen: () => {},
}));

jest.mock("../../world/session", () => ({
	getActiveWorldSession: () => null,
}));

describe("BriefingBubbleLayer", () => {
	it("renders briefing bubble with title and body", () => {
		render(<BriefingBubbleLayer />);

		expect(screen.getByText("Field Technician")).toBeOnTheScreen();
		expect(
			screen.getByText("compute, signal, and fabrication-adjacent"),
		).toBeOnTheScreen();
		expect(screen.getByTestId("briefing-bubble-nearby-site")).toBeOnTheScreen();
	});
});
