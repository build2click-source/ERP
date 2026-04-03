import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { postReceipt, postPayment, CreateReceiptInput, CreatePaymentInput } from '@/lib/banking';
import { z } from 'zod';

const SettlementSchema = z.object({
  type: z.enum(['receipt', 'payment']),
  clientId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  date: z.string(),
  amount: z.number().positive(),
  paymentMode: z.enum(['UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Cash']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  // For simplicity from UI, we need the Ledger accounts
  ledgerAccountId: z.string().uuid('AR or AP Ledger Account ID is required'),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    let dbRecords: any[] = [];
    
    if (!type || type === 'receipt') {
      const receipts = await prisma.receipt.findMany({
        include: { client: true, bankAccount: true },
        orderBy: { date: 'desc' }
      });
      dbRecords = [...dbRecords, ...receipts.map(r => ({ ...r, documentType: 'Receipt', recordId: `RCT-${r.receiptNumber}` }))];
    }
    
    if (!type || type === 'payment') {
      const payments = await prisma.payment.findMany({
        include: { client: true, bankAccount: true },
        orderBy: { date: 'desc' }
      });
      dbRecords = [...dbRecords, ...payments.map(p => ({ ...p, documentType: 'Payment', recordId: `PAY-${p.paymentNumber}` }))];
    }
    
    // Transform to match ReceiptsView mock standard
    const formatted = dbRecords.map(doc => ({
      id: doc.recordId,
      date: doc.date.toISOString().split('T')[0],
      client: doc.client.name,
      type: doc.documentType,
      amount: doc.amount,
      mode: doc.paymentMode,
      reference: doc.referenceNumber || '-',
      status: doc.status.charAt(0).toUpperCase() + doc.status.slice(1),
    }));

    // Sort combined by date descending
    formatted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = SettlementSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', issues: result.error.issues }, { status: 400 });
    }

    const data = result.data;
    let postedResult;

    if (data.type === 'receipt') {
      const input: CreateReceiptInput = {
        clientId: data.clientId,
        bankAccountId: data.bankAccountId,
        date: data.date,
        amount: data.amount,
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        arAccountId: data.ledgerAccountId,
        createdBy: undefined, // Add auth later
      };
      postedResult = await postReceipt(input);
    } else {
      const input: CreatePaymentInput = {
        clientId: data.clientId,
        bankAccountId: data.bankAccountId,
        date: data.date,
        amount: data.amount,
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        apAccountId: data.ledgerAccountId,
        createdBy: undefined,
      };
      postedResult = await postPayment(input);
    }

    return NextResponse.json(postedResult, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
