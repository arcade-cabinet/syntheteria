import { fireEvent, render, screen } from "@testing-library/react-native";
import { HudButton } from "../components/HudButton";

describe("HudButton", () => {
	it("renders label and calls onPress when pressed", () => {
		const onPress = jest.fn();
		render(<HudButton label="End Turn" onPress={onPress} />);

		expect(screen.getByText("End Turn")).toBeOnTheScreen();

		fireEvent.press(screen.getByText("End Turn"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("renders with testID when provided", () => {
		render(
			<HudButton label="Settings" onPress={() => {}} testID="title-settings" />,
		);

		expect(screen.getByTestId("title-settings")).toBeOnTheScreen();
	});

	it("renders meta text when provided", () => {
		render(
			<HudButton
				label="New Game"
				meta="generate persistent world"
				onPress={() => {}}
			/>,
		);

		expect(screen.getByText("New Game")).toBeOnTheScreen();
		expect(screen.getByText("generate persistent world")).toBeOnTheScreen();
	});
});
