// src/app/api/table/tables/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { UserBrick, Table, UserMinifig } from "@/lib/Mongo/Schema";

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

    const hasMinifigTable = tables.some((table) => table.isMinifig);
    const hasMainTable = tables.some((table) => !table.isMinifig);

    let mainPieceTable;
    let mainMinifigTable;

    // Create a default table if none exist
    if (!hasMainTable) {
      mainPieceTable = new Table({
        id: "1",
        name: "Piece Table",
        description: "This is the default piece table.",
        isMinifig: false,
        ownerId,
      });
      await mainPieceTable.save();
    }
    if (!hasMinifigTable) {
      mainMinifigTable = new Table({
        id: "2",
        name: "Minifig Table",
        description: "This is the default minifig table.",
        isMinifig: true,
        ownerId,
      });
      await mainMinifigTable.save();
    }

    if (!hasMainTable || !hasMinifigTable) {
      return Response.json([
        ...(hasMainTable ? [] : [mainPieceTable]),
        ...(hasMinifigTable ? [] : [mainMinifigTable]),
      ]);
    }

    const data = tables.map((table) => ({
      id: table.id,
      name: table.name,
      description: table.description,
      isMinifig: table.isMinifig,
      ownerId: table.ownerId,
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
  const { name, description, isMinifig } = await req.json();

  if (!name) {
    return Response.json({ error: "Missing table name!" }, { status: 400 });
  }

  try {
    // Find the table with the highest ID for this user
    const tables = await Table.find({ ownerId });
    const newId =
      tables.length > 0 ? Math.max(...tables.map((t) => Number(t.id))) + 1 : 1;

    // Create new table
    const newTable = new Table({
      id: newId.toString(),
      name,
      description,
      isMinifig,
      ownerId,
    });

    await newTable.save();
    return Response.json({
      id: newId.toString(),
      name,
      description,
      isMinifig,
    });
  } catch (e) {
    console.error("Error creating table:", e);
    return Response.json(
      { error: "Server failed to create table." },
      { status: 500 }
    );
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
  const table = await req.json();

  if (!table) {
    return Response.json({ error: "Missing table entry!" }, { status: 400 });
  }

  // Destructuring table properties
  const { id, isMinifig } = table;

  try {
    Table.deleteOne({ id, ownerId });
    if (isMinifig) {
      // If it's a minifig table, delete associated UserMinifig documents
      UserMinifig.deleteMany({ tableId: id, ownerId });
    } else {
      // If it's a piece table, delete associated UserBrick documents
      UserBrick.deleteMany({ tableId: id, ownerId });
    }
    return Response.json({ success: true });
  } catch (e) {
    console.error("Error deleting table:", e);
    return Response.json({ error: "Failed to delete table" }, { status: 500 });
  }
}
