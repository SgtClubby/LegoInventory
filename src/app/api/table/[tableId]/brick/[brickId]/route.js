import dbConnect from "@/lib/Mongo/Mongo";
import { Brick } from "@/lib/Mongo/Schema";

export async function DELETE(req, { params }) {
  await dbConnect();

  const userId = req.headers.get("userId") || "default";
  const { tableId, brickId: uuid } = await params;

  try {
    await Brick.deleteOne({ uuid, tableId, ownerId: userId });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: "Failed to delete bricks" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  await dbConnect();

  const userId = req.headers.get("userId") || "default";
  const { brickId: uuid, tableId } = await params;
  const body = await req.json();
  console.log(body);

  if (!tableId) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  if (!uuid) {
    return Response.json({ error: "Missing brick ID" }, { status: 400 });
  }

  if (!body) {
    return Response.json({ error: "Missing body" }, { status: 400 });
  }

  try {
    await Brick.updateOne({ uuid, tableId, ownerId: userId }, { $set: body });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: "Failed to update bricks" }, { status: 500 });
  }
}
