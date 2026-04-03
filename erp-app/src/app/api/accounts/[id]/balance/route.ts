/**
 * GET /api/accounts/[id]/balance — Get live balance for an account
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAccountBalance } from '@/lib/ledger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const asOfParam = searchParams.get('asOf');
    const asOf = asOfParam ? new Date(asOfParam) : undefined;

    const balance = await getAccountBalance(id, asOf);

    return NextResponse.json({ success: true, data: balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`GET /api/accounts/[id]/balance error:`, message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 404 }
    );
  }
}
