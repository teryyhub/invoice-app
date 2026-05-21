import React from "react";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef(({ className = "", ...props }, ref) => {
  return (
    <div
      role="switch"
      {...props}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        props.checked ? "bg-primary" : "bg-input",
        className
      )}
    >
      <div 
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-all",
          props.checked ? "translate-x-4" : "translate-x-1"
        )} 
      />
    </div>
  );
});

Switch.displayName = "Switch";

export default Switch;
