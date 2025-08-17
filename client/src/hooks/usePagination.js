import { useState } from "react";

export default function usePagination(itemsPerPage = 8) {
  const [page, setPage] = useState(1);

  function paginate(items) {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }

  function next(items) {
    const maxPage = Math.ceil(items.length / itemsPerPage);
    setPage((p) => Math.min(p + 1, maxPage));
  }

  function prev() {
    setPage((p) => Math.max(p - 1, 1));
  }

  function reset() {
    setPage(1);
  }

  return { page, paginate, next, prev, reset, itemsPerPage };
}
