browser.runtime.onInstalled.addListener(async () => {
  const { staleAt } = await browser.storage.local.get("staleAt");
  const now = new Date();

  if (!staleAt || now > new Date(staleAt)) {
    console.log("Data is stale, fetching latest data...");

    const response = await fetch(
      "https://cloudflare-pages-21p.pages.dev/BTC-MYR.json"
    );

    if (!response.ok) {
      console.error("failed to fetch BTC-MYR.json");
      return;
    }

    /**@type {Record<string, number>} */
    const dateToPrice = await response.json();
    await browser.storage.local.set(dateToPrice);
    const newStaleAt = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    );
    await browser.storage.local.set({ staleAt: newStaleAt });
  }

  console.log("Initialized successfully");
});

browser.tabs.onUpdated.addListener(
  async (tabId, changes) => {
    await browser.scripting.executeScript({
      target: { tabId: tabId },
      files: ["shopee-in-sats.js"],
    });

    const urlChanges = [
      {
        pattern: /\/order\/\d+/,
        message: "order-page",
      },
      {
        pattern: /i.\d+.\d+/,
        message: "product-page",
      },
      {
        pattern: /\/search/,
        message: "search-results-page",
      },
      {
        pattern: /cat.\d+.\d+/,
        message: "category-results-page",
      },
      {
        pattern: /\/user\/purchase/,
        message: "user-purchase-page",
      },
    ];

    if ("url" in changes) {
      console.log(changes.url);
      for (const { pattern, message } of urlChanges) {
        console.log(pattern, message);
        if (changes.url.match(pattern)) {
          browser.tabs.sendMessage(tabId, message);
          break;
        }
      }
    }
  },
  {
    urls: ["*://*.shopee.com.my/*"],
  }
);
