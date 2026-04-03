/**
 * Inventory Module — Public API
 */
export {
  receiveInventory,
  issueInventory,
  getStockPosition,
  getAllStockPositions,
  InventoryError,
  type ReceiveInput,
  type IssueInput,
  type IssueResult,
  type ConsumedLayer,
  type StockPosition,
  type CostingMethod,
} from './inventory-engine';
