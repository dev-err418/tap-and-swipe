import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const requireDependency = createRequire(import.meta.url);

// Exercise real server modules with isolated dependencies and no live data access.
export function loadTestModule<T>(
  path: string,
  dependencies: Record<string, unknown>,
  environment: Record<string, string | undefined> = process.env,
): T {
  const file = new URL(`../../../${path}`, import.meta.url);
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    process: { env: environment },
    console,
    TextEncoder,
    URLSearchParams,
    require(id: string) {
      if (id in dependencies) return dependencies[id];
      if (id.startsWith("@/")) throw new Error(`Unexpected dependency: ${id}`);
      return requireDependency(id);
    },
  });
  return exports as T;
}
