// src/app/lib/Pieces/Price/getBricklinkPrice.js
import { load } from "cheerio";

export async function getPrice(catalogId, colorId) {
  // Fetch the price data from BrickLink
  const url = `https://www.bricklink.com/catalogPG.asp?M=${catalogId}${
    colorId ? `&C=${colorId}` : ""
  }`;

  const minifigIdRes = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      "Content-Type": "application/json",
    },
  });

  const html = await minifigIdRes.text();
  const $ = load(html);

  let minPrice = null;
  let avgPrice = null;

  $("table.fv tr").each((_, row) => {
    const label = $(row).find("td").first().text().trim();
    const value = $(row).find("td b").text().trim();

    if (label.includes("Min Price")) minPrice = value;
    if (label.includes("Avg Price")) avgPrice = value;
  });

  return { minPrice, avgPrice };
}
