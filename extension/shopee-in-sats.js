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

    // Select all 'line item' elements
    const lineItemSelectors = [".Tfejtu", ".q6Gzj5", ".nW_6Oi"];
    const lineItems = lineItemSelectors.flatMap((selector) => {
      const nodeList = document.querySelectorAll(selector);
      return Array.from(nodeList);
    });

    /**@type {Element[]} */
    const elementsToConvert = new Array()
      .concat(lineItems)
      .concat(Array.from(orderPaidStepper.childNodes));

    // Convert each element's text content to satoshis
    for (const elem of elementsToConvert) {
      if (!elem.textContent) {
        continue;
      }
      elem.textContent = toSats(elem.textContent, satsPerRinggit);
    }
  }

  async function productPage() {
    await waitForNode(".G27FPf");

    const btcPrice = await getBTCPriceOnDate(new Date("2024-03-09"));
    const satsPerRinggit = Math.floor((1 / btcPrice) * 100_000_000);

    const selectors = [".G27FPf", ".qg2n76"];
    const elementsToConvert = selectors.flatMap((selector) => {
      const nodeList = document.querySelectorAll(selector);
      return Array.from(nodeList);
    });

    // Convert each element's text content to satoshis
    for (const elem of elementsToConvert) {
      if (!elem.textContent) {
        continue;
      }
      elem.textContent = toSats(elem.textContent, satsPerRinggit);
    }
  }

  /**
   * Returns the price of 1 bitcoin in ringgit on a certain date.
   * @param {Date} date
   * @returns {Promise<number>}
   */
  async function getBTCPriceOnDate(date) {
    const res = await fetch(
      // TODO: Configure the base URL
      `http://localhost:8787/${formatDateToYYYYMMDD(date)}`
    );
    const { open: price } = await res.json();
    return price;
  }

  /**
   * Converts all ringgit price tags to satoshis.
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
   * @param {Date} date
   * @returns {string} Date formatted in YYYY-MM-DD
   */
  function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based, so we add 1
    const day = String(date.getDate()).padStart(2, "0");
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

  browser.runtime.onMessage.addListener((message) => {
    console.log("got message: ", message);
    switch (message) {
      case "order-page":
        orderPage();
        break;
      case "product-page":
        productPage();
        break;
    }
  });
})();
