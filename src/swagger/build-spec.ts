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

export function getSwaggerSpec(): object {
  if (cached === undefined) {
    cached = swaggerJsdoc({
      definition: {
        openapi: "3.0.0",
        info: {
          title: "Ticket Management API",
          version: "1.0.0",
          description:
            "Swagger for the educational concert ticketing backend (Express + TypeORM).",
        },
        servers: [{ url: "/", description: "This server" }],
      },
      apis: [resolvePathsDoc()],
      failOnErrors: false,
    });
  }
  return cached;
}
