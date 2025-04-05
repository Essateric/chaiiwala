import { Store } from "@shared/schema";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StoreSelectorProps {
  stores: Store[];
  selectedStoreId: number | null;
  onSelectStore: (storeId: number | null) => void;
  isLoading: boolean;
  includeAllStoresOption?: boolean;
}

export default function StoreSelector({
  stores,
  selectedStoreId,
  onSelectStore,
  isLoading,
  includeAllStoresOption = true,
}: StoreSelectorProps) {
  if (isLoading) {
    return (
      <div className="bg-dark-secondary border border-gray-700 rounded-md px-4 py-2 flex items-center justify-center w-48">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-400">Loading stores...</span>
      </div>
    );
  }
  
  const handleStoreChange = (value: string) => {
    if (value === "all") {
      onSelectStore(null);
    } else {
      onSelectStore(parseInt(value));
    }
  };

  return (
    <div className="relative">
      <Select
        value={selectedStoreId?.toString() || (includeAllStoresOption ? "all" : "")}
        onValueChange={handleStoreChange}
      >
        <SelectTrigger className="bg-dark-secondary border border-gray-700 rounded-md w-48">
          <SelectValue placeholder="Select a store" />
        </SelectTrigger>
        <SelectContent className="bg-dark-secondary border-gray-700">
          {includeAllStoresOption && (
            <SelectItem value="all">All Stores</SelectItem>
          )}
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
