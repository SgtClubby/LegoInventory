// src/app/api/image/[pieceId]/[colorId]/route.js

export async function GET(_req, { params }) {
  const { pieceId, colorId } = await params;
  const result = await fetchImageFromRebrickable(pieceId, colorId);
  if (result.status === 404 || !result?.part_img_url) {
    console.error(
      `Image not found for pieceId ${pieceId} and colorId ${colorId}`
    );
    return Response.json({ part_img_url: null }, { status: 500 });
  }

  return Response.json({ part_img_url: result?.part_img_url }, { status: 200 });
}

export async function fetchImageFromRebrickable(pieceId, colorId) {
  const url = `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors/${colorId}/`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });

    if (!res.ok) {
      return { status: res.status, part_img_url: null };
    }

    const data = await res.json();
    console.log("Fetched image data:", data);
    return { part_img_url: data?.part_img_url || null, status: res.status };
  } catch (err) {
    console.error(
      `Error fetching image for pieceId ${pieceId} and colorId ${colorId}:`,
      err
    );
    return { status: 500, part_img_url: null };
  }
}
