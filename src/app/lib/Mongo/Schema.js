// src/app/lib/Mongo/Schema.js
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import config from "@/lib/Config/config";

const { Schema } = mongoose;

/**
 * Available color schema for brick metadata
 */
const colorSchema = new Schema(
  {
    colorId: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    elementImage: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/**
 * Price data schema for minifigs
 */
const priceDataSchema = new Schema(
  {
    avgPriceNew: { type: Number, default: null },
    maxPriceNew: { type: Number, default: null },
    minPriceNew: { type: Number, default: null },
    avgPriceUsed: { type: Number, default: null },
    maxPriceUsed: { type: Number, default: null },
    minPriceUsed: { type: Number, default: null },
    currencyCode: { type: String, default: "USD", trim: true },
    currencySymbol: { type: String, default: "$", trim: true },
  },
  { _id: false }
);

/**
 * Schema for storing brick/part metadata
 * This data is shared across users and tables
 */
const brickMetadataSchema = new Schema(
  {
    elementId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    elementName: {
      type: String,
      required: true,
      trim: true,
    },
    invalid: {
      type: Boolean,
      default: false,
    },
    cacheIncomplete: {
      type: Boolean,
      default: false,
    },
    availableColors: [colorSchema],

    // Automatic expiration for cache data
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + config.cacheExpiry.brick), // Default: 30 days
      expires: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

/**
 * Schema for storing minifig metadata
 * This data is shared across users and tables
 */
const minifigMetadataSchema = new Schema(
  {
    minifigIdRebrickable: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    minifigName: {
      type: String,
      required: true,
      trim: true,
    },
    minifigIdBricklink: {
      type: String,
      trim: true,
    },
    minifigImage: {
      type: String,
      required: true,
      trim: true,
    },

    // Automatic expiration for cache data
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + config.cacheExpiry.minifig), // Default: 7 days
      expires: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

/**
 * Schema for storing minifig price data
 * This data is shared across users and tables
 */
const minifigPriceSchema = new Schema(
  {
    minifigIdRebrickable: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    priceData: priceDataSchema,
    isExpired: {
      type: Boolean,
      default: false,
    },
    // We don't use TTL index for automatic deletion
    // Instead we mark as expired and keep for historical data
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + config.cacheExpiry.price), // Default: 2 days
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

/**
 * Schema for storing historical minifig price data
 */
const minifigPriceHistorySchema = new Schema(
  {
    minifigIdRebrickable: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    priceData: priceDataSchema,
    // Automatically delete old price history after 5x the price cache expiry time
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + config.cacheExpiry.price * 5), // Default: 5x the price cache expiry time
      expires: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

/**
 * Schema for user-specific minifig data
 */
const userMinifigSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      default: () => uuidv4(),
      trim: true,
    },
    minifigIdRebrickable: {
      type: String,
      required: true,
      trim: true,
    },
    minifigIdBricklink: {
      type: String,
      trim: true,
    },
    minifigQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    highlighted: {
      type: Boolean,
      default: false,
    },
    tableId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      default: "default",
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

/**
 * Schema for user-specific brick/part data
 */
const userBrickSchema = new Schema(
  {
    uuid: {
      type: String,
      required: true,
      default: () => uuidv4(),
      trim: true,
    },
    elementId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    elementColorId: {
      type: String,
      required: true,
      trim: true,
    },
    elementColor: {
      type: String,
      required: true,
      trim: true,
    },
    elementQuantityOnHand: {
      type: Number,
      default: 0,
      min: 0,
    },
    elementQuantityRequired: {
      type: Number,
      default: 0,
      min: 0,
    },
    invalid: {
      type: Boolean,
      default: false,
    },
    countComplete: {
      type: Boolean,
      default: false,
    },
    highlighted: {
      type: Boolean,
      default: false,
    },
    tableId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      default: "default",
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

/**
 * Schema for table metadata
 */
const tableSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isMinifig: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    ownerId: {
      type: String,
      required: true,
      default: "default",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
  }
);

// Create compound indexes
userBrickSchema.index({ tableId: 1, ownerId: 1, elementId: 1 });
userMinifigSchema.index({ tableId: 1, ownerId: 1, minifigIdRebrickable: 1 });
tableSchema.index({ id: 1, ownerId: 1 }, { unique: true });

// Convert undefined values to null in Decimal128 fields
function decimalHandler(doc, ret) {
  if (ret.priceData) {
    Object.keys(ret.priceData).forEach((key) => {
      if (ret.priceData[key] === undefined) {
        ret.priceData[key] = null;
      }
      if (ret.priceData[key] && ret.priceData[key].toString) {
        ret.priceData[key] = parseFloat(ret.priceData[key].toString());
      }
    });
  }
  return ret;
}

minifigPriceSchema.set("toJSON", {
  transform: decimalHandler,
  getters: true,
});

// Export models
export const UserMinifig =
  mongoose.models.UserMinifig ||
  mongoose.model("UserMinifig", userMinifigSchema);
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
export const MinifigPriceMetadata =
  mongoose.models.MinifigPrice ||
  mongoose.model("MinifigPrice", minifigPriceSchema);
export const MinifigPriceHistory =
  mongoose.models.MinifigPriceHistory ||
  mongoose.model("MinifigPriceHistory", minifigPriceHistorySchema);
