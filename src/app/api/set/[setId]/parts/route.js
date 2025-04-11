// src/app/api/set/[setId]/parts/route.js

export async function GET(req, { params }) {
  const { setId } = await params;

  // Fetch basic set parts first (without colors)
  const results = await fetchBasicSetParts(
    `https://rebrickable.com/api/v3/lego/sets/${setId}/parts?page_size=1000`
  );

  return Response.json({ results });
}

async function fetchBasicSetParts(url) {
  // Similar to your current fetchAllSetParts but without color fetching
  let allResults = [];
  let currentUrl = url;

  while (currentUrl) {
    const res = await fetch(currentUrl, {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });

    const data = await res.json();
    if (data.error) throw new Error("Failed to fetch set data!");
    if (!Array.isArray(data.results)) break;

    const validResults = data.results.filter(
      (item) => item != null && item != undefined && item.is_spare != true
    );

    allResults = allResults.concat(validResults);
    currentUrl = data.next;
  }

  return allResults;
}
