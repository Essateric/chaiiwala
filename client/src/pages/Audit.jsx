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
      .select("id, store_id, template_id, started_at, submitted_at")
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

  const templateId = audit?.template_id ?? null;
  const storeName = audit?.stores?.name ?? audit?.store_id ?? "—";
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
            `${a.question_id}|${a.value_bool ?? ""}|${a.value_num ?? ""}|${
              a.value_text ?? ""
            }|${a.notes ?? ""}`
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
        row.value_bool = d.value_bool ?? null; // yes/no alongside score
        row.value_num = d.value_num ?? null;
      } else if (q.answer_type === "text" || q.answer_type === "photo") {
        row.value_text = d.value_text ?? null;
      }
      rows.push(row);
    }
    if (!rows.length) return;
    const { error } = await supabase.from("audit_answers").upsert(rows).select("id");
    if (error) {
      console.error(error);
      alert(error.message || "Could not save answers.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["audit_answers", auditId] });
    alert("Saved.");
  };

  // --- submits audit, then generates & emails PDF via Netlify function
  const submitAudit = async () => {
    try {
      // 1) persist any edits first
      await saveAll();

      // 2) mark as submitted
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

      // 3) build the PDF payload from current view state
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
        // optional routing override
        email_to: "audits@chaiiwala.co.uk",
        // optional name hint (server can ignore)
        file_name_hint: safeAnsi(
          `Audit - ${storeName} - ${new Date(submittedAt)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "")}`
        ),
      };

      // 4) sanitize the payload for PDF (FIX for WinAnsi error)
      const cleanPayload = sanitizeDeep(payload);

      // 5) call the Netlify function
      const base = (import.meta.env.VITE_NETLIFY_BASE || "").replace(/\/$/, "");
      const url = base
        ? `${base}/.netlify/functions/sendAuditPdf`
        : "/.netlify/functions/sendAuditPdf";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("sendAuditPdf failed:", json);
        alert(`PDF/email failed: ${json.error || res.statusText}`);
        return;
      }

      alert(
        `Audit submitted and emailed${json.fileName ? ` (${json.fileName})` : ""}`
      );

      // (optional) navigate to an “Audit History” page after submit
      // navigate("/audit");
    } catch (e) {
      console.error(e);
      alert(e.message || "Unexpected error submitting audit.");
    }
  };

  // ---------- RENDER ----------
  if (isCreateMode) {
    return (
      <DashboardLayout title="Audit Editor" profile={profile}>
        <div className="p-4 flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            <div className="rounded-xl border border-gray-800 p-4 bg-[#151924]">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">
                Start a new audit
              </h2>

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
                  <Button
                    className="w-full"
                    onClick={createAndStart}
                    disabled={!selectedStore || !selectedTemplate}
                  >
                    Create & start audit
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 mt-3">
                You’re signed in as <b>{profile?.first_name} {profile?.last_name}</b>. We’ll record you as the auditor.
              </p>
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
              <div><b>Audit:</b> {auditId}</div>
              <div><b>Store:</b> {storeName}</div>
              <div><b>Template:</b> {templateName}</div>
              <div><b>Started:</b> {audit.started_at ? new Date(audit.started_at).toLocaleString() : "—"}</div>
              <div><b>Submitted:</b> {audit.submitted_at ? new Date(audit.submitted_at).toLocaleString() : "—"}</div>
            </div>
          </div>

          {/* Sections */}
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

                        {/* Score questions: default No, disable score until Yes */}
                        {q.answer_type === "score" && (
                          <div className="flex items-center gap-4">
                            <div className="flex gap-5">
                              <label className="flex items-center gap-2 text-white">
                                <input
                                  type="radio"
                                  name={`score-bin-${q.id}`}
                                  checked={isYes}
                                  onChange={() =>
                                    handleChange(q.id, {
                                      value_bool: true,
                                      value_num: d.value_num ?? null,
                                    })
                                  }
                                />
                                Yes
                              </label>
                              <label className="flex items-center gap-2 text-white">
                                <input
                                  type="radio"
                                  name={`score-bin-${q.id}`}
                                  checked={isNo}
                                  onChange={() =>
                                    handleChange(q.id, {
                                      value_bool: false,
                                      value_num: null, // clear score when No
                                    })
                                  }
                                />
                                No
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-300 text-xs">Score</span>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={q.max_points ?? 999}
                                placeholder={`0–${q.max_points ?? 0}`}
                                value={d.value_num ?? ""}
                                disabled={!isYes}
                                className="w-20"
                                onChange={(e) => {
                                  const raw = e.target.value === "" ? null : Number(e.target.value);
                                  const clamped = raw == null ? null : clamp(raw, 0, q.max_points ?? 0);
                                  handleChange(q.id, { value_num: clamped });
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Text answers */}
                        {q.answer_type === "text" && (
                          <Textarea
                            rows={3}
                            value={d.value_text ?? ""}
                            onChange={(e) => handleChange(q.id, { value_text: e.target.value })}
                            placeholder="Type your answer"
                          />
                        )}

                        {/* Photo URL */}
                        {q.answer_type === "photo" && (
                          <>
                            <Input
                              placeholder="Photo URL"
                              value={d.value_text ?? ""}
                              onChange={(e) => handleChange(q.id, { value_text: e.target.value })}
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                              Store the uploaded image URL in this field.
                            </p>
                          </>
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
            <Button onClick={saveAll}>Save</Button>
            <Button variant="outline" onClick={submitAudit}>Submit audit</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
