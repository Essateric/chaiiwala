// File: src/components/orders/ChaiiwalaOrderDialog.jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { CoffeeIcon, FileSpreadsheet, Upload, Loader2 } from "lucide-react";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";
import { useState, useEffect } from "react";
import { useToast } from "../../hooks/use-toast.jsx";
import { useAuth } from "../../hooks/UseAuth.jsx";
import { supabase } from "../../lib/supabaseClient.js";

const TEMPLATE_URL = "https://pjdycbnegzxzhauecrck.supabase.co/storage/v1/object/public/order_templates/chaiiwala_order_template.xlsx";
const STORAGE_BUCKET = "chaiiwala-orders";

export default function ChaiiwalaOrderDialog({ open, setOpen, storeName: storeNameProp }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [file, setFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [profileStoreName, setProfileStoreName] = useState("");

  // ✅ fetch store name from profile (if not passed as prop)
useEffect(() => {
  let isMounted = true;
  (async () => {
    if (!user?.id || storeNameProp) return;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("store_ids")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profileData?.store_ids?.[0]) return;

    const firstStoreId = profileData.store_ids[0];

    const { data: storeData, error: storeError } = await supabase
      .from("stores")
      .select("name")
      .eq("id", firstStoreId)
      .single();

    if (!storeError && storeData?.name && isMounted) {
      setProfileStoreName(storeData.name);
    }
  })();

  return () => {
    isMounted = false;
  };
}, [user?.id, storeNameProp]);

  // final store name (prop → profile → fallback)
  const storeName = (storeNameProp || profileStoreName || "Store").trim();

  function formatDateDDMMYY(date = new Date()) {
    const d = new Date(date);
    return [
      String(d.getDate()).padStart(2, "0"),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getFullYear()).slice(-2),
    ].join("");
  }

  function sanitiseStoreForFilename(name) {
    return name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  }

  // ✅ ensures filename includes correct store name
  function buildFilename(original) {
    const ext = (original?.name?.split(".").pop() || "xls").toLowerCase();
    const safeExt = ["xls", "xlsx"].includes(ext) ? ext : "xls";
    const dateStr = formatDateDDMMYY();
    const safeStore = sanitiseStoreForFilename(storeName);
    return `${dateStr}_${safeStore}.${safeExt}`;
  }

  async function uploadToSupabaseStorage(filename, fileBlob) {
    try {
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, fileBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: fileBlob.type || "application/vnd.ms-excel",
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
      return { path: filename, publicUrl: pub?.publicUrl };
    } catch (e) {
      console.warn("Archive upload failed:", e);
      return { path: null, publicUrl: null };
    }
  }

  async function handleSend() {
    setError("");
    if (!file) {
      setError("Please choose the edited Excel file to send.");
      return;
    }
    setIsSending(true);

    try {
      const filename = buildFilename(file);
      const archive = await uploadToSupabaseStorage(filename, file);

      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));

      const payload = {
        filename,
        storeName,
        archivePublicUrl: archive.publicUrl,
        mimeType: file.type || (filename.endsWith(".xlsx") ? 
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : 
          "application/vnd.ms-excel"),
        fileDataBase64: base64,
      };

      const res = await fetch("/.netlify/functions/sendChaiiwalaOrderEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      toast({ title: "Order emailed ✅", description: `${filename} has been sent.` });
      setOpen(false);
      setFile(null);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to send email.");
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-24 flex flex-col items-center justify-center gap-2" variant="outline">
          <CoffeeIcon className="h-8 w-8 text-chai-gold" />
          <span>Chaiiwala Order</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chaiiwala Order</DialogTitle>
          <DialogDescription>
            1) Download the Excel template → 2) Edit and save locally → 3) Upload it here → 4) Send.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="excelFile">Upload your edited file</Label>
            <Input
              id="excelFile"
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-xs text-gray-600">
                Selected: <strong>{file.name}</strong> → will be sent as <strong>{buildFilename(file)}</strong>
              </p>
            )}
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline" disabled={isSending}>Cancel</Button>
          <Button onClick={handleSend} disabled={!file || isSending} className="gap-2">
            {isSending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>) : (<><Upload className="h-4 w-4" /> Send to Chaiiwala</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
