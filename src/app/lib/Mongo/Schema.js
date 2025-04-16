// src/app/lib/Mongo/Schema.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const brickMetadataSchema = new Schema(
  {
    elementId: { type: String, required: true, unique: true, index: true },
    elementName: { type: String, required: true },
    invalid: { type: Boolean, default: false },
    cacheIncomplete: { type: Boolean, default: false },
    availableColors: [
      {
        colorId: { type: String, required: true },
        color: { type: String, required: true },
        elementImage: { type: String },
      },
    ],
  },
  { timestamps: true, expires: "30d" }
);

const minifigMetadataSchema = new Schema(
  {
    minifigId: { type: String, required: true },
    minifigIdInternal: { type: String, required: true },
    minifigName: { type: String, required: true },
    minifigImage: { type: String, required: true },
    priceData: {
      minPrice: { type: String, required: true },
      avgPrice: { type: String, required: true },
    },
    expireAt: {
      type: Date,
      // 7 days in second cache expiration
      expires: 604800,
    },
  },
  { timestamps: true }
);

const userMinifigSchema = new Schema(
  {
    uuid: { type: String, required: true },
    minifigId: { type: String, required: true, index: true },
    minifigQuantityOnHand: { type: Number, default: 0 },
    minifigQuantityRequired: { type: Number, default: 0 },
    countComplete: { type: Boolean, default: false },
    highlighted: { type: Boolean, default: false },
    tableId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, default: "default", index: true },
  },
  { timestamps: true }
);

const userBrickSchema = new Schema(
  {
    uuid: { type: String, required: true },
    elementId: { type: String, required: true, index: true },
    elementColorId: { type: String, required: true },
    elementColor: { type: String, required: true },
    elementQuantityOnHand: { type: Number, default: 0 },
    elementQuantityRequired: { type: Number, default: 0 },
    invalid: { type: Boolean, default: false },
    countComplete: { type: Boolean, default: false },
    highlighted: { type: Boolean, default: false },
    tableId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, default: "default", index: true },
  },
  { timestamps: true }
);

const tableSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    isMinifig: { type: Boolean, default: false },
    description: { type: String, default: "" },
    ownerId: { type: String, required: true, default: "default" },
  },
  { timestamps: true }
);

// Create a compound index for user brick querying
userBrickSchema.index({ tableId: 1, ownerId: 1, elementId: 1 });
// Create a compound index for user minifig lookup
userMinifigSchema.index({ tableId: 1, ownerId: 1, minifigId: 1 });
// Create a compound index for table lookup
tableSchema.index({ id: 1, ownerId: 1 }, { unique: true });

// Update models export to include UserMinifig
export const UserMinifig =
  mongoose.models.UserMinifig ||
  mongoose.model("UserMinifig", userMinifigSchema);

// Keep your other exports unchanged
export const BrickMetadata =
  mongoose.models.BrickMetadata ||
  mongoose.model("BrickMetadata", brickMetadataSchema);

export const UserBrick =
  mongoose.models.UserBrick || mongoose.model("UserBrick", userBrickSchema);

export const Table =
  mongoose.models.Table || mongoose.model("Table", tableSchema);

export const MinifigMetadata =
  mongoose.models.MinifigMetadata ||
  mongoose.model("MinifigMetadata", minifigMetadataSchema);
