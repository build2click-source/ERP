/**
 * GET /api/gstin/[gstin] — Lookup GSTIN details from GST portal
 */
import { NextRequest, NextResponse } from 'next/server';
import { lookupGstin, GstinError } from '@/lib/gstin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gstin: string }> }
) {
  try {
    const { gstin } = await params;
    const details = await lookupGstin(gstin);

    return NextResponse.json({ success: true, data: details });
  } catch (error) {
    if (error instanceof GstinError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error('GET /api/gstin/[gstin] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to lookup GSTIN' },
      { status: 500 }
    );
  }
}
