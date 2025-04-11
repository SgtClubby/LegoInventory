// src/app/api/part/[pieceId]/colors/route.js

import { ColorCache } from "@/lib/Mongo/Schema";

export async function GET(req, { params }) {
  const { pieceId } = await params;

  const cache = await ColorCache.findOne(
    {
      elementId: { $eq: pieceId },
    },
    {
      _id: 0,
      createdAt: 0,
      __v: 0,
    }
  );

  if (cache) {
    const isAvailableColorMalformed = cache.availableColors.some(
      (color) =>
        !color?.colorId ||
        !color?.color ||
        (color?.colorId === undefined && color?.color === undefined)
    );

    if (!isAvailableColorMalformed) {
      console.log("HIT! Cache found for pieceId:", pieceId);
      return Response.json(cache.availableColors);
    }
  }

  const res = await fetch(
    `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors/`,
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
  data.results = data.results.map((item) => {
    return {
      colorId: item.color_id,
      color: item.color_name,
    };
  });

  console.log("Data fetched from Rebrickable:", data.results);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const thething = await ColorCache.updateOne(
    { elementId: pieceId },
    {
      elementId: pieceId,
      availableColors: data.results.map((result) => ({
        colorId: result.color_id,
        color: result.color_name,
      })),
    },
    { upsert: true, new: true }
  );
  console.log(thething);
  console.log("MISS! Cache created for pieceId:", pieceId);

  return Response.json(data.results);
}
