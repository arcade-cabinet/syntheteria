import type { Config } from "tailwindcss";

const config = {
	content: ["./src/**/*.{ts,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				// Syntheteria palette — dark industrial sci-fi
				slate: {
					950: "#0a0e14",
					900: "#0f1520",
					800: "#1a2332",
					700: "#243044",
					600: "#2e3d56",
				},
				cyan: {
					50: "#e0fcff",
					100: "#bef8fd",
					200: "#87eaf2",
					300: "#54d1db",
					400: "#38bec9",
					500: "#2cb1bc",
					600: "#14919b",
					700: "#0e7c86",
					800: "#0a6c74",
					900: "#044e54",
				},
				green: {
					50: "#e3f9e5",
					100: "#c1eac5",
					200: "#a3d9a5",
					300: "#7bc47f",
					400: "#57ae5b",
					500: "#3f9142",
					600: "#2f8132",
					700: "#207227",
					800: "#0e5814",
					900: "#05400a",
				},
			},
		},
	},
	plugins: [],
} satisfies Config;

export default config;
