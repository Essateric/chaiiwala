import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Filter } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function EventOrderTable({
  profile,
  stores,
  eventOrders,
  filterStoreId,
  filterStatus,
  setFilterStoreId,
  setFilterStatus,
  updateEventOrder,
}) {
  const canUpdateStatus = (order) => {
    if (!profile) return false;
    if (["admin", "regional"].includes(profile.permissions)) return true;
    if (profile.permissions === "store" && profile.storeId === order.storeId) return true;
    if (profile.permissions === "area" && profile.store_ids?.includes(order.storeId)) return true;
    return false;
  };

  const filteredOrders = eventOrders.filter((order) => {
    let show = true;
    if (filterStoreId && profile?.role !== "store") {
      show = show && order.storeId === filterStoreId;
    }
    if (filterStatus) {
      show = show && order.status === filterStatus;
    }
    return show;
  });

  const filterDropdownStores = React.useMemo(() => {
    if (!stores) return [];
    if (profile?.role === "area") {
      return stores.filter((s) => profile.store_ids?.includes(s.id));
    }
    return stores;
  }, [stores, profile]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Orders</CardTitle>
        <CardDescription>Manage upcoming and past events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          {profile && ["admin", "regional", "area"].includes(profile.permissions) && (
            <Select
              value={filterStoreId?.toString() || "all"}
              onValueChange={(val) =>
                setFilterStoreId(val === "all" ? undefined : parseInt(val))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {filterDropdownStores.map((store) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={filterStatus || "all"}
            onValueChange={(val) => setFilterStatus(val === "all" ? undefined : val)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>Status</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No event orders found</h3>
            <p className="text-muted-foreground mt-2">
              {filterStoreId || filterStatus
                ? "Try adjusting your filters."
                : "Create a new event order to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Booked By</TableHead>
                  <TableHead className="text-right">Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const store = stores.find((s) => s.id === order.storeId);
                  return (
                    <TableRow key={order.id}>
                      <TableCell>{order.eventDate} {order.eventTime}</TableCell>
                      <TableCell>{order.venue}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.product}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>{store?.name || `Store ${order.storeId}`}</TableCell>
                      <TableCell>{order.bookedBy}</TableCell>
                      <TableCell className="text-right">
                        {canUpdateStatus(order) && (
                          <Select
                            value={order.status}
                            onValueChange={(val) => updateEventOrder({ id: order.id, data: { status: val } })}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Change Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {order.status === "pending" && (
                                <>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </>
                              )}
                              {order.status === "confirmed" && (
                                <SelectItem value="completed">Completed</SelectItem>
                              )}
                              {(order.status === "completed" || order.status === "cancelled") && (
                                <SelectItem value={order.status} disabled>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)} (Final)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
