/**
 * INVENTORY ENGINE — FIFO/LIFO Cost Layer Consumption
 * 
 * Business Rules (from PRD §5):
 * - On receipt: create a new cost_layer with qty + unit_cost
 * - On issue: consume cost_layers in chronological order (FIFO) or reverse (LIFO)
 * - Reduce remaining_qty and record consumed layer IDs on invoice lines
 * - Creates corresponding inventory_movement records
 * - Auto-posts ledger entries: Dr COGS / Cr Inventory Asset
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createTransaction, type JournalLine } from '@/lib/ledger';

export type CostingMethod = 'FIFO' | 'LIFO';

// ============================================================
// TYPES
// ============================================================

export interface ReceiveInput {
  productId: string;
  warehouseId?: string;
  qty: number;
  unitCost: number;
  description?: string;
  createdBy?: string;
}

export interface IssueInput {
  productId: string;
  warehouseId?: string;
  qty: number;
  costingMethod: CostingMethod;
  description?: string;
  createdBy?: string;
  /** Account IDs for auto-posting */
  cogsAccountId: string;
  inventoryAccountId: string;
}

export interface ConsumedLayer {
  costLayerId: string;
  qtyConsumed: number;
  unitCost: number;
  totalCost: number;
}

export interface IssueResult {
  movementId: string;
  transactionId: string;
  consumedLayers: ConsumedLayer[];
  totalCost: number;
  totalQtyIssued: number;
}

// ============================================================
// RECEIVE INVENTORY — creates a new cost layer
// ============================================================

export async function receiveInventory(input: ReceiveInput): Promise<{
  movementId: string;
  costLayerId: string;
}> {
  if (input.qty <= 0) {
    throw new InventoryError('Receive quantity must be positive');
  }
  if (input.unitCost < 0) {
    throw new InventoryError('Unit cost cannot be negative');
  }

  // Verify product exists and is stocked
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, isStocked: true, name: true },
  });

  if (!product) {
    throw new InventoryError(`Product ${input.productId} not found`);
  }
  if (!product.isStocked) {
    throw new InventoryError(`Product "${product.name}" is a service item and cannot be stocked`);
  }

  const costLayerId = uuidv4();
  const movementId = uuidv4();

  await prisma.$transaction(async (tx) => {
    // Create cost layer
    await tx.costLayer.create({
      data: {
        id: costLayerId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        qty: new Prisma.Decimal(input.qty),
        unitCost: new Prisma.Decimal(input.unitCost),
        remainingQty: new Prisma.Decimal(input.qty),
      },
    });

    // Create inventory movement
    await tx.inventoryMovement.create({
      data: {
        id: movementId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        movementType: 'receipt',
        qty: new Prisma.Decimal(input.qty),
        unitCost: new Prisma.Decimal(input.unitCost),
      },
    });
  });

  return { movementId, costLayerId };
}

// ============================================================
// ISSUE INVENTORY — consumes cost layers via FIFO or LIFO
// ============================================================

export async function issueInventory(input: IssueInput): Promise<IssueResult> {
  if (input.qty <= 0) {
    throw new InventoryError('Issue quantity must be positive');
  }

  // Verify product
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, isStocked: true, name: true },
  });

  if (!product) {
    throw new InventoryError(`Product ${input.productId} not found`);
  }
  if (!product.isStocked) {
    throw new InventoryError(`Product "${product.name}" is a service item`);
  }

  // Fetch available cost layers in FIFO or LIFO order
  const layers = await prisma.costLayer.findMany({
    where: {
      productId: input.productId,
      warehouseId: input.warehouseId ?? undefined,
      remainingQty: { gt: 0 },
    },
    orderBy: {
      receivedAt: input.costingMethod === 'FIFO' ? 'asc' : 'desc',
    },
  });

  // Check total available
  const totalAvailable = layers.reduce(
    (sum, layer) => sum + Number(layer.remainingQty),
    0
  );

  if (totalAvailable < input.qty) {
    throw new InventoryError(
      `Insufficient stock for "${product.name}". ` +
      `Requested: ${input.qty}, Available: ${totalAvailable.toFixed(4)}`
    );
  }

  // Consume layers
  let remainingToIssue = input.qty;
  const consumedLayers: ConsumedLayer[] = [];
  const layerUpdates: Array<{ id: string; newRemaining: number }> = [];

  for (const layer of layers) {
    if (remainingToIssue <= 0) break;

    const available = Number(layer.remainingQty);
    const consume = Math.min(available, remainingToIssue);

    consumedLayers.push({
      costLayerId: layer.id,
      qtyConsumed: consume,
      unitCost: Number(layer.unitCost),
      totalCost: consume * Number(layer.unitCost),
    });

    layerUpdates.push({
      id: layer.id,
      newRemaining: available - consume,
    });

    remainingToIssue -= consume;
  }

  const totalCost = consumedLayers.reduce((sum, cl) => sum + cl.totalCost, 0);
  const totalQtyIssued = consumedLayers.reduce((sum, cl) => sum + cl.qtyConsumed, 0);
  const movementId = uuidv4();

  // Atomic: update layers + create movement + post ledger
  await prisma.$transaction(async (tx) => {
    // Update cost layers
    for (const update of layerUpdates) {
      await tx.costLayer.update({
        where: { id: update.id },
        data: { remainingQty: new Prisma.Decimal(update.newRemaining) },
      });
    }

    // Create inventory movement
    await tx.inventoryMovement.create({
      data: {
        id: movementId,
        productId: input.productId,
        warehouseId: input.warehouseId,
        movementType: 'issue',
        qty: new Prisma.Decimal(-totalQtyIssued), // Negative for issue
        unitCost: totalCost > 0 ? new Prisma.Decimal(totalCost / totalQtyIssued) : undefined,
      },
    });
  });

  // Auto-post COGS journal entry: Dr COGS / Cr Inventory Asset
  const lines: JournalLine[] = [
    {
      accountId: input.cogsAccountId,
      amount: totalCost, // Debit
      entryType: 'Dr',
    },
    {
      accountId: input.inventoryAccountId,
      amount: -totalCost, // Credit
      entryType: 'Cr',
    },
  ];

  const txResult = await createTransaction({
    description: input.description || `Inventory issue: ${product.name} x${totalQtyIssued}`,
    createdBy: input.createdBy,
    metadata: {
      type: 'inventory_issue',
      productId: input.productId,
      movementId,
      consumedLayers: consumedLayers.map((cl) => cl.costLayerId),
      costingMethod: input.costingMethod,
    },
    lines,
    postImmediately: true,
  });

  return {
    movementId,
    transactionId: txResult.transactionId,
    consumedLayers,
    totalCost,
    totalQtyIssued,
  };
}

// ============================================================
// STOCK QUERIES
// ============================================================

export interface StockPosition {
  productId: string;
  productName: string;
  sku: string;
  totalOnHand: number;
  weightedAvgCost: number;
  totalValue: number;
  layerCount: number;
}

/**
 * Get current stock position for a product.
 */
export async function getStockPosition(productId: string): Promise<StockPosition> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sku: true },
  });

  if (!product) {
    throw new InventoryError(`Product ${productId} not found`);
  }

  const layers = await prisma.costLayer.findMany({
    where: {
      productId,
      remainingQty: { gt: 0 },
    },
  });

  const totalOnHand = layers.reduce((sum, l) => sum + Number(l.remainingQty), 0);
  const totalValue = layers.reduce(
    (sum, l) => sum + Number(l.remainingQty) * Number(l.unitCost),
    0
  );

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    totalOnHand,
    weightedAvgCost: totalOnHand > 0 ? totalValue / totalOnHand : 0,
    totalValue,
    layerCount: layers.length,
  };
}

/**
 * Get stock positions for all stocked products.
 */
export async function getAllStockPositions(): Promise<StockPosition[]> {
  const products = await prisma.product.findMany({
    where: { isStocked: true },
    select: { id: true },
    orderBy: { name: 'asc' },
  });

  const positions = await Promise.all(
    products.map((p) => getStockPosition(p.id))
  );

  return positions;
}

// ============================================================
// CUSTOM ERROR
// ============================================================

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}
