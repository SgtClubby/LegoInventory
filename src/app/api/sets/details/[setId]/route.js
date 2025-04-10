// src/app/api/sets/details/[setId]/route.js

export async function GET(req, { params }) {
  const { setId } = await params;
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/sets/${setId}/`,
    {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    }
  );

  if (!res.ok) {
    Response.json({ error: "Failed to fetch set content!" });
  }

  const data = await res.json();
  return Response.json(data);
}
