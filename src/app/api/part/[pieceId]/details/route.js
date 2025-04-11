// src/app/api/part/[pieceId]/details/route.js

export async function GET(req, { params }) {
  const { pieceId } = await params;
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/parts/${pieceId}`,
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

  return Response.json({
    partNum: data.part_num,
    name: data.name,
    partUrl: data.part_url,
    partImgUrl: data.part_img_url,
  });
}
