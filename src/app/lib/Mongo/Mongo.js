// src/app/lib/Mongo/Mongo.js

import mongoose from "mongoose";

if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
  throw new Error(
    "Correctly define the MONGODB_URI and DB environment variable inside .env"
  );
}

const MONGODB_CONNECTION_STRING =
  process.env.MONGODB_URI + process.env.MONGODB_DB + process.env.MONGODB_PARAMS;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("Connecting to MongoDB...");
    cached.promise = mongoose
      .connect(MONGODB_CONNECTION_STRING, {
        bufferCommands: false,
      })
      .then((mongoose) => {
        console.log("MongoDB connected");
        mongoose.connection.on("error", (err) => {
          console.error("MongoDB connection error:", err);
        });
        return mongoose;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
