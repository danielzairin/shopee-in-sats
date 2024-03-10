import { drizzle } from "drizzle-orm/better-sqlite3";
// @ts-expect-error Type definitions fot better-sqlite3 aren't important
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, sql } from "drizzle-orm";

const dbFilePath = path.resolve(__dirname, "bootstrap.db");
const db = drizzle(new Database(dbFilePath));

const csvFilePath = path.resolve(__dirname, "BTC-USD.csv");
const csv = fs.readFileSync(csvFilePath, { encoding: "utf-8" });

const prices = sqliteTable("prices", {
  date: text("date").primaryKey(),
  open: int("open", { mode: "number" }).notNull(),
});

db.run(sql.raw(`DROP TABLE IF EXISTS prices;`));
db.run(
  sql.raw(
    `CREATE TABLE IF NOT EXISTS prices (date TEXT PRIMARY KEY, open INTEGER);`,
  ),
);

const insertValues: InferInsertModel<typeof prices>[] = [];
const lines = csv.split("\n");

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line) {
    continue;
  }

  const values = line.split(",");
  const parsed = {
    date: values[0],
    open: Number.parseInt(values[1]),
  };

  insertValues.push(parsed);
}

db.insert(prices).values(insertValues).run();
