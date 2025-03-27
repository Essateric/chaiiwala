import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface InventoryFiltersProps {
  onSearch: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  locations: { id: number; name: string }[];
}

export default function InventoryFilters({
  onSearch,
  onCategoryChange,
  onLocationChange,
  onStatusChange,
  locations
}: InventoryFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Input 
              placeholder="Search inventory..." 
              className="pl-10 pr-4" 
              onChange={(e) => onSearch(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/5">
          <Select onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              <SelectItem value="tea_chai">Tea & Chai</SelectItem>
              <SelectItem value="food_ingredients">Food Ingredients</SelectItem>
              <SelectItem value="beverages">Beverages</SelectItem>
              <SelectItem value="packaging">Packaging</SelectItem>
              <SelectItem value="utensils">Utensils</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/5">
          <Select onValueChange={onLocationChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-1/5">
          <Select onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              <SelectItem value="on_order">On Order</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
