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
//     },
//     {
//       "color_id": 7,
//       "color_name": "Light Gray",
//       "num_sets": 3,
//       "num_set_parts": 5,
//       "part_img_url": "https://cdn.rebrickable.com/media/parts/elements/4124491.jpg",
//       "elements": [
//         "4124491"
//       ]
//     },
//     {
//       "color_id": 8,
//       "color_name": "Dark Gray",
//       "num_sets": 4,
//       "num_set_parts": 8,
//       "part_img_url": "https://cdn.rebrickable.com/media/parts/elements/4124275.jpg",
//       "elements": [
//         "4124275"
//       ]
//     },
//     {
//       "color_id": 15,
//       "color_name": "White",
//       "num_sets": 1,
//       "num_set_parts": 1,
//       "part_img_url": "https://cdn.rebrickable.com/media/parts/elements/4578724.jpg",
//       "elements": [
//         "3037301",
//         "4578724"
//       ]
//     },
//     {
//       "color_id": 19,
//       "color_name": "Tan",
//       "num_sets": 3,
//       "num_set_parts": 3,
//       "part_img_url": "https://cdn.rebrickable.com/media/parts/elements/4143349.jpg",
//       "elements": [
//         "4143349",
//         "4221993"
//       ]
//     },
//     {
//       "color_id": 72,
//       "color_name": "Dark Bluish Gray",
//       "num_sets": 16,
//       "num_set_parts": 35,
//       "part_img_url": "https://cdn.rebrickable.com/media/parts/elements/4210640.jpg",
//       "elements": [
//         "4210640"
//       ]
//     }
//   ]
// }

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
    // Filter out items with names that contain any of the filtered names

    return {
      part_num: item.part_num,
      name: item.name,
      part_img_url: item.part_img_url,
    };
  });
  data.results = data.results.filter((item) => item != null);

  return Response.json(data);
}
