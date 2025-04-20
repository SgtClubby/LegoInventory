// src/app/api/search/[type]/[searchTerm]/route.js

export async function GET(req, { params }) {
  const { type, searchTerm } = await params;
  if (!searchTerm) {
    return Response.json({ error: "Missing search term!" });
  }

  if (type === "set") {
    return searchSet(searchTerm);
  }

  if (type === "part") {
    const data = await searchPart(searchTerm);
    const formattedResults = data.results.map((item) => {
      const fliteredNames = ["Duplo", "Modulex"];

      // Filter out items with names that contain any of the filtered names
      if (fliteredNames.some((name) => item.name.includes(name))) {
        return null;
      }

      return {
        elementId: item.part_num,
        elementName: item.name,
        elementImage: item.part_img_url,
      };
    });

    const filteredData = formattedResults.filter((item) => item != null);

    return Response.json(filteredData);
  }

  if (type === "minifig") {
    return searchMinifig(searchTerm);
  }

  return Response.json({ error: "Invalid type!" }, { status: 404 });
}

// Endpoint /api/search/[type]/[searchTerm]
async function searchSet(searchTerm) {
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/sets/?search=${searchTerm}`,
    {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent":
          "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
      },
    }
  );

  if (!res.ok) {
    Response.json({ error: "Failed to fetch!" });
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    return Response.json({
      results: [],
      note: "No sets found in search.",
    });
  }

  const filteredResults = data.results.map((item) => {
    return {
      setId: item.set_num,
      setName: item.name,
      setImage: item.set_img_url,
      setYear: item.year,
      setNumParts: item.num_parts,
    };
  });

  return Response.json(filteredResults);
}

// Endpoint /api/search/[type]/[searchTerm]
async function searchPart(searchTerm) {
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/parts/?search=${searchTerm}`,
    {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent":
          "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
      },
    }
  );

  if (!res.ok) {
    Response.json({ error: "Failed to fetch!" });
  }

  const data = await res.json();
  return data;
}

let activeSearchController = null;

// Endpoint /api/search/minifig/[searchTerm]
async function searchMinifig(searchTerm) {
  try {
    if (activeSearchController) {
      activeSearchController.abort(); // Kill the previous request
      activeSearchController = null; // Reset the controller
    }

    activeSearchController = new AbortController();
    const signal = activeSearchController.signal;

    const brickLinkIdRegex = /^[a-z]{2,4}\d{1,4}[a-z]?$/i;
    const rebrickableIdRegex = /^[a-z]{2,3}-\d{1,6}$/i;

    // First check if the query looks like a bricklink minifig ID (e.g., sw0001)
    const isBricklinkQuery = brickLinkIdRegex.test(searchTerm.trim());
    const isRebrickableQuery = rebrickableIdRegex.test(searchTerm.trim());

    if (isBricklinkQuery) {
      const suggestUrl = `https://rebrickable.com/search/suggest/?q=${searchTerm}`;
      const suggestRes = await fetch(suggestUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Content-Type": "application/json",
        },
      });

      if (!suggestRes.ok) throw new Error("Failed to fetch suggestion");

      const suggestData = await suggestRes.json();

      // Map returned IDs to check if they are valid rebrickable minifig IDs
      const searchedIds = suggestData
        .map((item) => item.id)
        .filter((id) => rebrickableIdRegex.test(id));

      if (!searchedIds.length) {
        return Response.json({
          results: [],
          note: "No minifigs found in search.",
        });
      }

      const MAX_BATCHES = 2;
      const BATCH_SIZE = 5;
      const DELAY_MS = 2000;

      function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      console.log("Searching for minifigs by ID:", searchedIds);
      try {
        const limitedIds = searchedIds.slice(0, MAX_BATCHES * BATCH_SIZE);
        const allResults = [];

        for (let batchIndex = 0; batchIndex < MAX_BATCHES; batchIndex++) {
          const batchStart = batchIndex * BATCH_SIZE;
          const batchIds = limitedIds.slice(
            batchStart,
            batchStart + BATCH_SIZE
          );

          if (batchIds.length === 0) break;

          const batchFetches = batchIds.map((id) =>
            fetch(
              `https://rebrickable.com/api/v3/lego/minifigs/${id.trim()}/`,
              {
                signal,
                headers: {
                  Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
                  "User-Agent":
                    "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
                },
              }
            ).then((res) => (res.ok ? res.json() : null))
          );

          const batchResults = await Promise.all(batchFetches);
          allResults.push(...batchResults.filter(Boolean));

          if (batchIndex < MAX_BATCHES - 1) {
            await delay(DELAY_MS); // Wait before the next batch
          }
        }

        const formattedResults = allResults.map((result) => {
          return {
            minifigIdRebrickable: result.set_num,
            minifigName: result.name,
            minifigImage: result.set_img_url,
          };
        });

        return Response.json({
          results: formattedResults,
          note:
            allResults.length === 0
              ? "No exact matches found. Try refining your search."
              : undefined,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Search aborted");
        } else {
          console.error("Error during batched minifig fetch:", err);
        }
        return Response.json({
          aborted: true,
          results: [],
          error: "An error occurred while searching for minifigs.",
        });
      }
    }

    // Standard search by name/term
    const res = await fetch(
      `https://rebrickable.com/api/v3/lego/minifigs/?search=${searchTerm}&ordering=-year&page_size=20`,
      {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
          "User-Agent":
            "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
        },
      }
    );

    if (!res.ok) {
      return Response.json(
        { error: "Failed to fetch minifigs" },
        { status: res.status }
      );
    }

    const allResults = await res.json();

    if (!allResults.results || allResults.results.length === 0) {
      return Response.json({
        results: [],
        note: "No minifigs found in search.",
      });
    }

    const formattedResults = allResults.results.map((result) => {
      return {
        minifigIdRebrickable: result.set_num,
        minifigName: result.name,
        minifigImage: result.set_img_url,
      };
    });

    return Response.json({
      results: formattedResults,
      note:
        allResults.length === 0
          ? "No exact matches found. Try refining your search."
          : undefined,
    });
  } catch (error) {
    console.error("Error searching for minifigs:", error);
    return Response.json(
      { error: "Failed to search for minifigs" },
      { status: 500 }
    );
  }
}
