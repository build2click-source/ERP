/**
 * POST /api/inventory/receive — Receive stock into inventory (creates cost layer)
 * POST /api/inventory/issue   — Issue stock from inventory (FIFO/LIFO consumption)
 * GET  /api/inventory         — Get all stock positions
 */
import { NextRequest, NextResponse } from 'next/server';
import { receiveInventory, issueInventory, getAllStockPositions, InventoryError } from '@/lib/inventory';
import { z } from 'zod';

const ReceiveSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  qty: z.number().positive('Quantity must be positive'),
  unitCost: z.number().min(0, 'Unit cost cannot be negative'),
  description: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});

const IssueSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  qty: z.number().positive('Quantity must be positive'),
  costingMethod: z.enum(['FIFO', 'LIFO']).default('FIFO'),
  description: z.string().optional(),
  createdBy: z.string().uuid().optional(),
  cogsAccountId: z.string().uuid(),
  inventoryAccountId: z.string().uuid(),
});

// GET — All stock positions
export async function GET() {
  try {
    const positions = await getAllStockPositions();
    return NextResponse.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock positions' },
      { status: 500 }
    );
  }
}

// POST — Route to receive or issue based on `action` field
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'receive') {
      const parsed = ReceiveSchema.parse(body);
      const result = await receiveInventory(parsed);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (action === 'issue') {
      const parsed = IssueSchema.parse(body);
      const result = await issueInventory(parsed);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "receive" or "issue".' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof InventoryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      );
    }
    console.error('POST /api/inventory error:', error);
    return NextResponse.json(
      { success: false, error: 'Inventory operation failed' },
      { status: 500 }
    );
  }
}
