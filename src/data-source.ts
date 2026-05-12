import "reflect-metadata";
import * as fs from "node:fs";
import * as path from "node:path";
import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

const databasePath = process.env.DB_PATH ?? path.join("data", "database.sqlite");
fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });

export default new DataSource({
  type: "sqlite",
  database: databasePath,
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [path.join(__dirname, "entities", "*.{ts,js}")],
  migrations: [path.join(__dirname, "migrations", "*.{ts,js}")],
});
