// src/app/api/set/background/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { Brick, ColorCache } from "@/lib/Mongo/Schema";

export async function POST(req) {
  await dbConnect();

  const { pieceIds, tableId, brickUuids, userId } = await req.json();

  console.log("Starting post-processing...");

  // check if the cache has the availableColors already
  // const cache = await ColorCache.findOne({
  //   "availableColors.elementId": { $in: pieceIds },
  // });

  // console.log("Cache:", cache);

  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < pieceIds.length; i += batchSize) {
    const batch = pieceIds.slice(i, i + batchSize);

    console.log(`Processing
    batch ${i / batchSize + 1} of ${Math.ceil(
      pieceIds.length / batchSize
    )}...`);

    const promises = batch.map(async (pieceId, index) => {
      try {
        const res = await fetch(
          `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors`,
          {
            headers: {
              Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
              "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
            },
          }
        );
        const data = await res.json();

        // Update the piece in the database
        await Brick.updateOne(
          { elementId: pieceId, tableId, ownerId: userId },
          {
            $set: {
              availableColors: data.results.map((result) => ({
                colorId: result.color_id,
                color: result.color_name,
              })),
            },
          }
        );

        // save for future fetches
        await ColorCache.create({
          availableColors: data.results.map((result) => ({
            colorId: result.color_id,
            color: result.color_name,
            elementId: pieceId,
          })),
        });
      } catch (error) {
        console.error(`Error fetching colors for piece ${pieceId}:`, error);
      }
    });

    await Promise.all(promises);

    // Add delay between batches
    if (i + batchSize < pieceIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  console.log("Post-processing complete.");
  return Response.json({ success: true });
}
