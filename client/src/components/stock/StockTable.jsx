import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";

export default function StockTable({
  rows,
  currentPage,
  totalPages,
  showStoreColumn,
  handleSort,
  getStatusBadgeClass,
  getStatusText,
  handleEditItem,
  currentStoreName,
  isStoreManager,
}) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableCaption>
            Stock of Chaiiwala products as of {new Date().toLocaleDateString()}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <button type="button" className="flex items-center" onClick={() => handleSort("sku")}>
                  SKU
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="flex items-center" onClick={() => handleSort("product")}>
                  Product Name
                </button>
              </TableHead>
              {showStoreColumn && (
                <TableHead>
                  <button type="button" className="flex items-center" onClick={() => handleSort("storeName")}>
                    Store
                  </button>
                </TableHead>
              )}
              <TableHead className="text-right">
                <button type="button" className="flex items-center ml-auto" onClick={() => handleSort("price")}>
                  Price
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button type="button" className="flex items-center mx-auto" onClick={() => handleSort("stock")}>
                  Quantity
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="flex items-center" onClick={() => handleSort("category")}>
                  Category
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="flex items-center" onClick={() => handleSort("status")}>
                  Status
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {isStoreManager
                    ? `No products found for your store (${currentStoreName})`
                    : "No products found matching your criteria"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.sku + "-" + item.storeId}>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.product}</TableCell>
                  {showStoreColumn && (
                    <TableCell>{item.storeName || "-"}</TableCell>
                  )}
                  <TableCell className="text-right">£{item.price?.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{item.stock}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(item.status)}`}>
                      {getStatusText(item.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => handleEditItem(item)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Pagination UI can go here if needed */}
      </div>
    </div>
  );
}
