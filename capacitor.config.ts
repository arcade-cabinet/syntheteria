import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.syntheteria.game",
	appName: "Syntheteria",
	webDir: "dist",
	server: {
		// In development, connect to the Vite dev server
		// Comment this out for production builds
		// url: "http://localhost:5173",
		// cleartext: true,
	},
	android: {
		// Allow mixed content for development
		allowMixedContent: true,
		// Fullscreen immersive mode
		// backgroundColor: "#000000",
	},
	ios: {
		// Fullscreen
		contentInset: "always",
	},
	plugins: {
		CapacitorSQLite: {
			iosDatabaseLocation: "Library/CapacitorDatabase",
			iosIsEncryption: false,
			androidIsEncryption: false,
		},
	},
};

export default config;
