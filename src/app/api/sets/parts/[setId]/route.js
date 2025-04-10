// src/app/api/sets/parts/[setId]/route.js

export async function GET(req, { params }) {
  const { setId } = await params;
  const results = await fetchAllSetParts(
    `https://rebrickable.com/api/v3/lego/sets/${setId}/parts?page_size=1000`
  );
  return Response.json({ results });
}

async function fetchAllSetParts(url) {
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

    if (data.error) {
      throw new Error("Failed to fetch set data!");
    }

    // If data.results isn't an array, break out
    if (!Array.isArray(data.results)) break;

    // Filter out any undefined (or null) entries, or entries that have a is_spare value of true
    const validResults = data.results.filter((item) => {
      let isNotNull = item != null;
      let isNotUndefined = item != undefined;
      let isNotSpare = item.is_spare != true;

      return isNotNull && isNotUndefined && isNotSpare;
    });

    allResults = allResults.concat(validResults);

    currentUrl = data.next;
  }

  return allResults;
}
