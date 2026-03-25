import { resolve } from "node:path";
import type { Configuration } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import webpack from "webpack";

const config = (_env: unknown, argv: { mode?: string }): Configuration => {
	const isProd = argv.mode === "production";

	return {
		entry: "./src/index.tsx",
		resolve: {
			extensions: [".tsx", ".ts", ".js"],
			fallback: {
				// sql.js references Node built-ins that aren't needed in browser
				fs: false,
				crypto: false,
				path: false,
			},
		},
		output: {
			path: resolve(__dirname, "dist"),
			filename: isProd ? "[name].[contenthash].js" : "[name].js",
			clean: true,
		},
		devtool: isProd ? "source-map" : "eval-source-map",
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: [
						{
							loader: "ts-loader",
							options: { transpileOnly: true, configFile: "tsconfig.json" },
						},
						{
							loader: "babel-loader",
							options: {
								presets: [
									["@babel/preset-env", { modules: false }],
									["@babel/preset-react", { runtime: "automatic" }],
									"@babel/preset-typescript",
								],
								plugins: [["babel-plugin-reactylon"]],
							},
						},
					],
					exclude: /node_modules/,
				},
				{
					test: /\.css$/i,
					use: ["style-loader", "css-loader", "postcss-loader"],
				},
				{
					test: /\.(png|jpg|jpeg|svg|gif)$/i,
					type: "asset/resource",
				},
				{
					test: /\.(glb|gltf)$/i,
					type: "asset/resource",
				},
			],
		},
		plugins: [
			new HtmlWebpackPlugin({ template: "index.html" }),
			new ForkTsCheckerWebpackPlugin({ typescript: { configFile: "tsconfig.json" } }),
			new webpack.DefinePlugin({
				"import.meta.env": JSON.stringify({
					DEV: !isProd,
					PROD: isProd,
					BASE_URL: "/",
				}),
			}),
			// Strip node: protocol prefix so resolve.fallback can handle these
			new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
				resource.request = resource.request.replace(/^node:/, "");
			}),
		],
		devServer: {
			static: { directory: resolve(__dirname, "public") },
			hot: true,
			port: 8080,
		},
	};
};

export default config;
