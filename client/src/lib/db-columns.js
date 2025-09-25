// src/lib/db-columns.js

/** Supabase select string for `store_stock_levels` */
export const STORE_STOCK_LEVELS_SELECT =
  'id,store_id,stock_item_id,quantity,last_updated,updated_by,threshold';

/** Column list (handy for validation, projections, CSV, etc.) */
export const STORE_STOCK_LEVELS_COLUMNS = [
  'id',
  'store_id',
  'stock_item_id',
  'quantity',
  'last_updated',
  'updated_by',
  'threshold',
];

/** Table name (avoid stringly-typed literals all over the codebase) */
export const STORE_STOCK_LEVELS_TABLE = 'store_stock_levels';

/** Default/empty row shape for forms or optimistic inserts */
export const EMPTY_STORE_STOCK_LEVEL = {
  id: null,
  store_id: null,
  stock_item_id: null,
  quantity: null,
  last_updated: null,
  updated_by: null,
  threshold: null,
};
