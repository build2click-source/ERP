/**
 * POST /api/transactions/[id]/post — Post a draft transaction (make it immutable)
 */
import { NextRequest, NextResponse } from 'next/server';
import { postTransaction, PostingError } from '@/lib/ledger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postedAt = await postTransaction(id);

    return NextResponse.json({
      success: true,
      data: { transactionId: id, postedAt },
    });
  } catch (error) {
    if (error instanceof PostingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      );
    }
    console.error('POST /api/transactions/[id]/post error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post transaction' },
      { status: 500 }
    );
  }
}
