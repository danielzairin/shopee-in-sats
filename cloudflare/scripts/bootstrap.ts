import { drizzle } from "drizzle-orm/better-sqlite3";
// @ts-expect-error Type definitions fot better-sqlite3 aren't important
import Database from "better-sqlite3";
import fs from "node:fs";
import parseCSV from "neat-csv";
import path from "node:path";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, sql } from "drizzle-orm";
import * as datefns from "date-fns";

const PATH = {
  SQLITE_DB: path.resolve(__dirname, "bootstrap.db"),
  BTC_USD: path.resolve(__dirname, "..", "data", "BTC-USD.csv"),
  USD_MYR: path.resolve(__dirname, "..", "data", "USD-MYR.csv"),
};

async function main() {
  const usdMyrRows = await parseCSV<{ Date: string; Open: number }>(
    fs.readFileSync(PATH.USD_MYR),
    {
      headers: ["Date", "Open"],
      mapValues: ({ header, value }) => {
        if (header === "Open") return parseFloat(value);
        return value;
      },
    }
  );

  const exchangeRate = new Map<string, number>();
  for (const row of usdMyrRows) {
    exchangeRate.set(row["Date"], row["Open"]);
  }

  const btcUsdRows = await parseCSV<{ Date: string; Open: number }>(
    fs.readFileSync(PATH.BTC_USD),
    {
      mapValues: ({ header, value }) => {
        if (header === "Open") return parseInt(value);
        return value;
      },
    }
  );

  const db = drizzle(new Database(PATH.SQLITE_DB));

  const prices = sqliteTable("prices", {
    date: text("date").primaryKey(),
    open: int("open", { mode: "number" }).notNull(),
  });

  db.run(sql.raw(`DROP TABLE IF EXISTS prices;`));
  db.run(
    sql.raw(
      `CREATE TABLE IF NOT EXISTS prices (date TEXT PRIMARY KEY, open INTEGER);`
    )
  );

  const insertValues: InferInsertModel<typeof prices>[] = [];
  for (const row of btcUsdRows) {
    let usdMyrRate = exchangeRate.get(row["Date"]);

    if (!usdMyrRate) {
      // If no exchange rate on the date, use the closest one from the past
      let date = datefns.parse(row["Date"], "yyyy-mm-dd", Date.now());
      while (!usdMyrRate) {
        const key = datefns.format(date, "yyyy-mm-dd");
        usdMyrRate = exchangeRate.get(key);
        date = datefns.addDays(date, -1);
      }
    }

    insertValues.push({
      date: row["Date"],
      open: Math.round(row["Open"] * usdMyrRate),
    });
  }

  db.insert(prices).values(insertValues).run();
}

main();
