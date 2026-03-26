import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.syntheteria.app",
	appName: "Syntheteria",
	webDir: "dist",
	server: {
		// Allow WebGL content
		androidScheme: "https",
	},
	ios: {
		// Full-screen WebGL game — hide status bar
		preferredContentMode: "mobile",
	},
	android: {
		// Hardware acceleration for WebGL
		allowMixedContent: true,
	},
};

export { config };
