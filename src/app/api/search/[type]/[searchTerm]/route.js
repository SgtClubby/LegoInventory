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
    data.results = data.results.map((item) => {
      const fliteredNames = ["Duplo", "Modulex"];

      // Filter out items with names that contain any of the filtered names
      if (fliteredNames.some((name) => item.name.includes(name))) {
        return null;
      }

      return {
        part_num: item.part_num,
        name: item.name,
        part_img_url: item.part_img_url,
      };
    });
    data.results = data.results.filter((item) => item != null);

    return Response.json(data);
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
  return Response.json(data);
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
