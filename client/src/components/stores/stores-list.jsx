import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";

export function StoresList() {
  // Fetch stores data
  const { data: stores = [] } = useQuery({
    queryKey: ["/api/stores"],
  });

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg font-medium leading-6 text-gray-900">All Stores</h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {stores.map((store) => (
          <li key={store.id}>
            <div className="px-6 py-4 flex items-center">
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <div className="flex text-sm">
                    <p className="font-medium text-chai-gold truncate">{store.name}</p>
                    <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                      • Area {store.area}
                    </p>
                  </div>
                  <div className="mt-2 flex">
                    <div className="flex items-center text-sm text-gray-500">
                      <Store className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <p>{store.address}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex-shrink-0 sm:mt-0">
                  <div className="flex overflow-hidden">
                    <p className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {store.manager}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
