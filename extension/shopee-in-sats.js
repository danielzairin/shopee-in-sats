(() => {
  // @ts-ignore
  if (window.hasRun === true) {
    return;
  }
  // @ts-ignore
  window.hasRun = true;

  async function userPurchasePage() {
    await waitForNode("main[aria-role=tabpanel]");

    const processedOrderIds = [];

    async function convertPricesToSats() {
      const orderCards = document.querySelectorAll(".YL_VlX");
      for (const orderCard of orderCards) {
        const link = orderCard
          .querySelector('a[aria-label="Go to PDP"]')
          ?.getAttribute("href");
        const matches = link.match(/\/order\/(\d+)/);
        const orderId = matches?.[1];

        if (!orderId || processedOrderIds.includes(orderId)) {
          continue;
        }
        processedOrderIds.push(orderId);

        const response = await fetch(
          `https://shopee.com.my/api/v4/order/get_order_detail?order_id=${orderId}`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Accept-Language": "en-US,en;q=0.5",
              "Content-Type": "application/json",
              "X-Shopee-Language": "en",
              "X-API-SOURCE": "pc",
            },
            method: "GET",
            mode: "cors",
          }
        );

        const json = await response.json();
        const payTime = json.data?.pc_processing_info?.pay_time;
        if (!payTime) {
          throw Error(
            "missing data.pc_processing_info.pay_time from API response"
          );
        }

        const btcPrice = await getBTCPriceOnDate(new Date(payTime * 1000));
        const satsPerRinggit = Math.floor((1 / btcPrice) * 100_000_000);

        orderCard
          .querySelectorAll(".q6Gzj5, .nW_6Oi, .t7TQaf")
          .forEach((node) => {
            node.textContent = toSats(node.textContent, satsPerRinggit);
          });
      }
    }

    await convertPricesToSats();

    const tabPanel = document.querySelector("main[aria-role=tabpanel]");
    const observeOptions = { childList: true, subtree: true };

    const observer = new MutationObserver(async (_mutationList, observer) => {
      observer.disconnect();
      await sleep(300);
      await convertPricesToSats();
      await sleep(300);
      observer.observe(tabPanel, observeOptions);
    });

    observer.observe(tabPanel, observeOptions);
  }

  async function orderPage() {
    await waitForNode('[aria-label^="order paid"]');

    // Search the 'order paid' stepper element for a date
    const dateRegex = /(\d{2})-(\d{2})-(\d{4})/;
    const [_, day, month, year] = document
      .querySelector('[aria-label^="order paid"]')
      .getAttribute("aria-label")
      .match(dateRegex);
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    const btcPrice = await getBTCPriceOnDate(date);
    const satsPerRinggit = Math.floor((1 / btcPrice) * 100_000_000);

    document
      .querySelectorAll(".Tfejtu, .q6Gzj5, .nW_6Oi, .stepper__step-text")
      .forEach((node) => {
        node.textContent = toSats(node.textContent, satsPerRinggit);
      });
  }

  async function productPage() {
    await waitForNode(".G27FPf");
    const btcPrice = await getBTCPriceOnDate(new Date());
    const satsPerRinggit = Math.floor((1 / btcPrice) * 100_000_000);

    const priceTag = () => document.querySelector(".G27FPf");
    const slashedPriceTag = () => document.querySelector(".qg2n76");

    const convertPriceTags = () => {
      priceTag().textContent = toSats(priceTag().textContent, satsPerRinggit);
      if (slashedPriceTag()) {
        slashedPriceTag().textContent = toSats(slashedPriceTag().textContent, satsPerRinggit);
      }
    }

    convertPriceTags();

    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData' && mutation.target.textContent.includes("RM")) {
          convertPriceTags();
        }
      })
    }).observe(priceTag(), { subtree: true, characterData: true });

    document.querySelectorAll(".item-card-special__current-price").forEach((node) => {
      node.textContent = toSats(node.textContent, satsPerRinggit);
    });
  }
  async function searchResultsPage() {
    await waitForNode(".shopee-search-item-result");

    const btcPrice = await getBTCPriceOnDate(new Date());
    const satsPerRinggit = Math.floor((1 / btcPrice) * 100_000_000);

    const searchResults = document.querySelector(".shopee-search-item-result");

    const observeOptions = {
      childList: true,
      subtree: true,
      attributes: true,
    };

    const observer = new MutationObserver(async (_mutationList, observer) => {
      observer.disconnect();
      await sleep(300);
      document
        .querySelectorAll(`.qmTjt-, .${CSS.escape("bx++ig")}`)
        .forEach((node) => node.remove());
      document.querySelectorAll(".Q1tsgQ, .k9JZlv").forEach((node) => {
        if (node.textContent.includes("sats")) {
          return;
        }
        node.textContent = toSats(`RM${node.textContent}`, satsPerRinggit);
      });
      document.querySelectorAll(".FEGPgv, .H5ICvW").forEach((node) => {
        node.textContent = toSats(node.textContent, satsPerRinggit);
      });
      await sleep(300);
      observer.observe(searchResults, observeOptions);
    });

    observer.observe(searchResults, observeOptions);
  }

  /**
   * Returns the price of 1 bitcoin in ringgit on a certain date.
   * @param {Date} date
   * @returns {Promise<number>}
   */
  async function getBTCPriceOnDate(date) {
    /**@type {number | null} */
    let price = null;
    const maxIterations = 10;
    let i = 0;

    do {
      const key = formatDateToYYYYMMDD(date);
      const data = await chrome.storage.local.get({
        [key]: null,
      });
      if (data[key] === null) {
        // If no price on the date, use the previous date
        date = new Date(date.setDate(date.getDate() - 1));
      }
      price = data[key];
      i++;
    } while (price === null && i <= maxIterations);

    if (price === null) {
      return NaN;
    }

    return price;
  }

  /**
   * @param {Date} date
   * @returns {string} Date formatted in YYYY-MM-DD (UTC timezone)
   */
  function formatDateToYYYYMMDD(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Months are zero-based, so we add 1
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   *
   * @param {string} selector
   * @param {number} timeoutMs
   * @returns {Promise<void>}
   */
  function waitForNode(selector, timeoutMs = 1000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(`timed out waiting for node ${selector}`);
      }, timeoutMs);

      if (document.querySelector(selector) !== null) {
        resolve(undefined);
      }

      const observer = new MutationObserver((mutationList, observer) => {
        for (const mutation of mutationList) {
          if (
            mutation.type === "childList" &&
            mutation.addedNodes.length > 0 &&
            document.querySelector(selector) !== null
          ) {
            clearTimeout(timeout);
            observer.disconnect();
            resolve(undefined);
          }
        }
      });

      observer.observe(document.querySelector("body"), {
        childList: true,
        subtree: true,
      });
    });
  }

  /**
   * Converts all ringgit price tags in a string to satoshis.
   * @param {string} str
   * @param {number} satsPerRinggit
   * @returns {string}
   */
  function toSats(str, satsPerRinggit) {
    const numberFormatter = new Intl.NumberFormat("en-US");
    const regex = /(-)?RM(\d{1,3}(,\d{3})*(\.\d{2})?)/g;
    return str.replaceAll(regex, (_match, _g1, price) => {
      const priceWithoutComma = price.replace(/,/g, "");
      const priceFloat = parseFloat(priceWithoutComma);
      return `${numberFormatter.format(
        Math.floor(priceFloat * satsPerRinggit)
      )} sats`;
    });
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  chrome.runtime.onMessage.addListener((message) => {
    switch (message) {
      case "user-purchase-page":
        userPurchasePage();
        break;
      case "order-page":
        orderPage();
        break;
      case "product-page":
        productPage();
        break;
      case "search-results-page":
      case "category-results-page":
        searchResultsPage();
        break;
    }
  });
})();
