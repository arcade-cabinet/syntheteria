import { fireEvent, render, screen } from "@testing-library/react-native";
import { createNewGameConfig } from "../../world/config";
import { NewGameModal } from "../NewGameModal";

describe("NewGameModal", () => {
	it("renders Campaign Initialization and config controls when visible", () => {
		render(
			<NewGameModal
				visible={true}
				initialConfig={createNewGameConfig(1337)}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		expect(screen.getByText("Campaign Initialization")).toBeOnTheScreen();
		expect(screen.getByText("Sector Scale")).toBeOnTheScreen();
		expect(screen.getByText("Climate Pattern")).toBeOnTheScreen();
		expect(screen.getByText("Storm Intensity")).toBeOnTheScreen();
	});

	it("calls onConfirm when confirm button is pressed", () => {
		const onConfirm = jest.fn();
		render(
			<NewGameModal
				visible={true}
				initialConfig={createNewGameConfig(42)}
				onCancel={() => {}}
				onConfirm={onConfirm}
			/>,
		);

		const confirmButton = screen.getByTestId("new-game-confirm");
		fireEvent.press(confirmButton);

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				worldSeed: expect.any(Number),
				sectorScale: expect.any(String),
			}),
		);
	});

	it("returns null when not visible", () => {
		const { queryByText } = render(
			<NewGameModal
				visible={false}
				initialConfig={createNewGameConfig(1)}
				onCancel={() => {}}
				onConfirm={() => {}}
			/>,
		);

		expect(queryByText("Campaign Initialization")).toBeNull();
	});
});
