function main() {
  /**@type {Date | null} */
  let date = null;

  // Search the 'order paid' stepper element for a date
  const orderPaidStepper = document.querySelector('[aria-label^="order paid"');
  for (const elem of orderPaidStepper.childNodes) {
    if (!elem.textContent) {
      continue;
    }

    const parsedDate = Date.parse(elem.textContent);
    if (!isNaN(parsedDate)) {
      date = parsedDate;
      break;
    }
  }

  if (date === null) {
    console.error("failed to find a date");
    return;
  }

  const btcPrice = getBTCPriceOnDate(date);
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

/**
 * Returns the price of 1 bitcoin in ringgit on a certain date.
 * @param {Date} date
 * @returns {number}
 */
function getBTCPriceOnDate(date) {
  // TODO: Get actual price from somewhere
  const price = date.valueOf() / 5_000_000;
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
  const regex = /(-)?RM(\d+(\.\d{2})?)/g;
  return str.replaceAll(regex, (_match, _g1, price) => {
    return `${numberFormatter.format(Math.floor(price * satsPerRinggit))} sats`;
  });
}

setTimeout(main, 1500);
