declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.css";

// import.meta.env shims — Webpack DefinePlugin provides these at build time
interface ImportMetaEnv {
	readonly BASE_URL: string;
	readonly DEV: boolean;
	readonly PROD: boolean;
}
interface ImportMeta {
	readonly env: ImportMetaEnv;
}
