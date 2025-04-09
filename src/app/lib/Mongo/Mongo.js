// src/app/lib/Mongo/Mongo.js

import mongoose from "mongoose";

if (!process.env.MONGODB_URI || !process.env.DATABASE) {
  throw new Error("Missing MongoDB connection string in env");
}

const MONGO_URL =
  process.env.MONGODB_URI + process.env.DATABASE + "authSource=admin";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URL, {
        bufferCommands: false,
      })
      .then((mongoose) => {
        return mongoose;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
