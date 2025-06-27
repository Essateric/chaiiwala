import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { StoreIcon } from "lucide-react";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { Textarea } from "../ui/textarea.jsx";

export default function LocalOrderDialog({ open, setOpen }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
          <StoreIcon className="h-8 w-8 text-green-600" />
          <span>Local Order</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Local Order</DialogTitle>
          <DialogDescription>
            Place an order for supplies from local vendors
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor" className="text-right">
              Vendor
            </Label>
            <Input id="vendor" placeholder="Vendor name" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="items-local" className="text-right">
              Items
            </Label>
            <Textarea
              id="items-local"
              placeholder="Enter items and quantities (one per line)"
              className="col-span-3"
              rows={5}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes-local" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes-local"
              placeholder="Any special instructions"
              className="col-span-3"
            />
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
