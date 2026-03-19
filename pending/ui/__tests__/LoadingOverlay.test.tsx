/// <reference types="@testing-library/jest-dom" />
import { render, screen } from "@testing-library/react";
import { LoadingOverlay } from "../LoadingOverlay";

describe("LoadingOverlay", () => {
	it("renders the given label", () => {
		render(<LoadingOverlay label="Encoding world" />);

		expect(screen.getByText("Encoding world")).toBeInTheDocument();
	});

	it("renders staged sub-message (Encoding sector lattice)", () => {
		render(<LoadingOverlay label="Encoding world" />);

		expect(screen.getByText("Encoding sector lattice")).toBeInTheDocument();
	});
});
