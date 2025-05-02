import React from "react";
import { cn } from "@/lib/utils";

export function RI({ icon, className }) {
  return <i className={cn(`ri-${icon}`, className)} />;
}
