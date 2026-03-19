/// <reference types="@testing-library/jest-dom" />
import { render, screen } from "@testing-library/react";
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

		expect(screen.getByTestId("title-logo")).toBeInTheDocument();
		expect(screen.getByTestId("title-new_game")).toBeInTheDocument();
		expect(screen.getByTestId("title-settings")).toBeInTheDocument();
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
