import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  location: string;
  quantity: string;
  status: "in_stock" | "low_stock" | "out_of_stock" | "on_order";
  lastUpdated: string;
}

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (id: string) => void;
}

export default function InventoryTable({ items, onEdit }: InventoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const { toast } = useToast();

  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: InventoryItem["status"]) => {
    switch (status) {
      case "in_stock":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">In Stock</Badge>;
      case "low_stock":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Low Stock</Badge>;
      case "out_of_stock":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Out of Stock</Badge>;
      case "on_order":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">On Order</Badge>;
      default:
        return null;
    }
  };

  const handleEdit = (id: string) => {
    onEdit(id);
    toast({
      title: "Edit Item",
      description: `Editing item #${id}`,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="px-6 py-3">Item</TableHead>
              <TableHead className="px-6 py-3">Category</TableHead>
              <TableHead className="px-6 py-3">Location</TableHead>
              <TableHead className="px-6 py-3">Quantity</TableHead>
              <TableHead className="px-6 py-3">Status</TableHead>
              <TableHead className="px-6 py-3">Last Updated</TableHead>
              <TableHead className="px-6 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50">
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center">
                      <span className="text-gray-500 text-xs font-medium">{item.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">#{item.sku}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.category}</div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.location}</div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.quantity}</div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(item.status)}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.lastUpdated}
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button 
                    variant="ghost" 
                    className="text-chai-gold hover:text-yellow-800 hover:bg-transparent"
                    onClick={() => handleEdit(item.id)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="bg-white px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="hidden sm:block">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, items.length)}
              </span>{" "}
              of <span className="font-medium">{items.length}</span> results
            </p>
          </div>
          <div className="flex items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="mr-2"
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                className={cn(
                  "mx-1 min-w-[40px]",
                  page === currentPage ? "bg-chai-gold hover:bg-yellow-600" : ""
                )}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-2"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
