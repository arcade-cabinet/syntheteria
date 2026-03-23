import { render, screen } from "@testing-library/react-native";
import { LoadingOverlay } from "../LoadingOverlay";

describe("LoadingOverlay", () => {
	it("renders the given label", () => {
		render(<LoadingOverlay label="Encoding world" />);

		expect(screen.getByText("Encoding world")).toBeOnTheScreen();
	});

	it("renders staged sub-message (Encoding sector lattice)", () => {
		render(<LoadingOverlay label="Encoding world" />);

		expect(screen.getByText("Encoding sector lattice")).toBeOnTheScreen();
	});
});
