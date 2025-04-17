// src/app/api/minifig/[minifigId]/route.js

import { MinifigMetadata } from "@/lib/Mongo/Schema";
import { getPrice } from "@/lib/Pieces/Price/getBricklinkPrice";

import dbConnect from "@/lib/Mongo/Mongo";

export async function GET(req, { params }) {
  await dbConnect();

  const minifigId = (await params)?.minifigId;

  // Check if the minifigId is already in the database
  const existingMinifig = await MinifigMetadata.findOne({
    minifigId,
  });

  // 7 days cache expiration
  const cacheExpireData = Date.now() + 7 * 24 * 60 * 60 * 1000;

  if (existingMinifig && existingMinifig.createdAt < cacheExpireData) {
    // Return the existing minifig data
    return Response.json(existingMinifig, {
      status: 200,
    });
  }

  const minifigData = await getMinifigDetails(minifigId);
  const priceData = await getPrice(minifigData.minifigId);

  if (!minifigData || !priceData) {
    return Response.json({ error: "No minifig found" }, { status: 404 });
  }

  // Save the minifig data to the database
  const response = await MinifigMetadata.create({
    minifigId: minifigData.minifigId,
    minifigIdInternal: minifigData.minifigIdInternal,
    minifigName: minifigData.minifigName,
    minifigImage: minifigData.minifigImage,
    priceData,
  });

  return Response.json(response, {
    status: 200,
  });
}

async function getMinifigDetails(minifigId) {
  const suggestUrl = `https://rebrickable.com/search/suggest/?q=${minifigId}`;
  const suggestRes = await fetch(suggestUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/json",
    },
  });

  if (!suggestRes.ok) throw new Error("Failed to fetch suggestion");

  const suggestData = await suggestRes.json();
  const rebrickableId = suggestData[0]?.id;

  if (!rebrickableId) return null;

  const detailsRes = await fetch(
    `https://rebrickable.com/api/v3/lego/minifigs/${rebrickableId}/`,
    {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent":
          "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
      },
    }
  );

  if (!detailsRes.ok) throw new Error("Failed to fetch minifig details");

  const details = await detailsRes.json();

  return {
    minifigId,
    minifigIdInternal: details.set_num,
    minifigName: details.name,
    minifigImage: details.set_img_url,
  };
}
