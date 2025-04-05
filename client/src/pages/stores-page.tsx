import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Phone, Mail } from "lucide-react";
import { useState } from "react";

export default function StoresPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: stores, isLoading } = useQuery({
    queryKey: ["/api/stores"],
  });
  
  // Filter stores based on search query
  const filteredStores = stores?.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Store Locations</h2>
            <p className="text-gray-400">Manage and monitor all Chaiwala store locations</p>
          </div>
          
          <Button className="bg-gold hover:bg-gold-dark text-dark">
            <Plus className="h-4 w-4 mr-2" />
            Add New Store
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search stores..."
              className="pl-9 bg-dark-secondary border-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Stores Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">
            Loading store data...
          </div>
        ) : filteredStores && filteredStores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <Card key={store.id} className="bg-dark-secondary border-gray-700 overflow-hidden">
                <div className="h-32 bg-dark flex items-center justify-center">
                  <div className="text-gold text-5xl font-bold">
                    {store.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle>{store.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-2 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm">{store.address}</p>
                        <p className="text-sm">{store.city}, {store.postalCode}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 mr-2 text-gray-400" />
                      <p className="text-sm">{store.phone}</p>
                    </div>
                    
                    {store.email && (
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-gray-400" />
                        <p className="text-sm">{store.email}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" className="text-xs border-gray-700">
                        View Details
                      </Button>
                      <Button variant="outline" className="text-xs border-gray-700">
                        Manage Store
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            No stores found matching your search.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
