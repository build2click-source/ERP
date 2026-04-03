/**
 * POST /api/snapshots/generate — Trigger month-end snapshot generation
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateMonthEndSnapshots } from '@/lib/ledger';
import { z } from 'zod';

const GenerateSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month } = GenerateSchema.parse(body);

    const count = await generateMonthEndSnapshots(year, month);

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        snapshotsGenerated: count,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('POST /api/snapshots/generate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate snapshots' },
      { status: 500 }
    );
  }
}
