import React from "react";
import { cn } from "@/lib/utils";

interface RIProps {
  icon: string;
  className?: string;
}

export function RI({ icon, className }: RIProps) {
  return <i className={cn(`ri-${icon}`, className)} />;
}
