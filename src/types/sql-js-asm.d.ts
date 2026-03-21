/** Type declaration for sql.js asm.js build (pure JS, no wasm). Test-only — see createTestAdapter(). */
declare module "sql.js/dist/sql-asm.js" {
	import type { SqlJsStatic } from "sql.js";
	const initSqlJs: (config?: Record<string, unknown>) => Promise<SqlJsStatic>;
	export default initSqlJs;
}
