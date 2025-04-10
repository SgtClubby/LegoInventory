// src/app/api/part/colors/[pieceId]/route.js

// {
//   "count": 6,
//   "next": null,
//   "previous": null,
//   "results": [
//     {
//       "color_id": 0,
//       "color_name": "Black",
//       "num_sets": 2,
//       "num_set_parts": 2,
//       "part_img_url": "https://cdn.rebrickable.com/media/parts/elements/4550927.jpg",
//       "elements": [
//         "3037326",
//         "4550927"
//       ]
//     }
//  ]

export async function GET(req, { params }) {
  const { pieceId } = await params;
  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors/`,
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
    return {
      colorId: item.color_id,
      color: item.color_name,
    };
  });

  return Response.json(data);
}
