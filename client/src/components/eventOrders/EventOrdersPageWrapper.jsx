import React, { useState, useEffect, useMemo } from "react";
import EventOrdersPage from "./EventOrdersPageContent";

// Extracting the main logic to a separate component to avoid re-renders during layout composition
export default function EventOrdersPageWrapper() {
  const [canRenderPage, setCanRenderPage] = useState(false);

  useEffect(() => {
    // Delay render to allow for any top-level auth/context/state to settle
    const timeout = setTimeout(() => setCanRenderPage(true), 10);
    return () => clearTimeout(timeout);
  }, []);

  return canRenderPage ? <EventOrdersPage /> : null;
}
