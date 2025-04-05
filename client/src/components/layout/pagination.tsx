import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 3;
    
    // Always show first, last, and pages around current
    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if there are not too many
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show first page
      pageNumbers.push(1);
      
      // Show ellipsis or additional page numbers
      if (currentPage > 2) {
        if (currentPage > 3) {
          pageNumbers.push('ellipsis-start');
        }
        pageNumbers.push(currentPage - 1);
      }
      
      // Show current page if not first or last
      if (currentPage !== 1 && currentPage !== totalPages) {
        pageNumbers.push(currentPage);
      }
      
      // Show additional page numbers and ellipsis
      if (currentPage < totalPages - 1) {
        pageNumbers.push(currentPage + 1);
        if (currentPage < totalPages - 2) {
          pageNumbers.push('ellipsis-end');
        }
      }
      
      // Show last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers.map((page, index) => {
      if (page === 'ellipsis-start' || page === 'ellipsis-end') {
        return (
          <span 
            key={`ellipsis-${index}`}
            className="relative inline-flex items-center px-4 py-2 border border-gray-700 bg-[#2d3142] text-sm font-medium text-gray-400"
          >
            ...
          </span>
        );
      }
      
      return (
        <Button
          key={page}
          onClick={() => onPageChange(page as number)}
          variant="outline"
          className={`border-gray-700 ${
            currentPage === page 
              ? "bg-[#d4af37] text-black border-[#d4af37]" 
              : "bg-[#2d3142] text-gray-400 hover:bg-[#1c1f2a]"
          }`}
        >
          {page}
        </Button>
      );
    });
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-3 border-t border-gray-700">
      <div className="mb-4 md:mb-0">
        <p className="text-sm text-gray-400">
          Showing <span className="font-medium">{startItem}</span> to{" "}
          <span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{totalItems}</span> results
        </p>
      </div>
      <div className="flex justify-between md:justify-end">
        <div className="flex space-x-1">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            variant="outline"
            size="icon"
            className="border-gray-700 bg-[#2d3142] text-gray-400 hover:bg-[#1c1f2a]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="hidden md:flex space-x-1">
            {renderPageNumbers()}
          </div>
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            variant="outline"
            size="icon"
            className="border-gray-700 bg-[#2d3142] text-gray-400 hover:bg-[#1c1f2a]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
