// src/app/api/set/background/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { Brick } from "@/lib/Mongo/Schema";

export async function POST(req) {
  await dbConnect();

  const { pieceIds, tableId, brickUuids, userId } = await req.json();

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < pieceIds.length; i += batchSize) {
    const batch = pieceIds.slice(i, i + batchSize);
    const batchUuids = brickUuids.slice(i, i + batchSize);

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
          { uuid: batchUuids[index], tableId, userId },
          { $set: { availableColors: data.results } }
        );
      } catch (error) {
        console.error(`Error fetching colors for piece ${pieceId}:`, error);
      }
    });

    await Promise.all(promises);

    // Add delay between batches
    if (i + batchSize < pieceIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return Response.json({ success: true });
}
