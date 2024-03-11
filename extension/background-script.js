browser.runtime.onInstalled.addListener(() => {
  console.log("runtime.onInstalled");
});

browser.tabs.onUpdated.addListener(
  (tabId, changes) => {
    "url" in changes && console.log({ url: changes.url });
    if ("url" in changes && changes.url.match(/\/order\/\d+/)) {
      console.log("sending message main");
      browser.tabs.sendMessage(tabId, "main");
    }
    if ("url" in changes && changes.url.match(/i.\d+.\d+/)) {
      console.log("sending message product-page");
      browser.tabs.sendMessage(tabId, "product-page");
    }
  },
  {
    urls: ["*://*.shopee.com.my/*"],
  }
);
