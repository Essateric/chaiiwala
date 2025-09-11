import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient.js";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import { Button } from "../components/ui/button.jsx";

export default function AuditsList() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["audits-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits")
        .select(`
          id, template_id, store_id, started_at, submitted_at,
          stores ( name ),
          audit_templates ( name )
        `)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
  const ddmmyy = (d) => {
    if (!d) return "";
    const x = new Date(d);
    const dd = String(x.getDate()).padStart(2, "0");
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const yy = String(x.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
  };

  const downloadPdf = async (audit) => {
    // fetch sections/questions/answers for this audit
    const { data: sections, error: secErr } = await supabase
      .from("audit_sections")
      .select("id,title,sort_order")
      .eq("template_id", audit.template_id)
      .order("sort_order");
    if (secErr) return alert(secErr.message);

    const sectionIds = (sections || []).map((s) => s.id);
    const { data: questions, error: qErr } = await supabase
      .from("audit_questions")
      .select("id,section_id,code,prompt,answer_type,max_points,sort_order")
      .in("section_id", sectionIds)
      .order("sort_order");
    if (qErr) return alert(qErr.message);

    const { data: answers, error: aErr } = await supabase
      .from("audit_answers")
      .select("question_id,value_bool,value_num,value_text,notes")
      .eq("audit_id", audit.id);
    if (aErr) return alert(aErr.message);

    const ansMap = new Map();
    for (const a of answers || []) ansMap.set(a.question_id, a);

    // lazy-load jsPDF to avoid bloating main bundle
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;

    const title = "Audit Report";
    doc.setFontSize(16);
    doc.text(title, marginX, 40);

    doc.setFontSize(10);
    doc.text(`Audit ID: ${audit.id}`, marginX, 60);
    doc.text(`Store: ${audit.stores?.name ?? audit.store_id}`, marginX, 75);
    doc.text(`Template: ${audit.audit_templates?.name ?? "Template"}`, marginX, 90);
    doc.text(`Started: ${fmt(audit.started_at)}`, marginX, 105);
    doc.text(`Submitted: ${fmt(audit.submitted_at)}`, marginX, 120);

    // sections + questions
    for (const s of sections || []) {
      doc.setFontSize(12);
      doc.text(s.title, marginX, doc.lastAutoTable ? doc.lastAutoTable.finalY + 24 : 150);

      // build rows
      const rows = [];
      for (const q of questions.filter((x) => x.section_id === s.id)) {
        const a = ansMap.get(q.id) || {};
        let yn = "";
        let score = "";
        if (q.answer_type === "binary") {
          yn = a.value_bool === true ? "Yes" : "No";
        } else if (q.answer_type === "score") {
          yn = a.value_bool === true ? "Yes" : "No";
          score = a.value_num != null ? `${a.value_num} / ${q.max_points}` : "-";
        } else if (q.answer_type === "text") {
          yn = "—";
          score = "—";
        } else if (q.answer_type === "photo") {
          yn = "—";
          score = "Photos/URL";
        }
        rows.push([
          q.code,
          q.prompt,
          yn,
          score || "—",
          a.notes || a.value_text || "",
        ]);
      }

      autoTable(doc, {
        startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 28 : 160,
        head: [["Code", "Question", "Yes/No", "Score", "Notes / Text / Photo URL"]],
        body: rows,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [20, 23, 35] },
        margin: { left: marginX, right: marginX },
      });
    }

    const store = (audit.stores?.name || "Store").replace(/[^\w\-]+/g, "_");
    const datePart = ddmmyy(audit.submitted_at || audit.started_at || new Date());
    const filename = `Audit_${store}_${datePart}.pdf`;
    doc.save(filename);
  };

  return (
    <DashboardLayout title="Audits" profile={profile}>
      <div className="p-4">
        <div className="rounded-xl border border-gray-800 bg-[#151924] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-200 font-semibold">Submitted audits</h2>
            <Button onClick={() => navigate("/audit")}>Start new audit</Button>
          </div>

          {isLoading ? (
            <div className="text-gray-400">Loading…</div>
          ) : audits.length === 0 ? (
            <div className="text-gray-400">No audits yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-300">
                  <tr>
                    <th className="py-2 pr-4">Store</th>
                    <th className="py-2 pr-4">Template</th>
                    <th className="py-2 pr-4">Started</th>
                    <th className="py-2 pr-4">Submitted</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {audits.map((a) => (
                    <tr key={a.id} className="border-t border-gray-800">
                      <td className="py-2 pr-4">{a.stores?.name ?? a.store_id}</td>
                      <td className="py-2 pr-4">{a.audit_templates?.name ?? "Template"}</td>
                      <td className="py-2 pr-4">{fmt(a.started_at)}</td>
                      <td className="py-2 pr-4">{fmt(a.submitted_at)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => navigate(`/audit/${a.id}`)}>
                            View
                          </Button>
                          <Button onClick={() => downloadPdf(a)}>Download PDF</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            PDF files are named <code>Audit_StoreName_ddmmyy.pdf</code>.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
