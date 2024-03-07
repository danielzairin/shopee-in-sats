function main() {
  const orderPaidStepper = document.querySelector('[aria-label^="order paid"');
  for (const node of orderPaidStepper.childNodes) {
    if (!node.textContent) {
      continue;
    }

    if (!isNaN(Date.parse(node.textContent))) {
      console.log(`TODO: Get BTC price @ ${new Date(node.textContent)}`);
      continue;
    }

    const currencyRegex = /(-)?RM\d+(\.\d{2})?/g;
    node.textContent = node.textContent.replaceAll(
      currencyRegex,
      "69,420 sats"
    );
  }

  const priceTagSelectors = [".Tfejtu", ".q6Gzj5", ".nW_6Oi"];
  const priceTags = priceTagSelectors.flatMap((selector) => {
    const nodeList = document.querySelectorAll(selector);
    return Array.from(nodeList);
  });

  for (const node of priceTags) {
    if (!node.textContent) {
      continue;
    }

    const currencyRegex = /(-)?RM\d+(\.\d{2})?/g;
    node.textContent = node.textContent.replaceAll(
      currencyRegex,
      "69,420 sats"
    );
  }
}

main();
