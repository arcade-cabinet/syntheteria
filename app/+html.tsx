import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Web-only HTML shell. Configures the root <html> for static web export.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: PropsWithChildren) {
	return (
		<html lang="en" className="bg-[#050913]">
			<head>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, shrink-to-fit=no"
				/>
				<title>Syntheteria</title>

				{/* Disable body scrolling on web — ScrollView components work closer to native behavior */}
				<ScrollViewStyleReset />

				{/* Enable SharedArrayBuffer on hosts without custom header support (e.g. GitHub Pages).
				    Required for expo-sqlite OPFS backend which uses SharedArrayBuffer + Atomics.wait() */}
				<script src="/coi-serviceworker.js" />
			</head>
			<body>{children}</body>
		</html>
	);
}
