// src/app/lib/Mongo/Schema.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const brickMetadataSchema = new Schema(
  {
    elementId: { type: String, required: true, unique: true, index: true },
    elementName: { type: String, required: true },
    availableColors: [
      {
        colorId: { type: String, required: true },
        color: { type: String, required: true },
        elementImage: { type: String },
      },
    ],
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
    countComplete: { type: Boolean, default: false },
    tableId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, default: "default", index: true },
  },
  { timestamps: true }
);

// Create a compound index for faster querying
userBrickSchema.index({ tableId: 1, ownerId: 1, elementId: 1 });

const tableSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true, default: "default" },
  },
  { timestamps: true }
);

// Create a compound index for table lookup
tableSchema.index({ id: 1, ownerId: 1 }, { unique: true });

// Create the models
export const BrickMetadata =
  mongoose.models.BrickMetadata ||
  mongoose.model("BrickMetadata", brickMetadataSchema);
export const UserBrick =
  mongoose.models.UserBrick || mongoose.model("UserBrick", userBrickSchema);
export const Table =
  mongoose.models.Table || mongoose.model("Table", tableSchema);

// For backward compatibility during migration
export const Brick =
  mongoose.models.Brick || mongoose.model("Brick", userBrickSchema);
