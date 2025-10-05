// Audit.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient.js";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { Loader2 } from "lucide-react";

/* ---------------------- WinAnsi-safe sanitizers (NEW) ---------------------- */
const REPLACEMENTS = {
  "≥": ">=",
  "≤": "<=",
  "–": "-",
  "—": "-",
  "−": "-",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "•": "*",
  "·": "-",
  "…": "...",
  "£": "GBP ",
  "€": "EUR ",
};
const safeAnsi = (v) =>
  String(v ?? "").replace(/[≥≤–—−“”‘’•·…£€]/g, (ch) => REPLACEMENTS[ch] || "?");

const sanitizeDeep = (x) => {
  if (x == null) return x;
  if (typeof x === "string") return safeAnsi(x);
  if (Array.isArray(x)) return x.map(sanitizeDeep);
  if (typeof x === "object") {
    const out = {};
    for (const k of Object.keys(x)) out[k] = sanitizeDeep(x[k]);
    return out;
  }
  return x;
};
/* -------------------------------------------------------------------------- */

export default function AuditEditor() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { id: auditId } = useParams(); // UUID or undefined
  const queryClient = useQueryClient();

  // Track files generated this session (name, href, createdAt)
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [previewHref, setPreviewHref] = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // <- for loader
  // near the other useState hooks
 const [savingAnswers, setSavingAnswers] = useState(false);


  const filesTableRef = useRef(null); // to scroll back after closing preview

  // revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      generatedFiles.forEach((f) => {
        if (f._isObjectUrl && f.href) URL.revokeObjectURL(f.href);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Admin "start audit" (no :id) ----------
  const storeIds = Array.isArray(profile?.store_ids) ? profile.store_ids : [];
  const isCreateMode = !auditId;

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ["stores-for-audit", storeIds.join(",")],
    enabled: isCreateMode,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const q = supabase.from("stores").select("id,name").order("name", { ascending: true });
      const { data, error } = storeIds.length > 0 ? await q.in("id", storeIds) : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["audit_templates_active"],
    enabled: isCreateMode,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_templates")
        .select("id,name,version,is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const createAndStart = async () => {
    if (!selectedStore || !selectedTemplate) {
      alert("Pick a store and a template first.");
      return;
    }

    const payload = {
      template_id: selectedTemplate,
      store_id: Number(selectedStore),
      auditor_id: profile?.id ?? null,
      started_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("audits")
      .insert(payload)
      .select("id")
      .single();

    if (insertErr) {
      console.error(insertErr);
      alert(insertErr.message || "Could not create audit.");
      return;
    }

    const newId = inserted?.id;
    if (!newId) {
      alert("Audit created but no ID returned.");
      return;
    }

    const { data: readable, error: readErr } = await supabase
      .from("audits")
      .select(`
        id, store_id, template_id, started_at, submitted_at,
        stores(name),
        audit_templates(name)
      `)
      .eq("id", newId)
      .maybeSingle();

    if (readErr || !readable) {
      console.error(readErr);
      alert("Audit was created, but you don't have permission to read it. Please check RLS.");
      return;
    }

    queryClient.setQueryData(["audit", newId], readable);
    navigate(`/audit/${newId}`, { replace: true, state: { fromCreate: true } });
  };

  // ---------- Existing audit flow ----------
  const { data: audit, isLoading: loadingAudit } = useQuery({
    queryKey: ["audit", auditId],
    enabled: !!auditId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select(
          `
          id, store_id, template_id, started_at, submitted_at,
          stores(name),
          audit_templates(name)
        `
        )
        .eq("id", auditId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // File/display name for generated PDF
  const displayName = useMemo(() => {
    const d = new Date(audit?.submitted_at || audit?.started_at || Date.now());
    const pad = (n) => String(n).padStart(2, "0");
    const ddmmyy = `${pad(d.getDate())}${pad(d.getMonth() + 1)}${String(d.getFullYear()).slice(-2)}`;
    const store = audit?.stores?.name || `Store ${audit?.store_id || ""}`;
    return `Audit_${store.replace(/[^A-Za-z0-9]+/g, "_")}_${ddmmyy}`;
  }, [audit]);

  const templateId = audit?.template_id ?? null;
  const storeName = audit?.stores?.name ?? "—";
  const templateName = audit?.audit_templates?.name ?? "Template";

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ["audit_sections", templateId],
    enabled: !!templateId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_sections")
        .select("id,title,sort_order")
        .eq("template_id", templateId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ["audit_questions", auditId, ...sectionIds],
    enabled: !!auditId && sectionIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_questions")
        .select("id,section_id,code,prompt,answer_type,max_points,sort_order")
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: answers = [], isLoading: loadingAnswers } = useQuery({
    queryKey: ["audit_answers", auditId],
    enabled: !!auditId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_answers")
        .select("id,audit_id,question_id,value_bool,value_num,value_text,notes")
        .eq("audit_id", auditId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ---------- Local draft ----------
  const [draft, setDraft] = useState({});
  const answersSig = useMemo(
    () =>
      answers
        .map(
          (a) =>
            `${a.question_id}|${a.value_bool ?? ""}|${a.value_num ?? ""}|${a.value_text ?? ""}|${a.notes ?? ""}`
        )
        .join("§"),
    [answers]
  );
  const seededRef = useRef(false);
  useEffect(() => {
    const map = {};
    for (const a of answers) {
      map[a.question_id] = {
        value_bool: a.value_bool,
        value_num: a.value_num,
        value_text: a.value_text,
        notes: a.notes,
      };
    }
    setDraft(map);
    seededRef.current = true;
  }, [answersSig]);

  const questionsBySection = useMemo(() => {
    const map = {};
    for (const s of sections) map[s.id] = [];
    for (const q of questions) (map[q.section_id] ??= []).push(q);
    return map;
  }, [sections, questions]);

  const handleChange = (qid, patch) =>
    setDraft((prev) => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...patch } }));

  const clamp = (n, min, max) => {
    if (n == null || Number.isNaN(n)) return null;
    return Math.min(Math.max(n, min), max);
  };

const saveAll = async () => {
  if (savingAnswers) return;            // prevent rapid double-save
  setSavingAnswers(true);
  try {
    const rows = [];
    for (const q of questions) {
      const d = draft[q.id];
      if (!d) continue;
      const row = {
        audit_id: auditId,
        question_id: q.id,
        value_bool: null,
        value_num: null,
        value_text: null,
        notes: d.notes ?? null,
      };
      if (q.answer_type === "binary") row.value_bool = d.value_bool ?? null;
     else if (q.answer_type === "score") {
  // We store the label in value_text and the numeric score in value_num.
  // N/A → value_text = "na", value_num = null (excluded from totals)
  row.value_text = d.value_text ?? null;
  row.value_num = d.value_text === "na" ? null : (d.value_num ?? null);
}
 else if (q.answer_type === "text" || q.answer_type === "photo") {
        row.value_text = d.value_text ?? null;
      }
      rows.push(row);
    }
    if (!rows.length) return;

    const { error } = await supabase
      .from("audit_answers")
      .upsert(rows, {
        onConflict: "audit_id,question_id",  // <-- the key fix
        ignoreDuplicates: false,
        defaultToNull: false,
      })
      .select("id");

    if (error) {
      console.error(error);
      alert(error.message || "Could not save answers.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["audit_answers", auditId] });
    alert("Saved.");
  } finally {
    setSavingAnswers(false);
  }
};


  /* ----------------------- PDF link helpers / upload ----------------------- */
  const dataUrlToBase64 = (s = "") => {
    const m = s.match(/^data:application\/pdf;base64,(.+)$/i);
    return m ? m[1] : null;
  };

  // Map pass/fair/fail numeric scores from max_points
const scoreMapForMax = (max = 0) => {
  if (max >= 5) return { pass: 5, fair: 3, fail: 0 }; // includes max=5
  if (max === 3) return { pass: 3, fair: 2, fail: 0 };
  if (max === 2) return { pass: 2, fair: 1, fail: 0 };
  // sensible fallback for any other max
  return { pass: max, fair: Math.max(0, Math.floor(max / 2)), fail: 0 };
};


  const arrayBufferToBase64 = (ab) => {
    const bytes = new Uint8Array(ab);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  const base64ToBlob = (base64) => {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: "application/pdf" });
  };

  const publicOrSignedUrl = async (bucket, path, ttlSeconds = 60 * 60 * 24 * 365) => {
    // Try public URL first (works instantly if bucket is public)
    const pub = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl || null;
    if (publicUrl) return publicUrl;

    // Fall back to a long-lived signed URL (works even if bucket is private)
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
    if (error) throw error;
    return data?.signedUrl || "";
  };

  const uploadPdfToSupabase = async (base64, fileName) => {
    const cleanName = (fileName || `${displayName}.pdf`).replace(/[/\\]+/g, "_");
    const path = `${auditId}/${cleanName}`; // keep PDFs grouped by audit
    const blob = base64ToBlob(base64);

    const { error: upErr } = await supabase.storage
      .from("audit-files")
      .upload(path, blob, {
        upsert: true,
        contentType: "application/pdf",
        cacheControl: "3600",
      });
    if (upErr) throw upErr;

    const href = await publicOrSignedUrl("audit-files", path);
    return { href, path, name: cleanName };
  };

  const openInNewTab = (href) => window.open(href, "_blank", "noopener,noreferrer");
  const copyLink = async (href) => {
    try {
      await navigator.clipboard.writeText(href);
      alert("Link copied to clipboard.");
    } catch {
      alert("Could not copy link.");
    }
  };

  /* ----------------------- Image capture/upload helpers -------------------- */
  const dataUrlToFile = async (dataUrl, filename = "image.jpg") => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/jpeg" });
  };

  const resizeImageToJpeg = (file, maxSide = 1600, quality = 0.82) =>
    new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width <= maxSide && height <= maxSide) {
            return resolve(file);
          }
          const scale = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              resolve(
                new File([blob], file.name.replace(/\.(heic|heif|png|webp)$/i, ".jpg"), {
                  type: "image/jpeg",
                })
              );
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      } catch (e) {
        resolve(file);
      }
    });

  const uploadAuditImage = async (file, qid) => {
    if (!auditId) throw new Error("Missing auditId.");
    const cleanBase = (file.name || "photo.jpg").replace(/[^A-Za-z0-9._-]+/g, "_");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${auditId}/${qid}/${ts}_${cleanBase}`;

    const { error: upErr } = await supabase
      .from("audit-photos")
      .upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
      });
    if (upErr) throw upErr;

    const href = await publicOrSignedUrl("audit-photos", path);
    return { href, path };
  };

  /* ----------------------- Existing file listing -------------------------- */
  const refreshFiles = async () => {
    if (!auditId) return;
    try {
      const { data: files, error } = await supabase.storage
        .from("audit-files")
        .list(`${auditId}`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
      if (error) throw error;

      const items = await Promise.all(
        (files || []).map(async (f) => {
          const path = `${auditId}/${f.name}`;
          const href = await publicOrSignedUrl("audit-files", path);
          return {
            name: f.name,
            href,
            createdAt: f.created_at || f.updated_at || new Date().toISOString(),
            _isObjectUrl: false,
          };
        })
      );

      setGeneratedFiles(items);
    } catch (e) {
      console.warn("Could not list audit files:", e);
    }
  };

  // Load any existing PDFs when the audit loads
  useEffect(() => {
    if (auditId) refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  // --- submits audit, then generates PDF via Netlify function
  const submitAudit = async () => {
    try {
      setIsSubmitting(true); // start loader
      await saveAll();

      const submittedAt = new Date().toISOString();
      const { error } = await supabase
        .from("audits")
        .update({ submitted_at: submittedAt })
        .eq("id", auditId);
      if (error) {
        console.error(error);
        alert(error.message || "Could not submit audit.");
        return;
      }

      const payload = {
        id: auditId,
        store_name: storeName,
        template_name: templateName,
        started_at: audit?.started_at ?? null,
        submitted_at: submittedAt,
        sections: sections.map((s) => ({
          title: s.title,
          questions: (questionsBySection[s.id] || []).map((q) => ({
            code: q.code,
            prompt: q.prompt,
            answer_type: q.answer_type,
            max_points: q.max_points,
            answer: {
              value_bool: draft[q.id]?.value_bool ?? null,
              value_num: draft[q.id]?.value_num ?? null,
              value_text: draft[q.id]?.value_text ?? null,
              notes: draft[q.id]?.notes ?? null,
              photos: draft[q.id]?.photos || [],
            },
          })),
        })),
        file_name_hint: safeAnsi(
          `Audit - ${storeName} - ${new Date(submittedAt).toLocaleDateString("en-GB").replace(/\//g, "")}`
        ),
        send_email: false, // no emails
      };

      const cleanPayload = sanitizeDeep(payload);

      const base = (import.meta.env.VITE_NETLIFY_BASE || "").replace(/\/$/, "");
      const url = base ? `${base}/.netlify/functions/sendAuditPdf` : "/.netlify/functions/sendAuditPdf";

      // First attempt: ask for JSON
      let res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(cleanPayload),
      });

      // If the function actually returned a PDF binary, handle it right away
      const ct = res.headers.get("content-type") || "";
      let nameFromServer = null;
      let href = null;

      if (ct.includes("application/pdf")) {
        const ab = await res.arrayBuffer();
        const base64 = arrayBufferToBase64(ab);
        const uploaded = await uploadPdfToSupabase(base64, `${displayName}.pdf`);
        href = uploaded.href;
      } else {
        // JSON path (original behavior)
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("sendAuditPdf failed:", json);
          const msg =
            res.status === 404
              ? "PDF function not found. Run `netlify dev` (or set VITE_NETLIFY_BASE to your functions server)."
              : json.error || res.statusText;
          alert(`PDF generation failed: ${msg}`);
          return;
        }

        nameFromServer = (json.fileName || `${displayName}.pdf`).replace(/[/\\]+/g, "_");

        // Try URLs from server
        href =
          json.url ||
          json.publicUrl ||
          json.pdfUrl ||
          json.downloadUrl ||
          json.file_url ||
          json.public_url ||
          json.supabasePublicUrl ||
          null;

        // Try bucket/path from server
        if (!href && (json.path || json.storagePath) && (json.bucket || json.bucketName)) {
          try {
            const bucket = json.bucket || json.bucketName;
            const path = json.path || json.storagePath;
            const pub = supabase.storage.from(bucket).getPublicUrl(path);
            href = pub?.data?.publicUrl || href;
            if (!href) {
              const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
              href = signed?.data?.signedUrl || href;
            }
          } catch (e) {
            console.warn("Could not resolve Supabase URL from server path:", e);
          }
        }

        // Try base64/data URL from server
        if (!href) {
          const base64 =
            json.pdf_base64 || json.base64 || json.pdfBase64 || dataUrlToBase64(json.dataUrl || "");
          if (base64) {
            const uploaded = await uploadPdfToSupabase(base64, nameFromServer);
            href = uploaded.href;
          }
        }

        // Still no link? Retry once asking specifically for a PDF binary
        if (!href) {
          const resPdf = await fetch(`${url}?format=pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/pdf",
            },
            body: JSON.stringify(cleanPayload),
          });
          if (resPdf.ok && (resPdf.headers.get("content-type") || "").includes("application/pdf")) {
            const ab = await resPdf.arrayBuffer();
            const base64 = arrayBufferToBase64(ab);
            const uploaded = await uploadPdfToSupabase(base64, nameFromServer || `${displayName}.pdf`);
            href = uploaded.href;
          }
        }
      }

      // Ensure we have a usable link and refresh the table
      const finalName = (nameFromServer || `${displayName}.pdf`).replace(/[/\\]+/g, "_");
      const finalHref = href || "";

      if (!finalHref) {
        alert("Audit submitted but no PDF link was returned. Please check your Netlify function output.");
        return;
      }

      // Optimistic add so the user sees it instantly
      setGeneratedFiles((prev) => [
        {
          name: finalName,
          href: finalHref,
          createdAt: new Date().toISOString(),
          _isObjectUrl: false,
        },
        ...prev,
      ]);

      // Then sync with Storage so the list persists and stays correct
      await refreshFiles();

      alert(`Audit submitted and PDF generated (${finalName})`);
    } catch (e) {
      console.error(e);
      alert(e.message || "Unexpected error submitting audit.");
    } finally {
      setIsSubmitting(false); // stop loader
    }
  };

  /* ----------------------- PREVIOUS AUDITS (create mode) ------------------- */
  const { data: pastAudits = [], isLoading: loadingPastAudits } = useQuery({
    queryKey: ["past_audits", storeIds.join(",")],
    enabled: isCreateMode,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let q = supabase
        .from("audits")
        .select(`
          id, store_id, template_id, started_at, submitted_at,
          stores(name),
          audit_templates(name)
        `)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(50);
      if (storeIds.length > 0) q = q.in("store_id", storeIds);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const [filesByAudit, setFilesByAudit] = useState({});

  const listFilesForAudit = async (aid) => {
    try {
      const { data: files, error } = await supabase.storage.from("audit-files").list(`${aid}`, {
        limit: 100,
      });
      if (error) throw error;
      const items = await Promise.all(
        (files || []).map(async (f) => {
          const path = `${aid}/${f.name}`;
          const href = await publicOrSignedUrl("audit-files", path);
          return { name: f.name, href };
        })
      );
      return items;
    } catch (e) {
      console.warn("Could not list files for audit", aid, e);
      return [];
    }
  };

  useEffect(() => {
    if (!isCreateMode || pastAudits.length === 0) return;
    (async () => {
      const entries = await Promise.all(pastAudits.map(async (a) => [a.id, await listFilesForAudit(a.id)]));
      const map = {};
      for (const [aid, files] of entries) map[aid] = files;
      setFilesByAudit(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateMode, pastAudits]);

  // ---------- RENDER ----------
  if (isCreateMode) {
    return (
      <DashboardLayout title="Audit Editor" profile={profile}>
        <div className="p-4 flex justify-center">
          <div className="w-full max-w-5xl space-y-6">
            <div className="rounded-xl border border-gray-800 p-4 bg-[#151924]">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">Start a new audit</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Store</label>
                  <select
                    className="w-full bg-[#0f131a] border border-gray-700 rounded-md px-3 py-2 text-gray-200"
                    value={selectedStore ?? ""}
                    onChange={(e) => setSelectedStore(e.target.value || null)}
                  >
                    <option value="" disabled>
                      {loadingStores ? "Loading stores…" : "Select a store"}
                    </option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name ?? s.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block text-xs text-gray-400 mb-1">Template</label>
                  <select
                    className="w-full bg-[#0f131a] border border-gray-700 rounded-md px-3 py-2 text-gray-200"
                    value={selectedTemplate ?? ""}
                    onChange={(e) => setSelectedTemplate(e.target.value || null)}
                  >
                    <option value="" disabled>
                      {loadingTemplates ? "Loading templates…" : "Select a template"}
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (v{t.version})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-1 flex items-end">
                  <Button className="w-full" onClick={createAndStart} disabled={!selectedStore || !selectedTemplate}>
                    Create & start audit
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 mt-3">
                You’re signed in as <b>{profile?.first_name} {profile?.last_name}</b>. We’ll record you as the auditor.
              </p>
            </div>

            {/* Previous audits */}
            <div className="rounded-xl border border-gray-800 p-4 bg-[#151924]">
              <div className="text-sm font-semibold text-gray-200 mb-3">Previous audits</div>
              {loadingPastAudits ? (
                <div className="text-gray-400 text-sm">Loading…</div>
              ) : pastAudits.length === 0 ? (
                <div className="text-gray-400 text-sm">No completed audits yet.</div>
              ) : (
                <div className="overflow-x-auto" ref={filesTableRef}>
                  <table className="min-w-full text-sm text-gray-200">
                    <thead className="text-gray-300">
                      <tr>
                        <th className="text-left py-2 pr-4">Submitted</th>
                        <th className="text-left py-2 pr-4">Store</th>
                        <th className="text-left py-2 pr-4">Template</th>
                        <th className="text-left py-2 pr-4">Files</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastAudits.map((a) => {
                        const store = a?.stores?.name ?? `Store ${a.store_id ?? ""}`;
                        const template = a?.audit_templates?.name ?? "Template";
                        const files = filesByAudit[a.id] || null;
                        return (
                          <tr key={a.id} className="border-t border-gray-800 align-top">
                            <td className="py-2 pr-4">
                              {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}
                            </td>
                            <td className="py-2 pr-4">{store}</td>
                            <td className="py-2 pr-4">{template}</td>
                            <td className="py-2 pr-4">
                              {!files ? (
                                <span className="text-gray-400">Loading…</span>
                              ) : files.length === 0 ? (
                                <span className="text-gray-400">No files</span>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {files.map((f, i) => (
                                    <a
                                      key={i}
                                      className="underline hover:no-underline"
                                      href={f.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={f.name}
                                    >
                                      {f.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/audit/${a.id}`)}>
                                Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loadingAudit) {
    return (
      <DashboardLayout title="Audit Editor" profile={profile}>
        <div className="p-4">Loading audit…</div>
      </DashboardLayout>
    );
  }

  if (!audit) {
    return (
      <DashboardLayout title="Audit Editor" profile={profile}>
        <div className="p-4 space-y-4">
          <div>Audit not found.</div>
          <Button variant="outline" onClick={() => navigate("/audit")}>
            Start a new audit
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit Editor" profile={profile}>
      <div className="p-4 flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          {/* Header card */}
          <div className="rounded-xl border border-gray-800 p-4 bg-[#151924]">
            <div className="text-sm text-gray-200">
              <div><b>File:</b> {displayName}.pdf</div>
              <div className="text-[11px] text-gray-400 break-all"><b>Audit ID:</b> {auditId}</div>
              <div><b>Store:</b> {storeName}</div>
              <div><b>Template:</b> {templateName}</div>
              <div><b>Started:</b> {audit.started_at ? new Date(audit.started_at).toLocaleString() : "—"}</div>
              <div><b>Submitted:</b> {audit.submitted_at ? new Date(audit.submitted_at).toLocaleString() : "—"}</div>
            </div>
          </div>

          {/* Sections (form) */}
          {loadingSections || loadingQuestions || loadingAnswers ? (
            <div className="p-4 text-gray-400">Loading questions…</div>
          ) : sections.length === 0 ? (
            <div className="p-4 text-gray-400">No sections in this template.</div>
          ) : (
            sections.map((sec) => (
              <details key={sec.id} className="rounded-xl border border-gray-800 bg-[#151924]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-200">
                  {sec.title}
                </summary>

                <div className="px-4 pb-4 space-y-4">
                  {(questionsBySection[sec.id] || []).map((q) => {
                    const d = draft[q.id] || {};
                    const isYes = d.value_bool === true;
                    const isNo = d.value_bool === false || d.value_bool == null; // default No

                    return (
                      <div key={q.id} className="p-3 rounded-md bg-[#0f131a] border border-gray-800">
                        <div className="text-sm text-gray-200 mb-2">
                          <b>{q.code}</b> — {q.prompt}{" "}
                          {q.max_points ? <span className="text-gray-400">(max {q.max_points})</span> : null}
                        </div>

                        {/* Binary-only questions */}
                        {q.answer_type === "binary" && (
                          <div className="flex gap-5">
                            <label className="flex items-center gap-2 text-white">
                              <input
                                type="radio"
                                name={`bin-${q.id}`}
                                checked={d.value_bool === true}
                                onChange={() => handleChange(q.id, { value_bool: true })}
                              />
                              Yes
                            </label>
                            <label className="flex items-center gap-2 text-white">
                              <input
                                type="radio"
                                name={`bin-${q.id}`}
                                checked={d.value_bool === false || d.value_bool == null}
                                onChange={() => handleChange(q.id, { value_bool: false })}
                              />
                              No
                            </label>
                          </div>
                        )}

                        {/* Score questions */}
{q.answer_type === "score" && (() => {
  const map = scoreMapForMax(q.max_points ?? 0);
  const sel = d.value_text || (
    d.value_num == null
      ? null
      : d.value_num === map.pass
        ? "pass"
        : d.value_num === map.fair
          ? "fair"
          : "fail"
  );

  const choose = (choice) => {
    if (choice === "na") {
      // N/A: no score required, exclude from totals → store null score
      handleChange(q.id, { value_text: "na", value_num: null });
    } else if (choice === "pass") {
      handleChange(q.id, { value_text: "pass", value_num: map.pass });
    } else if (choice === "fair") {
      handleChange(q.id, { value_text: "fair", value_num: map.fair });
    } else if (choice === "fail") {
      handleChange(q.id, { value_text: "fail", value_num: map.fail });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-white">
          <input
            type="radio"
            name={`score-choice-${q.id}`}
            checked={sel === "pass"}
            onChange={() => choose("pass")}
          />
          Pass <span className="text-xs text-gray-400">({map.pass})</span>
        </label>
        <label className="flex items-center gap-2 text-white">
          <input
            type="radio"
            name={`score-choice-${q.id}`}
            checked={sel === "fair"}
            onChange={() => choose("fair")}
          />
          Fair <span className="text-xs text-gray-400">({map.fair})</span>
        </label>
        <label className="flex items-center gap-2 text-white">
          <input
            type="radio"
            name={`score-choice-${q.id}`}
            checked={sel === "fail"}
            onChange={() => choose("fail")}
          />
          Fail <span className="text-xs text-gray-400">({map.fail})</span>
        </label>
        <label className="flex items-center gap-2 text-white">
          <input
            type="radio"
            name={`score-choice-${q.id}`}
            checked={sel === "na"}
            onChange={() => choose("na")}
          />
          N/A <span className="text-xs text-gray-400">(excluded)</span>
        </label>
      </div>

      {/* Tiny helper text */}
      <div className="text-[11px] text-gray-400">
        Max {q.max_points ?? 0}: Pass = {map.pass}, Fair = {map.fair}, Fail = {map.fail}. N/A does not require a score and is excluded from totals.
      </div>
    </div>
  );
})()}


                        {/* Text answers */}
                        {q.answer_type === "text" && (
                          <Textarea
                            rows={3}
                            value={d.value_text ?? ""}
                            onChange={(e) => handleChange(q.id, { value_text: e.target.value })}
                            placeholder="Type your answer"
                          />
                        )}

                        {/* Photo URL + camera/file input */}
                        {q.answer_type === "photo" && (
                          <div className="space-y-2">
                            {d.value_text ? (
                              <div className="flex items-start gap-3">
                                <img
                                  src={d.value_text}
                                  alt="Attached"
                                  className="w-28 h-28 object-cover rounded-md border border-gray-800"
                                />
                                <div className="flex flex-col gap-2">
                                  <div className="text-xs break-all text-gray-400">{d.value_text}</div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(d.value_text, "_blank", "noopener,noreferrer")}
                                    >
                                      Open
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(d.value_text);
                                          alert("Image link copied.");
                                        } catch {
                                          alert("Could not copy.");
                                        }
                                      }}
                                    >
                                      Copy link
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleChange(q.id, { value_text: "" })}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex items-center gap-3">
                              <input
  type="file"
  accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"  // allow iPhone HEIC etc.
  // no `capture` attribute -> lets users choose Camera or Photo Library
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const sized = await resizeImageToJpeg(file);
      const { href } = await uploadAuditImage(sized, q.id);
      handleChange(q.id, { value_text: href });
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to upload image.");
    } finally {
      e.target.value = "";
    }
  }}
  className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-gray-700 file:bg-[#0f131a] file:text-gray-200 file:cursor-pointer"
/>


                              <Input
                                className="flex-1"
                                placeholder="…or paste an image URL"
                                value={d.value_text ?? ""}
                                onChange={(e) => handleChange(q.id, { value_text: e.target.value })}
                              />
                            </div>

                            <p className="text-[11px] text-gray-400">
                              Tip: On mobile, “Take Photo” opens the camera. On desktop, pick a file or paste a URL.
                            </p>
                          </div>
                        )}

                        {/* Notes */}
                        <div className="mt-2">
                          <Textarea
                            rows={2}
                            value={d.notes ?? ""}
                            onChange={(e) => handleChange(q.id, { notes: e.target.value })}
                            placeholder="Notes (optional)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))
          )}

<div className="flex gap-2">
  <Button onClick={saveAll} disabled={savingAnswers || isSubmitting}>
    {savingAnswers ? "Saving..." : "Save"}
  </Button>
  <Button
    variant="outline"
    onClick={submitAudit}
    disabled={savingAnswers || isSubmitting}
  >
    {isSubmitting ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Scheduling...
      </>
    ) : (
      "Submit & generate PDF"
    )}
  </Button>
</div>


          {/* Generated files table */}
          <div className="rounded-xl border border-gray-800 bg-[#151924] p-4" ref={filesTableRef}>
            <div className="text-sm font-semibold text-gray-200 mb-3">Generated files</div>
            {generatedFiles.length === 0 ? (
              <div className="text-gray-400 text-sm">No files generated yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-200">
                  <thead className="text-gray-300">
                    <tr>
                      <th className="text-left py-2 pr-4">Name</th>
                      <th className="text-left py-2 pr-4">Created</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedFiles.map((f, i) => (
                      <tr key={i} className="border-t border-gray-800">
                        <td className="py-2 pr-4 break-all">
                          {f.href ? (
                            <a className="underline hover:no-underline" href={f.href} target="_blank" rel="noopener noreferrer">
                              {f.name}
                            </a>
                          ) : (
                            f.name
                          )}
                        </td>
                        <td className="py-2 pr-4">{new Date(f.createdAt).toLocaleString()}</td>
                        <td className="py-2">
                          {f.href ? (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => { setPreviewHref(f.href); setPreviewName(f.name); }}>
                                Preview
                              </Button>
            <Button
  variant="outline"
  onClick={() => {
    setPreviewHref(null);
    navigate("/audit"); // go to the page that lists all completed audits
  }}
>
  Back to list
</Button>
                            </div>
                          ) : (
                            <span className="text-gray-400">No link provided</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Simple Preview Modal */}
          {previewHref && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-[#151924] w-full max-w-5xl h-[80vh] rounded-xl overflow-hidden border border-gray-800 flex flex-col">
                <div className="p-2 flex items-center justify-between border-b border-gray-800">
                  <div className="text-sm text-gray-200 truncate">{previewName}</div>
                  <div className="flex gap-2">
                    <a
                      className="inline-flex items-center justify-center rounded-md border border-gray-700 px-3 py-1 text-sm"
                      href={previewHref}
                      download={previewName}
                    >
                      Download
                    </a>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewHref(null);
                        // go back to the table smoothly
                        setTimeout(() => filesTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                      }}
                    >
                      Back to list
                    </Button>
                  </div>
                </div>
                <iframe src={previewHref} className="flex-1 w-full h-full" title="PDF preview" />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
