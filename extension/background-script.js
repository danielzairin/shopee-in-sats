browser.runtime.onInstalled.addListener(() => {
  console.log("runtime.onInstalled");
});

browser.tabs.onUpdated.addListener(
  (tabId, changes) => {
    "url" in changes && console.log({ url: changes.url });
    if ("url" in changes && changes.url.match(/\/order\/\d+/)) {
      browser.tabs.sendMessage(tabId, "order-page");
    }
    if ("url" in changes && changes.url.match(/i.\d+.\d+/)) {
      browser.tabs.sendMessage(tabId, "product-page");
    }
  },
  {
    urls: ["*://*.shopee.com.my/*"],
  }
);
