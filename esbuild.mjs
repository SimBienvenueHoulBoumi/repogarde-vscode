// Un seul fichier dist/extension.js : extension légère, sans node_modules
import { build } from "esbuild";

const production = process.argv.includes("--production");
await build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  minify: production,
  sourcemap: !production,
  logLevel: "info",
});
