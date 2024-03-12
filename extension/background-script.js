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
