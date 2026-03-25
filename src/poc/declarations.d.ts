declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.css";

// Vite's import.meta.env used by shared config files (src/config/models.ts)
interface ImportMetaEnv {
	readonly BASE_URL: string;
}
interface ImportMeta {
	readonly env: ImportMetaEnv;
}
