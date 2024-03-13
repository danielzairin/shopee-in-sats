(() => {
  if (window.hasRun === true) {
    return;
  }
  window.hasRun = true;

  async function orderPage() {
    await waitForNode('[aria-label^="order paid"');

    /**@type {Date | null} */
    let date = null;

    // Search the 'order paid' stepper element for a date
    const orderPaidStepper = document.querySelector(
      '[aria-label^="order paid"'
    );
    for (const elem of orderPaidStepper.childNodes) {
      if (!elem.textContent) {
        continue;
      }

      // Regex that matches DD-MM-YYYY
      const dateRegex = /(\d{2})-(\d{2})-(\d{4})/;
      const match = elem.textContent.match(dateRegex);
      if (match !== null) {
        const [day, month, year] = match[0].split("-").map(Number);
        date = new Date(year, month - 1, day);
        break;
      }
    }

    if (date === null) {
      console.error("failed to find a date");
      return;
    }

    const btcPrice = await getBTCPriceOnDate(date);
    const satsPerRinggit = Math.floor((1 / btcPrice) * 100_000_000);

    document.querySelectorAll(".Tfejtu, .q6Gzj5, .nW_6Oi").forEach((node) => {
      node.textContent = toSats(node.textContent, satsPerRinggit);
    });
  }

  async function productPage() {
    try {
      await waitForNode(".G27FPf");
      await waitForNode(".qg2n76", 300);
    } finally {
      const btcPrice = await getBTCPriceOnDate(new Date());
      const satsPerRinggit = Math.floor((1 / btcPrice) * 100_000_000);

      function convertPrices() {
        document.querySelectorAll(".G27FPf, .qg2n76").forEach((node) => {
          node.textContent = toSats(node.textContent, satsPerRinggit);
        });
      }

      convertPrices();

      const productVariantPicker = document.querySelector(".W5LiQM");
      const observeOptions = {
        characterData: true,
        childList: true,
        subtree: true,
        attribute: true,
      };

      // Update price tag when variant of product changes by observing the variant picker
      const observer = new MutationObserver(async (_mutationList, observer) => {
        observer.disconnect();
        await sleep(300);
        convertPrices();
        await sleep(300);
        observer.observe(productVariantPicker, observeOptions);
      });

      observer.observe(productVariantPicker, observeOptions);
    }
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
      document.querySelectorAll(".qmTjt-").forEach((node) => node.remove());
      document.querySelectorAll(".Q1tsgQ").forEach((node) => {
        if (node.textContent.includes("sats")) {
          return;
        }
        node.textContent = toSats(`RM${node.textContent}`, satsPerRinggit);
      });
      document.querySelectorAll(".FEGPgv").forEach((node) => {
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
      const data = await browser.storage.local.get({
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

  browser.runtime.onMessage.addListener((message) => {
    switch (message) {
      case "order-page":
        orderPage();
        break;
      case "product-page":
        productPage();
        break;
      case "search-results-page":
        searchResultsPage();
        break;
    }
  });
})();
