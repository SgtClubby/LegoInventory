// src/app/lib/Mongo/Schema.js

import mongoose, { Schema } from "mongoose";

const brickSchema = new Schema({
  uuid: String,
  elementName: String,
  elementImage: String,
  elementId: String,
  elementColor: String,
  elementColorId: String,
  availableColors: [
    {
      color: String,
      colorId: String,
    },
  ],
  elementQuantityOnHand: Number,
  elementQuantityRequired: Number,
  countComplete: Boolean,
  tableId: String,
  ownerId: { type: String, default: "default" },
});
brickSchema.index({ uuid: 1, tableId: 1, ownerId: 1 });

const tableSchema = new Schema({
  id: String,
  name: String,
  ownerId: { type: String, default: "default" },
});

const colorCacheSchema = new Schema({
  elementId: String,
  availableColors: [
    {
      colorId: String,
      color: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});
colorCacheSchema.index({ elementId: 1 });

// Only compile once (important for dev/hot-reload)
export const Brick =
  mongoose.models.Brick || mongoose.model("Brick", brickSchema);
export const Table =
  mongoose.models.Table || mongoose.model("Table", tableSchema);
export const ColorCache =
  mongoose.models.ColorCache || mongoose.model("ColorCache", colorCacheSchema);
