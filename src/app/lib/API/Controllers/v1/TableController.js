// src/app/lib/API/Controllers/v1/TableController.js

import BaseController from "../BaseController";
import dbConnect from "@/lib/Mongo/Mongo";
import { Table, UserBrick, UserMinifig } from "@/lib/Mongo/Schema";

/**
 * Controller for managing tables
 */
class TableController extends BaseController {
  constructor() {
    super("TableController");
  }

  /**
   * Get all tables for a user
   *
   * @param {Request} req - The request object
   * @returns {Response} JSON response with tables data
   */
  async get(req) {
    await dbConnect();
    const ownerId = this.getOwnerId(req);

    try {
      const tables = await Table.find({ ownerId });

      // Check if we need to create default tables
      const hasMinifigTable = tables.some((table) => table.isMinifig);
      const hasMainTable = tables.some((table) => !table.isMinifig);

      let mainPieceTable;
      let mainMinifigTable;

      // Create default tables if needed
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

      // Return all tables including any newly created ones
      if (!hasMainTable || !hasMinifigTable) {
        return this.successResponse([
          ...(hasMainTable ? [] : [mainPieceTable]),
          ...(hasMinifigTable ? [] : [mainMinifigTable]),
          ...tables,
        ]);
      }

      // Format response data
      const data = tables.map((table) => ({
        id: table.id,
        name: table.name,
        description: table.description,
        isMinifig: table.isMinifig,
        ownerId: table.ownerId,
      }));

      return this.successResponse(data);
    } catch (e) {
      console.error("Error fetching tables:", e);
      return this.errorResponse("Failed to fetch tables", 500);
    }
  }

  /**
   * Create a new table
   *
   * @param {Request} req - The request object
   * @returns {Response} JSON response with the new table
   */
  async post(req) {
    await dbConnect();
    const ownerId = this.getOwnerId(req);
    const { name, description, isMinifig } = await req.json();

    if (!name) {
      return this.errorResponse("Missing table name", 400);
    }

    try {
      // Find the table with the highest ID for this user
      const tables = await Table.find({ ownerId });
      const newId =
        tables.length > 0
          ? Math.max(...tables.map((t) => Number(t.id))) + 1
          : 1;

      // Create new table
      const newTable = new Table({
        id: newId.toString(),
        name,
        description,
        isMinifig,
        ownerId,
      });

      await newTable.save();

      return this.successResponse(
        {
          id: newId.toString(),
          name,
          description,
          isMinifig,
        },
        "Table created successfully"
      );
    } catch (e) {
      console.error("Error creating table:", e);
      return this.errorResponse("Failed to create table", 500);
    }
  }

  /**
   * Delete a table and its contents
   *
   * @param {Request} req - The request object
   * @returns {Response} JSON response indicating success or failure
   */
  async delete(req) {
    await dbConnect();
    const ownerId = this.getOwnerId(req);

    const id = new URL(req.url).searchParams.get("id");
    const table = await Table.findOne({ id, ownerId });

    if (!table || !table.id) {
      return this.errorResponse("Table does not exist.", 404);
    }

    const isMinifig = table.isMinifig || false;

    try {
      await Table.deleteOne({ id, ownerId });

      if (isMinifig) {
        // If it's a minifig table, delete associated UserMinifig documents
        await UserMinifig.deleteMany({ tableId: id, ownerId });
      } else {
        // If it's a piece table, delete associated UserBrick documents
        await UserBrick.deleteMany({ tableId: id, ownerId });
      }

      return Response.json({ success: true });
    } catch (e) {
      console.error("Error deleting table:", e);
      return Response.json(
        { error: "Failed to delete table" },
        { status: 500 }
      );
    }
  }
}

export default new TableController();
