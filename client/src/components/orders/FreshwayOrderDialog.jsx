import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogTrigger, DialogFooter
} from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { BuildingIcon } from "lucide-react";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { useFreshwaysAcc } from "../../hooks/useFreshwaysAccs.jsx";
import { formatDeliveryDateVerbose } from "../../lib/formatters.js";
import React, { useEffect, useState } from "react"; // ✅ include useState
import { useQueryClient } from "@tanstack/react-query";




export default function FreshwaysOrderDialog({
  open, setOpen,
  allowedStores, selectedStoreId, setSelectedStoreId,
  selectedItems, setSelectedItems, itemPrices, setItemPrices,
  user, profile
}) {
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
  const { freshwaysStores } = useFreshwaysAcc();
  const selectedStore = freshwaysStores?.find(store => store.id === Number(selectedStoreId));
  const freshwaysAccountNumber = selectedStore?.freshways_account_no || "";

useEffect(() => {
  async function fetchItemPrices() {
    const { data, error } = await supabase
      .from("freshways_items")
      .select("id, name, price");

    if (!error) {
      const mapped = {};
      data.forEach(item => {
        mapped[item.id] = item;
      });
      setItemPrices(mapped);
    }
  }

  fetchItemPrices();
}, []); // 👈 removed selectedStoreId dependency

const validOrderDays = {
  Monday: "Tuesday",
  Tuesday: "Wednesday",
  Thursday: "Friday",
  Friday: "Saturday",
  Saturday: "Monday",
};

 const today = new Date();
// TEMP: Force today to be Monday (for testing)
// const today = new Date("2025-07-24"); // Replace with any known valid order date

const orderDay = today.toLocaleDateString("en-GB", { weekday: "long" });
const currentHour = today.getHours();
const isOrderDayValid = Object.keys(validOrderDays).includes(orderDay);
const deliveryDay = validOrderDays[orderDay] ?? null;

const isBeforeCutoff = currentHour < 12;
const isOrderFormEnabled = isOrderDayValid && isBeforeCutoff;

const queryClient = useQueryClient();


function getNextDeliveryDate(deliveryDayStr) {
  const dayIndexMap = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  const targetDayIndex = dayIndexMap[deliveryDayStr];
  const today = new Date();
  const currentDayIndex = today.getDay();

  let daysUntilDelivery = (targetDayIndex - currentDayIndex + 7) % 7;
  if (daysUntilDelivery === 0) daysUntilDelivery = 7; // ensure it's in the future

  const nextDeliveryDate = new Date(today);
  nextDeliveryDate.setDate(today.getDate() + daysUntilDelivery);
  return nextDeliveryDate;
}


let deliveryDate = null;
let deliveryDateISO = null;

// If today is not a valid order day, find next valid one
let nextValidOrderDay = null;
if (!isOrderDayValid) {
  const todayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const orderedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (todayIndex + i) % 7;
    const nextDayName = orderedDays[nextDayIndex];
    if (validOrderDays[nextDayName]) {
      nextValidOrderDay = nextDayName;
      break;
    }
  }
}

if (deliveryDay) {
  deliveryDate = getNextDeliveryDate(deliveryDay);
  if (deliveryDate instanceof Date && !isNaN(deliveryDate)) {
    deliveryDateISO = deliveryDate.toISOString().split("T")[0];
  } else {
    console.error("❌ Invalid deliveryDate object returned");
  }
}

if (!deliveryDateISO) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="text-center py-8">
  <DialogHeader>
    <DialogTitle className="text-red-500">
      🚫 Orders not accepted today ({orderDay})
    </DialogTitle>
    <DialogDescription>
      Please try again on a valid order day.
    </DialogDescription>
  </DialogHeader>

  <DialogFooter className="mt-6 justify-center">
    <Button
      variant="outline"
      onClick={() => {
        setOpen(false);
      }}
    >
      Close
    </Button>
  </DialogFooter>
</DialogContent>

    </Dialog>
  );
}



// 👇 Utility to calculate actual delivery date based on day name


if (!(deliveryDate instanceof Date) || isNaN(deliveryDate)) {
  console.error("❌ Invalid deliveryDate:", deliveryDate, "from deliveryDay:", deliveryDay);
  return null; // or fallback logic
}

// Countdown from midnight until 11AM on the DELIVERY day
const [timeLeft, setTimeLeft] = useState("");

useEffect(() => {
  const updateCountdown = () => {
    if (!deliveryDay) return;

    const deliveryDateObj = getNextDeliveryDate(deliveryDay); // e.g. next Saturday
    deliveryDateObj.setHours(11, 0, 0, 0); // 11:00 AM

    const now = new Date();
    const diff = deliveryDateObj - now;

    if (diff <= 0) {
      setTimeLeft("Order window closed");
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `⏳ ${hours}h ${minutes}m ${seconds}s left to order for delivery on ${deliveryDay}`
      );
    }
  };

  updateCountdown();
  const interval = setInterval(updateCountdown, 1000); // update every second now
  return () => clearInterval(interval);
}, [deliveryDay]);




  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        {isOrderDayValid && (
  <p className="text-sm font-semibold text-blue-600 mb-2 text-center">
    ⏰ {timeLeft}
  </p>
)}

        <DialogHeader>
          <DialogTitle>New Freshways Order</DialogTitle>
          <DialogDescription>Place an order for supplies from Freshways</DialogDescription>
        </DialogHeader>
        {!deliveryDateISO ? (
  <div className="text-center text-red-500 font-semibold p-4">
    Orders are not accepted today. Please try again on a valid order day.
  </div>
)  : (
  <div>
    {!isOrderDayValid && (
      <p className="text-red-600 font-medium text-center mb-2">
        🚫 Orders are not accepted today ({orderDay}).<br />
        You can place your next order on <strong>{nextValidOrderDay}</strong>.
      </p>
    )}

    <form onSubmit={async (e) => {
      // your submit logic
    }}>
      {/* form content here */}
    </form>
  </div>
)}
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
  const notes = formData.get('notes');
  const currentDate = new Date();
  const userInitials = user?.username?.substring(0, 2).toUpperCase() || 'UA';
  const orderDisplayId = isNaN(currentDate.getTime())
  ? `FW-${userInitials}-INVALIDDATE`
  : `FW-${userInitials}${currentDate.toISOString().replace(/\D/g, '').slice(2, 14)}`;
  const storeObj = allowedStores.find(s => s.id === Number(selectedStoreId));
  console.log("🕒 currentDate:", currentDate);
console.log("📦 deliveryDateISO:", deliveryDateISO);

  const orderDataToSave = {
    order_display_id: orderDisplayId,
    supplier_name: 'Freshways',
    store_id: Number(selectedStoreId),
    user_id: user?.id,
    account_number: accountNumber,
    items: orderItems,
    total_price: totalPrice,
    expected_delivery_date: deliveryDateISO || null,
    notes: notes,
    status: 'Awaiting Confirmation',
  };

  try {
    const { data: savedOrder, error: supabaseError } = await supabase
      .from('freshways_orders')
      .insert([orderDataToSave])
      .select();

    if (supabaseError || !savedOrder || savedOrder.length === 0) {
      alert(`Failed to save order: ${supabaseError?.message || 'No confirmation received.'}`);
      return;
    }

    const orderPayload = {
      orderId: orderDisplayId,
      accountNumber,
      deliveryDate: deliveryDateISO,
      store: storeObj?.name,
      storeAddress: storeObj?.address || 'N/A',
      storePhone: storeObj?.phone || 'N/A',
      totalPriceFormatted: totalPrice.toFixed(2),
      notes,
      items: orderItems
    };

    const emailRes = await fetch('/.netlify/functions/sendFreshwaysOrderEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });

    const emailJson = await emailRes.json();
    console.log('📧 Email response:', emailJson);

    alert('Order saved and email sent successfully!');
    setSelectedItems({});
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["freshways_order_log"] });

    window.location.reload();
  } catch (error) {
    console.error('Unexpected error during order submission:', error);
    alert('An unexpected error occurred. Please try again.');
  }
}}

>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="freshways-store" className="text-right">Store</Label>
              <div className="col-span-3">
                {isStoreManager ? (
                  <>
                    <input
                      type="text"
                      readOnly
                      className="w-full border rounded p-2 bg-gray-100"
                      value={allowedStores[0]?.name || "Assigned store not found"}
                      name="freshways-store"
                    />
                    <input
                      type="hidden"
                      name="freshways-store-id"
                      value={allowedStores[0]?.id || ""}
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
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account-number" className="text-right">Account #</Label>
              <div className="col-span-3">
                <input
                  type="text"
                  readOnly
                  className="w-full border rounded p-2 bg-gray-100"
                  value={freshwaysAccountNumber || "Account number not found"}
                />
                <input type="hidden" name="account-number" value={freshwaysAccountNumber} />
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Items</Label>
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

            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center font-medium">
                <span>Total Order Value:</span>
                <span className="text-lg text-right">£{calculateTotalPrice().toFixed(2)}</span>
              </div>
            </div>

<div className="grid grid-cols-4 items-center gap-4">
  <Label htmlFor="delivery-date" className="text-right">
    Delivery Date
  </Label>
  <Input
    id="delivery-date"
    name="delivery-date"
    type="text"
    className="col-span-3"
    value={formatDeliveryDateVerbose(deliveryDate)}
    readOnly
    required
  />
  <input type="hidden" name="delivery-date-raw" value={deliveryDateISO} />
</div>


            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
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
            
<Button type="submit" disabled={!isOrderDayValid || timeLeft === "Order window closed"}>
  Place Order
</Button>

          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
