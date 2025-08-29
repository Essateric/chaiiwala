import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type NewChecklistPayload = {
  title: string;
  description: string;
  category: string;
  assignedTo: string;
  dueDate?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: NewChecklistPayload) => void;
  isSubmitting?: boolean;
};

export default function AddChecklistDialog({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const [form, setForm] = useState<NewChecklistPayload>({
    title: "",
    description: "",
    category: "",
    assignedTo: "",
    dueDate: ""
  });

  const submit = () => onSubmit(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Checklist</DialogTitle>
          <DialogDescription>Add a new checklist with tasks to be completed.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Checklist Title</Label>
            <Input id="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opening">Opening Procedures</SelectItem>
                  <SelectItem value="closing">Closing Procedures</SelectItem>
                  <SelectItem value="weekly">Weekly Cleaning</SelectItem>
                  <SelectItem value="health">Health & Safety</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assignedTo} onValueChange={v => setForm({ ...form, assignedTo: v })}>
                <SelectTrigger><SelectValue placeholder="Select role/person" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_staff">All Staff</SelectItem>
                  <SelectItem value="store_manager">Store Manager</SelectItem>
                  <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                  <SelectItem value="front_of_house">Front of House</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date (Optional)</Label>
            <Input id="due-date" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-chai-gold hover:bg-yellow-600" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Checklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
