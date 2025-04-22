// src/app/lib/Scripts/updateExpiredPrices.js

import dbConnect from "@/lib/Mongo/Mongo";
import { MinifigPriceMetadata, MinifigMetadata } from "@/lib/Mongo/Schema";
import priceHistoryService from "@/lib/Services/PriceHistoryService";
import externalApiService from "@/lib/API/ExternalApiService";
import config from "@/lib/Config/config";
import "dotenv/config";

/**
 * Script to check for expired price data and update it
 * This can be run as a scheduled task or cron job
 */
async function updateExpiredPrices() {
  try {
    console.log("Starting price update check...");
    await dbConnect();

    // Find all expired price data
    const now = new Date();
    const expiredPrices = await MinifigPriceMetadata.find(
      {
        $or: [{ expiresAt: { $lt: now } }, { isExpired: true }],
      },
      { minifigIdRebrickable: 1, _id: 0 }
    ).lean();

    if (expiredPrices.length === 0) {
      console.log("No expired price data found.");
      process.exit(0);
    }

    console.log(
      `Found ${expiredPrices.length} expired price entries to update.`
    );

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    const delay = 3000; // 3 seconds between batches

    for (let i = 0; i < expiredPrices.length; i += batchSize) {
      const batch = expiredPrices.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          expiredPrices.length / batchSize
        )}`
      );

      // Process each minifig in the batch
      const batchPromises = batch.map(async (item) => {
        try {
          const { minifigIdRebrickable } = item;

          // Get minifig metadata to find BrickLink ID
          const metadata = await MinifigMetadata.findOne(
            { minifigIdRebrickable },
            { minifigIdBricklink: 1, minifigName: 1, _id: 0 }
          ).lean();

          if (!metadata) {
            console.log(
              `No metadata found for ${minifigIdRebrickable}, skipping.`
            );
            return false;
          }

          // Archive current price data to history
          await priceHistoryService.archiveCurrentPriceData(
            minifigIdRebrickable
          );

          // Get BrickLink ID
          let bricklinkId = metadata.minifigIdBricklink;

          // If no BrickLink ID, try to find it
          if (!bricklinkId && metadata.minifigName) {
            bricklinkId = await externalApiService.findBricklinkIdForMinifig(
              minifigIdRebrickable,
              metadata.minifigName
            );
          }

          if (!bricklinkId) {
            console.log(
              `No BrickLink ID found for ${minifigIdRebrickable}, skipping.`
            );
            return false;
          }

          // Fetch new price data
          const newPriceData = await externalApiService.fetchMinifigPriceData(
            bricklinkId
          );

          if (!newPriceData) {
            console.log(
              `Failed to fetch price data for ${minifigIdRebrickable}, skipping.`
            );
            return false;
          }

          // Update price data
          await MinifigPriceMetadata.updateOne(
            { minifigIdRebrickable },
            {
              $set: {
                priceData: newPriceData,
                isExpired: false,
                expiresAt: new Date(Date.now() + config.cacheExpiry.price),
              },
            },
            { upsert: true }
          );

          console.log(`Updated price data for ${minifigIdRebrickable}`);
          return true;
        } catch (error) {
          console.error(
            `Error updating price for ${item.minifigIdRebrickable}:`,
            error
          );
          return false;
        }
      });

      const results = await Promise.all(batchPromises);
      const successCount = results.filter(Boolean).length;
      console.log(
        `Batch completed: ${successCount}/${batch.length} successful updates.`
      );

      // Add delay between batches
      if (i + batchSize < expiredPrices.length) {
        console.log(`Waiting ${delay / 1000} seconds before next batch@/lib.`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.log("Price update check completed.");
    process.exit(0);
  } catch (error) {
    console.error("Error in updateExpiredPrices script:", error);
    process.exit(1);
  }
}
updateExpiredPrices();
