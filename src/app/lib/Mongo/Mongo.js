// src/app/lib/Mongo/Mongo.js

import mongoose from "mongoose";

/**
 * Validates MongoDB environment variables and constructs the connection string
 *
 * @returns {string} MongoDB connection string
 */
function getConnectionString() {
  // Check required environment variables
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (!process.env.MONGODB_DB) {
    throw new Error("MONGODB_DB environment variable is not defined");
  }

  // Build connection string with optional params
  const uri = process.env.MONGODB_URI;
  const db = process.env.MONGODB_DB;
  const params = process.env.MONGODB_PARAMS || "";

  // Make sure the URI doesn't end with a slash if we're appending the DB name
  const baseUri = uri.endsWith("/") ? uri.slice(0, -1) : uri;

  return `${baseUri}/${db}${params}`;
}

// Create cache object if it doesn't exist
const cacheObj = { conn: null, promise: null };
if (!global.mongoose) {
  global.mongoose = cacheObj;
}
let cached = global.mongoose;

/**
 * Connects to MongoDB with enhanced error handling
 *
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
async function dbConnect() {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection attempt is already in progress, return that promise
  if (!cached.promise) {
    const connectionString = getConnectionString();

    console.log("Establishing new MongoDB connection...");

    // Set up connection with appropriate options
    cached.promise = mongoose
      .connect(connectionString, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then((mongoose) => {
        console.log("MongoDB connected successfully");

        // Set up connection event handlers
        mongoose.connection.on("error", (err) => {
          console.error("MongoDB connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
          console.warn("MongoDB disconnected");
        });

        mongoose.connection.on("reconnected", () => {
          console.info("MongoDB reconnected");
        });

        process.on("SIGINT", async () => {
          await mongoose.connection.close();
          console.log("MongoDB connection closed due to app termination");
          process.exit(0);
        });

        return mongoose;
      })
      .catch((err) => {
        console.error("MongoDB connection error:", err);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export default dbConnect;
