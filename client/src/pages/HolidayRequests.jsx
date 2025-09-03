import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Textarea } from "../components/ui/textarea.jsx";
import { useAuth } from "../hooks/UseAuth.jsx";
import { useToast } from "../hooks/use-toast.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const REASONS = ["Annual Leave", "Sick", "Personal", "Family", "Training", "Other"];

export default function HolidayRequestsPage() {
  const { user, isLoading: isAuthLoading, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isRegionalOrAdmin = profile?.permissions === "admin" || profile?.permissions === "regional";
  const isStoreManager = profile?.permissions === "store";
  const storeIds = Array.isArray(profile?.store_ids) ? profile.store_ids : [];

  const [updatingId, setUpdatingId] = useState(null);

  const canModerateRow = (r) =>
    r.status === "pending" &&
    (isRegionalOrAdmin || (isStoreManager && storeIds.includes(r.store_id)));

  const updateStatus = async (row, next) => {
    try {
      setUpdatingId(row.id);
      const { error } = await supabase.from("holiday_requests").update({ status: next }).eq("id", row.id);
      if (error) throw error;
      toast({ title: "Status updated", description: `Request ${next}.` });
      queryClient.invalidateQueries({ queryKey: ["holiday_requests"] });
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  // Stores list
  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const defaultStoreId = useMemo(() => {
    if (isRegionalOrAdmin) return stores?.[0]?.id ?? null;
    return Array.isArray(profile?.store_ids) ? profile.store_ids[0] ?? null : null;
  }, [isRegionalOrAdmin, profile?.store_ids, stores]);

  // Form state
  const [managerName, setManagerName] = useState(profile?.name || profile?.first_name || "");
  const [employeeName, setEmployeeName] = useState("");
  const [days, setDays] = useState("");
  const [reasonCategory, setReasonCategory] = useState(REASONS[0]);
  const [reasonOther, setReasonOther] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [storeId, setStoreId] = useState(defaultStoreId);

  useEffect(() => {
    setStoreId((prev) => prev ?? defaultStoreId);
  }, [defaultStoreId]);

  // Requests list (RLS handles scoping)
  const {
    data: requests = [],
    isLoading: isLoadingRequests,
    error: requestsError,
  } = useQuery({
    queryKey: ["holiday_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holiday_requests")
        .select(
          "id, created_at, store_id, manager_name, employee_name, days, reason_category, reason_other, reason_notes, status, stores(name)"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const canSubmit =
    !!user &&
    !!employeeName &&
    Number(days) >= 0 &&
    !!reasonCategory &&
    (!!storeId || isRegionalOrAdmin);

  const clearForm = () => {
    setEmployeeName("");
    setDays("");
    setReasonCategory(REASONS[0]);
    setReasonOther("");
    setReasonNotes("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (reasonCategory === "Other" && !reasonOther.trim()) {
      toast({
        title: "Add the other reason",
        description: "Please type the reason in the box.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      user_id: user.id,
      store_id: storeId ?? null,
      manager_name: managerName || null,
      employee_name: employeeName,
      days: Number(days),
      reason_category: reasonCategory,
      reason_other: reasonCategory === "Other" ? reasonOther.trim() : null,
      reason_notes: reasonNotes?.trim() || null,
      status: "pending",
    };

    const { error } = await supabase.from("holiday_requests").insert([payload]);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Request submitted", description: "Your holiday request has been saved." });
    clearForm();
    queryClient.invalidateQueries({ queryKey: ["holiday_requests"] });
  };

  if (isAuthLoading) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <DashboardLayout title="Holiday Requests" profile={profile} announcements={[]}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Holiday Request</CardTitle>
            <CardDescription>Fill the fields and submit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Store */}
              <div className="grid grid-cols-4 items-center gap-3">
                <label className="text-sm text-gray-600">Store</label>
                <div className="col-span-3">
                  {isRegionalOrAdmin ? (
                    <select
                      className="w-full border rounded p-2"
                      value={storeId ?? ""}
                      onChange={(e) => setStoreId(Number(e.target.value))}
                      required
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        className="w-full border rounded p-2 bg-gray-100"
                        value={stores.find((s) => s.id === storeId)?.name || "Assigned store"}
                        readOnly
                      />
                      <input type="hidden" name="store_id" value={storeId ?? ""} />
                    </>
                  )}
                </div>
              </div>

              {/* Store Manager */}
              <div className="grid grid-cols-4 items-center gap-3">
                <label className="text-sm text-gray-600">Store manager</label>
                <Input
                  className="col-span-3"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. A. Khan"
                />
              </div>

              {/* Requester Name */}
              <div className="grid grid-cols-4 items-center gap-3">
                <label className="text-sm text-gray-600">Name</label>
                <Input
                  className="col-span-3"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  required
                  placeholder="Your name"
                />
              </div>

              {/* Days */}
              <div className="grid grid-cols-4 items-center gap-3">
                <label className="text-sm text-gray-600">Days</label>
                <Input
                  className="col-span-3"
                  type="number"
                  min={0}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  required
                  placeholder="0"
                />
              </div>

              {/* Reason */}
              <div className="grid grid-cols-4 items-center gap-3">
                <label className="text-sm text-gray-600">Reason</label>
                <select
                  className="col-span-3 border rounded p-2"
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  required
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Other reason */}
              {reasonCategory === "Other" && (
                <div className="grid grid-cols-4 items-center gap-3">
                  <label className="text-sm text-gray-600">Other reason</label>
                  <Input
                    className="col-span-3"
                    value={reasonOther}
                    onChange={(e) => setReasonOther(e.target.value)}
                    placeholder="Type the reason"
                    required
                  />
                </div>
              )}

              {/* Notes */}
              <div className="grid grid-cols-4 items-start gap-3">
                <label className="text-sm text-gray-600 mt-2">Notes</label>
                <Textarea
                  className="col-span-3"
                  rows={3}
                  value={reasonNotes}
                  onChange={(e) => setReasonNotes(e.target.value)}
                  placeholder="Any details (optional)"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={!canSubmit}>
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Newest first. You can see your own requests; admins see all.</CardDescription>
          </CardHeader>
          <CardContent>
            {requestsError ? (
              <p className="text-sm text-red-600">Error: {requestsError.message}</p>
            ) : isLoadingRequests ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-gray-500">No requests yet.</p>
            ) : (
           <div className="rounded-md border border-gray-100 overflow-x-auto">
  {/* change table-fixed -> table-auto */}
  <table className="w-full text-sm text-gray-700 table-auto">
                  <thead className="bg-gray-50">
                    <tr className="text-left border-b text-xs text-gray-400">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Store</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Days</th>
                      <th className="py-2 px-3">Reason</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 w-64">Notes</th>
                      <th className="py-2 px-3 w-32 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => {
                      const dateStr = new Date(r.created_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const reason =
                        r.reason_category === "Other"
                          ? r.reason_other || "Other"
                          : r.reason_category;

                      return (
                        <tr key={r.id} className="border-b">
                          <td className="py-2 px-3 whitespace-nowrap">{dateStr}</td>
                          <td className="py-2 px--5">{r.stores?.name || "—"}</td>
                          <td className="py-2 px-3">{r.employee_name}</td>
                          <td className="py-2 px-3">{r.days}</td>
                          <td className="py-2 px-3">{reason}</td>
                          <td className="py-2 px-3">
                            {r.status === "approved" ? (
                              <span className="text-green-600 font-semibold">Approved</span>
                            ) : r.status === "rejected" ? (
                              <span className="text-red-600 font-semibold">Rejected</span>
                            ) : (
                              <span className="text-yellow-600 font-semibold">Pending</span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="py-2 px-3 align-top">
                            <div className="whitespace-pre-wrap break-words text-gray-700 max-w-prose">
                              {r.reason_notes?.trim() ? r.reason_notes : "—"}
                            </div>
                          </td>

                          {/* Action (bounded) */}
                          <td className="py-2 px-3 w-32 text-right">
                            {canModerateRow(r) ? (
                              <select
                                className="border rounded p-1 text-xs w-full max-w-[128px]"
                                disabled={updatingId === r.id}
                                defaultValue=""
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v) updateStatus(r, v);
                                }}
                              >
                                <option value="" disabled>
                                  Set status…
                                </option>
                                <option value="approved">Approve</option>
                                <option value="rejected">Reject</option>
                              </select>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
