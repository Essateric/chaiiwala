// File: src/pages/ChaiiwalaOrderHistory.jsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

export default function ChaiiwalaOrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const { data, error } = await supabase
        .from("chaiiwala_orders")
        .select("id, store_id, store_name, uploaded_at, archive_url")
        .order("uploaded_at", { ascending: false });

      if (!error) setOrders(data);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Chaiiwala Order History</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2">Store</th>
              <th className="text-left p-2">Uploaded At</th>
              <th className="text-left p-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-2">{order.store_name}</td>
                <td className="p-2">{format(new Date(order.uploaded_at), "dd MMM yyyy HH:mm")}</td>
                <td className="p-2">
                  {order.archive_url ? (
                    <a
                      href={order.archive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
