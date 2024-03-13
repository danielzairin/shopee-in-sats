import parseCSV from "neat-csv";
import * as datefns from "date-fns";

async function main() {
  const usdMyrRows = await parseCSV<{ Date: string; Open: number }>(
    await fetchUSDMYRData(),
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
    await fetchBTCUSDData(),
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
      let date = datefns.parse(row["Date"], "yyyy-MM-dd", Date.now());
      let count = 0;
      while (!usdMyrRate) {
        const key = datefns.format(date, "yyyy-MM-dd");
        usdMyrRate = exchangeRate.get(key);
        date = datefns.addDays(date, -1);
        count++;
        if (count >= 10) {
          throw Error(
            `failed to find an exchange rate for date: ${row["Date"]} after 10 attempts`
          );
        }
      }
    }

    const date = row["Date"];
    let open = Math.round(row["Open"] * usdMyrRate);

    if (!row["Open"]) {
      // If for some reason there is no BTC USD price on this date, use the latest one
      const current = datefns.parse(row["Date"], "yyyy-MM-dd", Date.now());
      const yesterday = datefns.addDays(current, -1);
      const key = datefns.format(yesterday, "yyyy-MM-dd");
      open = dateToPrice[key];
    }

    dateToPrice[date] = open;
  }

  console.log(JSON.stringify(dateToPrice, null, 2));
}

/**
 * Fetches the historical price of a bitcoin in USD from Yahoo Finances.
 * Data starts from 2014-09-17 to the most recent date.
 * @returns {Promise<string>} csv file
 */
async function fetchBTCUSDData(): Promise<string> {
  const url = `https://query1.finance.yahoo.com/v7/finance/download/BTC-USD?period1=1410912000&period2=${Math.floor(
    Date.now() / 1000
  )}&interval=1d&events=history`;

  const response = await fetch(url);
  if (!response.ok) {
    throw Error(`failed to fetch BTC-USD CSV file, status: ${response.status}`);
  }

  return response.text();
}

/**
 * Fetches the historical exchange rate of MYR to USD from Yahoo Finances.
 * Data starts from 2014-09-17 to the most recent date.
 * @returns {Promise<string>} csv file
 */
async function fetchUSDMYRData(): Promise<string> {
  const url = `https://query1.finance.yahoo.com/v7/finance/download/MYR=X?period1=1410912000&period2=${Math.floor(
    Date.now() / 1000
  )}&interval=1d&events=history`;

  const response = await fetch(url);
  if (!response.ok) {
    throw Error(`failed to fetch USD-MYR CSV file, status: ${response.status}`);
  }

  return response.text();
}

main();
