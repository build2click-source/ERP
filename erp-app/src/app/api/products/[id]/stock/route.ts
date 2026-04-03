/**
 * GET /api/products/[id]/stock — Get stock position for a product
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStockPosition, InventoryError } from '@/lib/inventory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const position = await getStockPosition(id);

    return NextResponse.json({ success: true, data: position });
  } catch (error) {
    if (error instanceof InventoryError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    console.error('GET /api/products/[id]/stock error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get stock position' },
      { status: 500 }
    );
  }
}
