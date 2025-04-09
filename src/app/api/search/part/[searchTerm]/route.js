export async function GET(req, { params }) {
  const { searchTerm } = await params;
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/parts/?search=${searchTerm}`,
    {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    }
  );

  if (!res.ok) {
    Response.json({ error: "Failed to fetch!" });
  }

  const data = await res.json();

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
