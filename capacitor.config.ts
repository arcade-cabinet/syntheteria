import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.syntheteria.app",
	appName: "Syntheteria",
	webDir: "dist",
	server: {
		androidScheme: "https",
	},
};

export default config;
