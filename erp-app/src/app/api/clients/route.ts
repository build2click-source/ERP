/**
 * GET  /api/clients — List all clients
 * POST /api/clients — Create a new client (auto-writes to client_history)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// GET — List clients with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      include: {
        customerAccount: { select: { code: true, name: true } },
        vendorAccount: { select: { code: true, name: true } },
        _count: { select: { invoices: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: clients,
      count: clients.length,
    });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST — Create a new client
const CreateClientSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.enum(['Customer', 'Vendor', 'Both']),
  defaultPaymentTerms: z.string().optional(),
  gstin: z.string().length(15).optional(),
  placeOfSupply: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateClientSchema.parse(body);

    const clientId = uuidv4();

    const client = await prisma.$transaction(async (tx) => {
      // Create client
      const created = await tx.client.create({
        data: {
          id: clientId,
          code: parsed.code,
          name: parsed.name,
          type: parsed.type,
          defaultPaymentTerms: parsed.defaultPaymentTerms,
          gstin: parsed.gstin,
          placeOfSupply: parsed.placeOfSupply,
          status: 'active',
        },
      });

      // Auto-write to client_history
      await tx.clientHistory.create({
        data: {
          id: uuidv4(),
          clientId,
          changedBy: parsed.createdBy,
          changeType: 'created',
          payload: {
            code: parsed.code,
            name: parsed.name,
            type: parsed.type,
            gstin: parsed.gstin,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('POST /api/clients error:', error);

    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'A client with this code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
