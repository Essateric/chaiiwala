import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function InventoryEditDialog({
  dialogOpen,
  setDialogOpen,
  editItem,
  setEditItem,
  handleSaveChanges,
  getStatusBadgeClass,
  getStatusText,
}) {
  if (!editItem) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update quantity and status for {editItem.product}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">SKU:</div>
            <div className="col-span-3 font-mono">{editItem.sku}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Product:</div>
            <div className="col-span-3 font-semibold">{editItem.product}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Price:</div>
            <div className="col-span-3">£{editItem.price?.toFixed(2)}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="stock" className="text-right text-sm font-medium col-span-1">Quantity:</label>
            <div className="col-span-3">
              <Input
                id="stock"
                type="number"
                className="col-span-3"
                value={editItem.stock}
                min={0}
                onChange={e => {
                  const qty = parseInt(e.target.value) || 0;
                  setEditItem({
                    ...editItem,
                    stock: qty,
                    status: getStatusText(qty)
                  });
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Daily Check:</div>
            <div className="col-span-3 flex items-center">
              <input
                type="checkbox"
                checked={!!editItem.daily_check}
                onChange={e => setEditItem({ ...editItem, daily_check: e.target.checked })}
                className="mr-2"
              />
              <span className="text-xs text-gray-600">Show on daily stock check list</span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Status:</div>
            <div className="col-span-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(editItem.status)}`}>
                {getStatusText(editItem.status)}
              </span>
              <div className="mt-1 text-xs text-gray-500">
                Status is automatically updated based on stock quantity and configured thresholds
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm font-medium col-span-1">Store:</div>
            <div className="col-span-3">{editItem.storeName}</div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => handleSaveChanges(editItem)}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
