import path from "node:path";
import fs from "node:fs";
import parseCSV from "neat-csv";
import * as datefns from "date-fns";

const PATH = {
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

  const dateToPrice: Record<string, number> = {};

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

    const date = row["Date"];
    const open = Math.round(row["Open"] * usdMyrRate);

    dateToPrice[date] = open;
  }

  console.log(JSON.stringify(dateToPrice));
}

main();
