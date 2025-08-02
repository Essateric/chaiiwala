import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { ShoppingBagIcon } from "lucide-react";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { supabase } from "../../lib/supabaseClient"; // adjust path as needed

export default function AmazonOrderDialog({ open, setOpen }) {
  const { profile } = useAuth();

const [account, setAccount] = useState("");
const [itemsText, setItemsText] = useState("");
const [priority, setPriority] = useState("standard");
const [basketUrl, setBasketUrl] = useState(""); // ✅ Add this line
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!itemsText.trim()) return alert("Please enter items");

    setLoading(true);

    const items = itemsText.split("\n").map((line) => ({
      description: line,
    }));

const { error } = await supabase.from("amazon_order_requests").insert({
  requested_by: profile.id,
  store_id: profile.store_ids?.[0] ?? null,
  status: "pending",
  account,
  priority,
  basket_url: basketUrl || null,
  items: items.length > 0 ? items : null,
});


    setLoading(false);
    if (error) {
      console.error("Amazon order error:", error);
      alert("Failed to place order. Please try again.");
    } else {
      alert("Amazon order submitted successfully.");
      setOpen(false);
      setAccount("");
      setItemsText("");
      setPriority("standard");
    }
  };

  const canSubmit = itemsText.trim() !== "" || basketUrl.trim() !== "";


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
          <ShoppingBagIcon className="h-8 w-8 text-amber-600" />
          <span>Amazon Order</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Amazon Order</DialogTitle>
          <DialogDescription>
            Place an order for supplies from Amazon
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amazon-account" className="text-right">Account</Label>
            <Input
              id="amazon-account"
              placeholder="Amazon Business account email"
              className="col-span-3"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="items-amazon" className="text-right">Items</Label>
            <Textarea
              id="items-amazon"
              placeholder="One item per line with quantity and optional link"
              className="col-span-3"
              rows={5}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
  <Label htmlFor="basket-url" className="text-right">
    Basket URL
  </Label>
  <Input
    id="basket-url"
    placeholder="Paste Amazon basket link here"
    className="col-span-3"
    value={basketUrl}
    onChange={(e) => setBasketUrl(e.target.value)}
  />
</div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">Priority</Label>
            <select
              id="priority"
              className="col-span-3 border rounded p-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="standard">Standard Delivery</option>
              <option value="expedited">Expedited Delivery</option>
              <option value="next-day">Next Day Delivery</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline">
            Cancel
          </Button>
          {!canSubmit && (
  <p className="text-sm text-red-500 mt-2">
    Please enter items or a basket link before submitting.
  </p>
)}
<Button onClick={handleSubmit} disabled={!canSubmit || loading}>
  {loading ? "Placing..." : "Place Order"}
</Button>

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
