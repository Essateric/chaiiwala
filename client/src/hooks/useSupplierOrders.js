import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient'; // Adjust path as needed

export function useSupplierOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (error, context) => {
    console.error(`Error ${context}:`, error);
    setError(error);
    setLoading(false);
  };

  // Fetch orders with optional filters
  // Filters could be an object like { status: 'Awaiting Confirmation', store_id: 123 }
  const fetchOrders = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);


    try {
      let query = supabase.from('freshways_orders').select(`
        *,
        stores (name, store_code)
      `); // Fetching related store name

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.store_id) {
        query = query.eq('store_id', filters.store_id);
      }
      if (filters.supplier_name) {
        query = query.eq('supplier_name', filters.supplier_name);
      }
      // Add more filters as needed (e.g., date range)
      if (filters.store_ids && Array.isArray(filters.store_ids) && filters.store_ids.length > 0) {
  query = query.in('store_id', filters.store_ids);
}
if (filters.supplier_name) {
  query = query.eq('supplier_name', filters.supplier_name);
}

      query = query.order('created_at', { ascending: false }); // Default order

      const { data, error: fetchError } = await query;

      if (fetchError) {
        handleError(fetchError, 'fetching orders');
        setOrders([]); // Clear orders on error
      } else {
        setOrders(data || []);
      }
    } catch (e) {
      handleError(e, 'fetching orders');
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Add a new order (primarily for consistency, dialog handles its own insert now)
  const addOrder = async (orderDetails) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('freshways_orders')
        .insert([orderDetails])
        .select();

      if (insertError) {
        handleError(insertError, 'adding order');
        return null;
      }
      // Optionally, refetch orders or update local state if this hook manages a global list
      // For now, just returns the newly added order
      return data ? data[0] : null;
    } catch (e) {
      handleError(e, 'adding order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update the status of an existing order
  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from('freshways_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() }) // Ensure updated_at is touched
        .eq('id', orderId)
        .select();

      if (updateError) {
        handleError(updateError, 'updating order status');
        return false;
      }
      // After updating, refetch orders to reflect the change in any component using `orders`
      // Or, more efficiently, update the specific order in the local `orders` state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus, updated_at: data[0]?.updated_at } : order
        )
      );
      return true;
    } catch (e) {
      handleError(e, 'updating order status');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch a single order by its ID (useful for detail views)
  const fetchOrderById = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('freshways_orders')
        .select(`
          *,
          stores (name, store_code)
        `)
        .eq('id', orderId)
        .single(); // Use .single() if you expect only one row

      if (fetchError) {
        handleError(fetchError, `fetching order by ID ${orderId}`);
        return null;
      }
      return data;
    } catch (e) {
      handleError(e, `fetching order by ID ${orderId}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);


  return { orders, loading, error, fetchOrders, addOrder, updateOrderStatus, fetchOrderById };
}
