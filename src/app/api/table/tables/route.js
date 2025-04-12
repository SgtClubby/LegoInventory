// src/app/api/table/tables/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { UserBrick, Table } from "@/lib/Mongo/Schema";

/**
 * GET all tables for a user
 *
 * @param {Request} req - The request object
 * @returns {Response} JSON response with tables data
 */
export async function GET(req) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";

  try {
    const tables = await Table.find({ ownerId });

    // Create a default table if none exist
    if (tables.length === 0) {
      await Table.create({
        id: "1",
        name: "Main",
        ownerId,
      });
      return Response.json([{ id: "1", name: "Main" }]);
    }

    const data = tables.map((table) => ({
      id: table.id,
      name: table.name,
    }));
    
    return Response.json(data);
  } catch (e) {
    console.error("Error fetching tables:", e);
    return Response.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

/**
 * POST a new table for a user
 *
 * @param {Request} req - The request object
 * @returns {Response} JSON response with new table data
 */
export async function POST(req) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { name } = await req.json();

  if (!name) {
    return Response.json({ error: "Missing table name" }, { status: 400 });
  }

  try {
    // Find the table with the highest ID for this user
    const lastTable = await Table.findOne({ ownerId }).sort({ id: -1 });
    const newId = lastTable ? parseInt(lastTable.id) + 1 : 1;

    // Create new table
    const newTable = new Table({
      id: newId.toString(),
      name,
      ownerId,
    });

    await newTable.save();
    return Response.json({ id: newId.toString(), name });
  } catch (e) {
    console.error("Error creating table:", e);
    return Response.json({ error: "Failed to create table" }, { status: 500 });
  }
}

/**
 * DELETE a table and all associated user bricks
 *
 * @param {Request} req - The request object
 * @returns {Response} JSON response indicating success or failure
 */
export async function DELETE(req) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { id } = await req.json();

  if (!id) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  try {
    // Delete the table and all user bricks associated with it
    await Promise.all([
      Table.deleteOne({ id, ownerId }),
      UserBrick.deleteMany({ tableId: id, ownerId }),
    ]);

    return Response.json({ success: true });
  } catch (e) {
    console.error("Error deleting table:", e);
    return Response.json({ error: "Failed to delete table" }, { status: 500 });
  }
}
