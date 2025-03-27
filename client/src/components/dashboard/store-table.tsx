import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useLocation } from "wouter";

interface StoreLocation {
  id: number;
  name: string;
  address: string;
  area: number;
  manager: string;
}

interface StoreTableProps {
  stores: StoreLocation[];
  limit?: number;
}

export default function StoreTable({ stores, limit }: StoreTableProps) {
  const [, setLocation] = useLocation();
  const displayedStores = limit ? stores.slice(0, limit) : stores;

  const handleRowClick = () => {
    setLocation("/stores");
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-montserrat font-semibold text-lg">Store Locations</h3>
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            setLocation("/stores");
          }} 
          className="text-chai-gold hover:underline text-sm font-medium"
        >
          View All
        </a>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="px-6 py-3 text-left">Location</TableHead>
              <TableHead className="px-6 py-3 text-left">Address</TableHead>
              <TableHead className="px-6 py-3 text-left">Area</TableHead>
              <TableHead className="px-6 py-3 text-left">Manager</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedStores.map((store) => (
              <TableRow 
                key={store.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={handleRowClick}
              >
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{store.name}</div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{store.address}</div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{store.area}</div>
                </TableCell>
                <TableCell className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{store.manager}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
