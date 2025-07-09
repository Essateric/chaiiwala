import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { BuildingIcon } from "lucide-react";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx";
import React from "react";
import { supabase } from "../../lib/supabaseClient.js"; // Import Supabase client

// Pass these props: open, setOpen, allowedStores, selectedStoreId, setSelectedStoreId, selectedItems, setSelectedItems, itemPrices, user, profile
export default function FreshwaysOrderDialog({
  open, setOpen,
  allowedStores, selectedStoreId, setSelectedStoreId,
  selectedItems, setSelectedItems, itemPrices, user, profile
}) {
  // Calculate total using price * qty
  const calculateTotalPrice = () => {
    return Object.entries(selectedItems).reduce((total, [key, qty]) => {
      if (qty > 0 && itemPrices[key]) {
        return total + (itemPrices[key].price * qty);
      }
      return total;
    }, 0);
  };
  const totalPrice = calculateTotalPrice();

  const isStoreManager = profile?.permissions === 'store' && allowedStores.length === 1;

  useEffect(() => {
  async function fetchItemPrices() {
    const { data, error } = await supabase
      .from('your_items_table')
      .select('*')
      .eq('store_id', selectedStoreId);

    if (!error) setItemPrices(data);
  }

  fetchItemPrices();
}, [selectedStoreId]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
          <BuildingIcon className="h-8 w-8 text-blue-600" />
          <span>Freshways Order</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Freshways Order</DialogTitle>
          <DialogDescription>
            Place an order for supplies from Freshways
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const orderItems = [];
            let totalPrice = 0;
            Object.entries(selectedItems).forEach(([key, qty]) => {
              if (qty > 0 && itemPrices[key]) {
                orderItems.push({
                  name: itemPrices[key].name,
                  price: itemPrices[key].price,
                  quantity: qty,
                  subtotal: `£${(itemPrices[key].price * qty).toFixed(2)}`
                });
                totalPrice += itemPrices[key].price * qty;
              }
            });
            const accountNumber = formData.get('account-number');
            const deliveryDate = formData.get('delivery-date');
            const notes = formData.get('notes');
            const currentDate = new Date();
            const year = currentDate.getFullYear().toString().slice(-2);
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const hours = String(currentDate.getHours()).padStart(2, '0');
            const minutes = String(currentDate.getMinutes()).padStart(2, '0');
            const seconds = String(currentDate.getSeconds()).padStart(2, '0');

            const dateStr = `${year}${month}${day}`;
            const timeStr = `${hours}${minutes}${seconds}`;

            const userInitials = user?.username
              ? user.username.substring(0, 2).toUpperCase()
              : 'UA';
            const orderDisplayId = `FW-${userInitials}${dateStr}-${timeStr}`; // New, more unique ID
            const storeObj = allowedStores.find(s => s.id === Number(selectedStoreId));

            // 1. Prepare data for Supabase
            const orderDataToSave = {
              order_display_id: orderDisplayId,
              supplier_name: 'Freshways',
              store_id: Number(selectedStoreId),
              user_id: user?.id,
              account_number: accountNumber,
              items: orderItems, // Already an array of objects
              total_price: totalPrice,
              expected_delivery_date: deliveryDate,
              notes: notes,
              status: 'Awaiting Confirmation',
              // created_at and updated_at will be set by default by Supabase
            };

            try {
              // 2. Insert into Supabase
              const { data: savedOrder, error: supabaseError } = await supabase
                .from('freshways_orders') // Use the correct table name
                .insert([orderDataToSave])
                .select();

              if (supabaseError) {
                console.error('Error saving order to Supabase:', supabaseError);
                alert(`Failed to save order to system: ${supabaseError.message}`);
                return; // Stop if Supabase insert fails
              }

              if (!savedOrder || savedOrder.length === 0) {
                console.error('Order saved to Supabase but no data returned.');
                alert('Order saved to system but failed to get confirmation. Please check system.');
                return;
              }

              console.log('Order saved to Supabase:', savedOrder[0]);

              // 3. POST order to Make.com webhook (existing logic)
              // The webhook might eventually read from Supabase using orderDisplayId or savedOrder[0].id
              fetch('https://hook.eu2.make.com/onukum5y8tnoo3lebhxe2u6op8dfj3oy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderId: orderDisplayId, // Keep original field name for webhook if needed
                  supabaseOrderId: savedOrder[0].id, // Optionally send Supabase internal ID
                  accountNumber,
                  deliveryDate,
                  items: orderItems,
                  orderType: 'Freshways',
                  store: storeObj?.name || '',
                  storeAddress: storeObj?.address || '',
                  storePhone: storeObj?.phone || '',
                  notes,
                  totalPrice: totalPrice,
                  totalPriceFormatted: `£${totalPrice.toFixed(2)}`
                }),
              })
                .then((response) => {
                  if (response.ok) {
                    alert('Order saved and submitted to Freshways successfully!');
                    setSelectedItems({}); // Clear selected items
                    setOpen(false); // Close dialog
                  } else {
                    // Inform user that it was saved locally but webhook failed
                    alert('Order saved to system, but failed to submit to Freshways via webhook. Please contact support.');
                  }
                })
                .catch((error) => {
                  console.error('Error submitting order to webhook:', error);
                  // Inform user that it was saved locally but webhook failed
                  alert('Order saved to system, but an error occurred while submitting to Freshways via webhook. Please contact support.');
                });

            } catch (error) {
              console.error('Unexpected error during order submission:', error);
              alert('An unexpected error occurred. Please try again.');
            }
          }}
        >
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="freshways-store" className="text-right">
                Store
              </Label>
              <div className="col-span-3">
                {isStoreManager ? (
                  <>
                    <input
                      type="text"
                      readOnly
                      className="w-full border rounded p-2 bg-gray-100"
                      value={allowedStores && allowedStores.length > 0 ? allowedStores[0].name : "Assigned store not found"}
                      name="freshways-store"
                    />
                    <input
                      type="hidden"
                      name="freshways-store-id"
                      value={allowedStores && allowedStores.length > 0 ? allowedStores[0].id : ""}
                    />
                  </>
                ) : (
                  <select
                    id="freshways-store"
                    name="freshways-store"
                    value={selectedStoreId}
                    onChange={e => setSelectedStoreId(Number(e.target.value))}
                    className="w-full border rounded p-2"
                    required
                  >
                    {allowedStores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account-number" className="text-right">
                Account #
              </Label>
              <Input
                id="account-number"
                name="account-number"
                placeholder="Your Freshways account number"
                className="col-span-3"
                required
              />
            </div>
            
            {/* Quantity selection for each item */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Items
              </Label>
              <div className="col-span-3 border rounded-md p-3 space-y-2">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2">Item</th>
                      <th className="text-right pb-2">Price</th>
                      <th className="text-center pb-2 w-24">Quantity</th>
                      <th className="text-right pb-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(itemPrices).map(([key, item]) => (
                      <tr key={key}>
                        <td className="py-2">{item.name}</td>
                        <td className="text-right">£{item.price.toFixed(2)}</td>
                        <td className="text-center">
                          <input
                            type="number"
                            min={0}
                            name={key}
                            value={selectedItems[key] || 0}
                            className="h-8 w-16 text-center border rounded"
                            onChange={e => {
                              const qty = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setSelectedItems({
                                ...selectedItems,
                                [key]: qty
                              });
                            }}
                          />
                        </td>
                        <td className="text-right">
                          {selectedItems[key] > 0
                            ? `£${(item.price * selectedItems[key]).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Total price display */}
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center font-medium">
                <span>Total Order Value:</span>
                <span className="text-lg text-right">
                  £{calculateTotalPrice().toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delivery-date" className="text-right">
                Delivery Date
              </Label>
              <Input
                id="delivery-date"
                name="delivery-date"
                type="date"
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any special instructions or notes"
                className="col-span-3"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button type="submit">Place Order</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}