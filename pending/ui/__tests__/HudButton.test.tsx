import { fireEvent, render, screen } from "@testing-library/react";
import { HudButton } from "../components/HudButton";

describe("HudButton", () => {
	it("renders label and calls onPress when pressed", () => {
		const onPress = jest.fn();
		render(<HudButton label="End Turn" onPress={onPress} />);

		expect(screen.getByText("End Turn")).toBeInTheDocument();

		fireEvent.click(screen.getByText("End Turn"));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it("renders with testID when provided", () => {
		render(
			<HudButton label="Settings" onPress={() => {}} testID="title-settings" />,
		);

		expect(screen.getByTestId("title-settings")).toBeInTheDocument();
	});

	it("renders meta text when provided", () => {
		render(
			<HudButton
				label="New Game"
				meta="generate persistent world"
				onPress={() => {}}
			/>,
		);

		expect(screen.getByText("New Game")).toBeInTheDocument();
		expect(screen.getByText("generate persistent world")).toBeInTheDocument();
	});
});
