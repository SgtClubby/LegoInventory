// src/app/lib/Mongo/Mongo.js

import mongoose from "mongoose";

if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
  throw new Error(
    "Correctly define the MONGODB_URI and DB environment variable inside .env"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
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
