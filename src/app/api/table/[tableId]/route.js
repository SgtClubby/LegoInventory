// src/app/api/table/[tableId]/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { Brick } from "@/lib/Mongo/Schema";

export async function GET(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { tableId } = await params;

  if (!tableId) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  try {
    const bricks = await Brick.find(
      { tableId, ownerId },
      {
        __v: 0,
        _id: 0,
        updatedAt: 0,
      }
    );
    return Response.json(bricks);
  } catch (e) {
    return Response.json({ error: "Failed to fetch bricks" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { tableId } = await params;
  const body = await req.json();

  if (!tableId) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  // Assume body contains a single brick or array of bricks
  const bricks = Array.isArray(body) ? body : [body];

  try {
    const docs = bricks.map((b) => ({
      ...b,
      tableId,
      ownerId,
    }));

    await Brick.insertMany(docs);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: "Failed to save bricks" }, { status: 500 });
  }
}
