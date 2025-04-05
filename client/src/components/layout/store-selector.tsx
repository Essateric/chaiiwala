import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store } from "@/hooks/use-auth";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface StoreInfo {
  id: number;
  name: string;
}

interface StoreSelectorProps {
  onStoreChange: (storeId: number | null) => void;
  selectedStoreId: number | null;
}

export function StoreSelector({ onStoreChange, selectedStoreId }: StoreSelectorProps) {
  const { 
    data: stores,
    isLoading,
    error
  } = useQuery<StoreInfo[]>({
    queryKey: ['/api/stores'],
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-48" />;
  }

  if (error || !stores) {
    return (
      <div className="text-sm text-red-500">
        Failed to load stores
      </div>
    );
  }

  return (
    <div className="mt-4 md:mt-0 w-full md:w-auto">
      <Select
        value={selectedStoreId?.toString() || "all"}
        onValueChange={(value) => {
          if (value === "all") {
            onStoreChange(null);
          } else {
            onStoreChange(parseInt(value));
          }
        }}
      >
        <SelectTrigger className="w-full md:w-[200px] bg-[#2d3142] border-gray-700">
          <SelectValue placeholder="Select a store" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stores</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id.toString()}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
