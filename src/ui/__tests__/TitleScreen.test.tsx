import { render, screen } from "@testing-library/react-native";
import { TitleScreen } from "../TitleScreen";

jest.mock("tone", () => ({
	context: {},
	getContext: () => ({}),
	setContext: () => {},
	start: () => Promise.resolve(),
	Transport: { start: () => {}, stop: () => {} },
}));

jest.mock("@react-three/fiber", () => ({
	Canvas: ({ children }: { children: React.ReactNode }) => children ?? null,
}));

jest.mock("../title/TitleMenuScene", () => ({
	TitleMenuScene: () => null,
}));

describe("TitleScreen", () => {
	it("renders menu overlay with New Game and Settings", () => {
		render(
			<TitleScreen
				onContinueGame={async () => {}}
				onNewGame={async () => {}}
				saveGameCountOverride={0}
			/>,
		);

		expect(screen.getAllByText("SYNTHETERIA").length).toBeGreaterThan(0);
		expect(screen.getAllByText("SYNTHETERIA")[0]).toBeOnTheScreen();
		expect(screen.getByTestId("title-new_game")).toBeOnTheScreen();
		expect(screen.getByTestId("title-settings")).toBeOnTheScreen();
	});

	it("does not show load game when save count is 0", () => {
		render(
			<TitleScreen
				onContinueGame={async () => {}}
				onNewGame={async () => {}}
				saveGameCountOverride={0}
			/>,
		);

		expect(screen.queryByTestId("title-load_game")).toBeNull();
	});
});
