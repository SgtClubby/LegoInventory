// src/app/api/table/tables/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { Brick, Table } from "@/lib/Mongo/Schema";

export async function GET(req) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";

  try {
    const Tables = await Table.find({ ownerId });

    if (Tables.length === 0) {
      Table.create({
        id: "1",
        name: "Main",
        ownerId,
      });
      return Response.json([{ id: "1", name: "Main" }]);
    }

    const data = Tables.map((table) => ({
      id: table.id,
      name: table.name,
    }));

    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Failed to fetch!" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";

  const { name } = await req.json();

  if (!name) {
    return Response.json({ error: "Missing table name!" }, { status: 400 });
  }

  // make new table based on name, increment id, and set ownerId, only ids are unique, the can have the same name
  try {
    const lastTable = await Table.findOne({ ownerId }).sort({
      id: -1,
    });
    const newId = lastTable ? parseInt(lastTable.id) + 1 : 1;

    const newTable = new Table({
      id: newId.toString(),
      name,
      ownerId,
    });

    await newTable.save();

    return Response.json({ id: newId.toString(), name });
  } catch (e) {
    return Response.json({ error: "Failed to create table!" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";

  const { id } = await req.json();

  if (!id) {
    return Response.json({ error: "Missing table id!" }, { status: 400 });
  }

  try {
    await Table.deleteOne({ id, ownerId });
    // Delete all bricks associated with this table
    await Brick.deleteMany({ tableId: id, ownerId });

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: "Failed to delete table!" }, { status: 500 });
  }
}
