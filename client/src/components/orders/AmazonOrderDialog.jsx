import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { ShoppingBagIcon, Trash2, PlusCircle, Pencil, Check, X } from "lucide-react";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { supabase } from "../../lib/supabaseClient"; // keep your path

/**
 * AmazonOrderDialog (enhanced)
 * - Add structured items: description, price, quantity, link
 * - Preview items in a table before submitting
 * - Metadata: which store, requestor, priority, needed-by datetime, comments, basket URL
 * - Persists into two tables (recommended):
 *   1) amazon_order_requests
 *   2) amazon_order_items (linked via request_id)
 *
 * SQL (run once) — place in your Supabase SQL editor:
 * ---------------------------------------------------
 * -- master request row
 * create table if not exists public.amazon_order_requests (
 *   id uuid primary key default gen_random_uuid(),
 *   requested_by uuid references public.profiles(id) on delete set null,
 *   store_id uuid references public.stores(id) on delete set null,
 *   status text not null default 'pending',
 *   account text,
 *   priority text not null default 'standard',
 *   basket_url text,
 *   needed_by_at timestamptz,
 *   comments text,
 *   created_at timestamptz not null default now()
 * );
 *
 * -- line items
 * create table if not exists public.amazon_order_items (
 *   id uuid primary key default gen_random_uuid(),
 *   request_id uuid not null references public.amazon_order_requests(id) on delete cascade,
 *   description text not null,
 *   price numeric(12,2) check (price >= 0),
 *   qty integer not null default 1 check (qty > 0),
 *   link text,
 *   created_at timestamptz not null default now()
 * );
 *
 * -- RLS examples (adjust for your roles)
 * alter table public.amazon_order_requests enable row level security;
 * alter table public.amazon_order_items enable row level security;
 *
 * -- allow requester + store managers + admin/regional (example policies)
 * create policy "own-requests-read" on public.amazon_order_requests
 *   for select using (auth.uid() = requested_by);
 * create policy "own-requests-insert" on public.amazon_order_requests
 *   for insert with check (auth.uid() = requested_by);
 *
 * create policy "items-by-request-read" on public.amazon_order_items
 *   for select using (
 *     exists(
 *       select 1 from public.amazon_order_requests r
 *       where r.id = request_id and r.requested_by = auth.uid()
 *     )
 *   );
 * create policy "items-by-request-insert" on public.amazon_order_items
 *   for insert with check (
 *     exists(
 *       select 1 from public.amazon_order_requests r
 *       where r.id = request_id and r.requested_by = auth.uid()
 *     )
 *   );
 * -- Add broader role-based policies for regional/admin as needed.
 * ---------------------------------------------------
 */

export default function AmazonOrderDialog({ open, setOpen }) {
  const { profile } = useAuth();

  // master form fields
  const [account, setAccount] = useState("");
  const [priority, setPriority] = useState("standard");
  const [basketUrl, setBasketUrl] = useState("");
  const [neededBy, setNeededBy] = useState(""); // datetime-local string
  const [comments, setComments] = useState("");

  // item builder fields
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemLink, setItemLink] = useState("");

  // items list
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ description: "", qty: 1, price: "", link: "" });

  const storeId = profile?.store_ids?.[0] ?? null;
  const storeName = profile?.store_names?.[0] ?? ""; // optional if you keep store names on profile

  const canSubmit = useMemo(() => items.length > 0 || basketUrl.trim() !== "", [items.length, basketUrl]);

  const addItem = () => {
    const desc = itemDesc.trim();
    const qty = Number(itemQty);
    const price = itemPrice === "" ? null : Number(itemPrice);

    if (!desc) return alert("Please enter a product description.");
    if (!Number.isFinite(qty) || qty <= 0) return alert("Please enter a valid quantity.");
    if (price !== null && (!Number.isFinite(price) || price < 0)) return alert("Price must be a positive number.");

    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: desc,
        qty,
        price,
        link: itemLink.trim() || null,
      },
    ]);

    // reset builder
    setItemDesc("");
    setItemPrice("");
    setItemQty(1);
    setItemLink("");
  };

  const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  const startEdit = (it) => {
    setEditingId(it.id);
    setEditDraft({
      description: it.description,
      qty: it.qty,
      price: it.price == null ? "" : String(it.price),
      link: it.link || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ description: "", qty: 1, price: "", link: "" });
  };

  const commitEdit = () => {
    if (!editingId) return;
    const qtyNum = Number(editDraft.qty);
    const priceNum = editDraft.price === "" ? null : Number(editDraft.price);
    if (!editDraft.description.trim()) return alert("Description is required.");
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return alert("Qty must be > 0.");
    if (priceNum !== null && (!Number.isFinite(priceNum) || priceNum < 0)) return alert("Price must be positive.");

    setItems((prev) => prev.map((x) => (
      x.id === editingId
        ? { ...x, description: editDraft.description.trim(), qty: qtyNum, price: priceNum, link: editDraft.link.trim() || null }
        : x
    )));
    cancelEdit();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      // Build payload defensively to avoid 400 if columns are missing in schema cache
      const payload = {
        requested_by: profile?.id ?? null,
        store_id: storeId,
        status: "pending",
        account: account || null,
        priority,
        basket_url: basketUrl || null,
      };
      if (neededBy) payload.needed_by_at = new Date(neededBy).toISOString();
      if (comments && comments.trim()) payload.comments = comments.trim();

      const { data: reqData, error: reqErr } = await supabase
        .from("amazon_order_requests")
        .insert(payload)
        .select("id")
        .single();

      if (reqErr) throw reqErr;

      // 2) insert line items (if any)
      if (items.length) {
        const lineItems = items.map(({ description, qty, price, link }) => ({
          request_id: reqData.id,
          description,
          qty,
          price: price === null ? null : Number(price),
          link: link || null,
        }));

        const { error: itemsErr } = await supabase.from("amazon_order_items").insert(lineItems);
        if (itemsErr) throw itemsErr;
      }

      alert("Amazon order submitted successfully.");
      // reset form
      setOpen(false);
      setAccount("");
      setPriority("standard");
      setBasketUrl("");
      setNeededBy("");
      setComments("");
      setItems([]);
    } catch (e) {
      console.error("Amazon order error:", e);
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
          <ShoppingBagIcon className="h-8 w-8 text-amber-600" />
          <span>Amazon Order</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Amazon Order</DialogTitle>
          <DialogDescription>Place an order for supplies from Amazon</DialogDescription>
        </DialogHeader>

        {/* Meta */}
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
            <Label htmlFor="basket-url" className="text-right">Basket URL</Label>
            <Input
              id="basket-url"
              placeholder="Paste Amazon basket link (optional)"
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="needed-by" className="text-right">Needed by</Label>
            <Input
              id="needed-by"
              type="datetime-local"
              className="col-span-3"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="comments" className="text-right pt-2">Comments</Label>
            <Textarea
              id="comments"
              placeholder="Any notes for procurement (optional)"
              className="col-span-3"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        {/* Item builder */}
        <div className="border rounded-lg p-3 space-y-3">
          <div className="font-medium">Add items</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <Label htmlFor="item-desc">Description</Label>
              <Input id="item-desc" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="e.g., 12x Paper Cups 12oz" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="item-price">Price (£)</Label>
              <Input id="item-price" inputMode="decimal" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="e.g., 14.99" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="item-qty">Qty</Label>
              <Input id="item-qty" type="number" min={1} value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="item-link">Link</Label>
              <Input id="item-link" value={itemLink} onChange={(e) => setItemLink(e.target.value)} placeholder="https://www.amazon.co.uk/..." />
            </div>
            <div className="md:col-span-12 flex justify-end">
              <Button type="button" onClick={addItem} variant="secondary" className="inline-flex items-center gap-2">
                <PlusCircle className="h-4 w-4" /> Add item
              </Button>
            </div>
          </div>
        </div>

        {/* Items table + meta preview */}
        <div className="mt-4">
          <div className="text-sm text-muted-foreground mb-2">
            {storeName ? (
              <span><span className="font-medium">Store:</span> {storeName} • </span>
            ) : null}
            <span className="font-medium">Requested by:</span> {profile?.full_name || profile?.email || "You"}
            {neededBy ? (
              <span> • <span className="font-medium">Needed by:</span> {new Date(neededBy).toLocaleString()}</span>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-right p-2">Price (£)</th>
                  <th className="text-left p-2">Link</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">No items added yet.</td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id} className="border-t align-top">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 whitespace-pre-wrap">
                        {editingId === it.id ? (
                          <Input
                            value={editDraft.description}
                            onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                          />
                        ) : (
                          it.description
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {editingId === it.id ? (
                          <Input
                            type="number"
                            min={1}
                            value={editDraft.qty}
                            onChange={(e) => setEditDraft((d) => ({ ...d, qty: e.target.value }))}
                          />
                        ) : (
                          it.qty
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {editingId === it.id ? (
                          <Input
                            inputMode="decimal"
                            value={editDraft.price}
                            onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
                          />
                        ) : (
                          it.price == null ? '-' : Number(it.price).toFixed(2)
                        )}
                      </td>
                      <td className="p-2 max-w-[240px] break-words">
                        {editingId === it.id ? (
                          <Input
                            value={editDraft.link}
                            onChange={(e) => setEditDraft((d) => ({ ...d, link: e.target.value }))}
                          />
                        ) : it.link ? (
                          <a className="underline" href={it.link} target="_blank" rel="noreferrer">{it.link}</a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2 text-right space-x-1">
                        {editingId === it.id ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={commitEdit} title="Save">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={cancelEdit} title="Cancel">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => startEdit(it)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)} title="Remove">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {!canSubmit && (
            <p className="text-sm text-red-500 mr-auto">Add at least one item or a basket link to submit.</p>
          )}

          <Button onClick={() => setOpen(false)} variant="outline">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? "Placing..." : "Place Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
