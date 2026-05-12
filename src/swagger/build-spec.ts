import fs from "node:fs";
import path from "node:path";

import swaggerJsdoc from "swagger-jsdoc";

let cached: object | undefined;

function resolvePathsDoc(): string {
  const js = path.join(__dirname, "paths.doc.js");
  const ts = path.join(__dirname, "paths.doc.ts");
  if (fs.existsSync(js)) {
    return js;
  }
  if (fs.existsSync(ts)) {
    return ts;
  }
  return js;
}

/** Repo root: src/swagger → .. .. or dist/swagger → .. .. */
function resolveProjectRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

/**
 * Include the bundled paths doc plus route/source globs so Swagger works in
 * ts-node (src) and compiled Docker (dist).
 */
function resolveApiGlobs(): string[] {
  const root = resolveProjectRoot();
  const posixRoot = root.split(path.sep).join("/");
  return [
    resolvePathsDoc(),
    `${posixRoot}/src/**/*.ts`,
    `${posixRoot}/dist/**/*.js`,
  ];
}

export function getSwaggerSpec(): object {
  if (cached === undefined) {
    cached = swaggerJsdoc({
      definition: {
        openapi: "3.0.0",
        info: {
          title: "Ticket Management API",
          version: "1.0.0",
          description:
            "Educational concert ticketing backend (Express + TypeORM + SQLite). Requests include a correlation id (`ref` on errors) from middleware.",
        },
        servers: [{ url: "/", description: "This server" }],
      },
      apis: resolveApiGlobs(),
      failOnErrors: false,
    });
  }
  return cached;
}
