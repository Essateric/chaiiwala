import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { ShoppingBagIcon } from "lucide-react";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx";

export default function AmazonOrderDialog({ open, setOpen }) {
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
            <Label htmlFor="amazon-account" className="text-right">
              Account
            </Label>
            <Input id="amazon-account" placeholder="Amazon Business account email" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="items-amazon" className="text-right">
              Items
            </Label>
            <Textarea
              id="items-amazon"
              placeholder="Enter items and quantities, with URLs if possible (one per line)"
              className="col-span-3"
              rows={5}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">
              Priority
            </Label>
            <select
              id="priority"
              className="col-span-3 border rounded p-2"
              defaultValue="standard"
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
          <Button type="submit">Place Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
