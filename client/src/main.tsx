import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// This ensures the DOM is fully loaded before React renders
document.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  createRoot(rootElement).render(<App />);
});
