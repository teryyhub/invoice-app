// src/components/ui/DynamicDateRangePicker.jsx
import React, { useState, useRef, useEffect } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DynamicDateRangePicker({ startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateDisplay = () => {
    if (!startDate && !endDate) return "Select date range";
    const startStr = startDate ? format(new Date(startDate), "dd/MM/yyyy") : "Start";
    const endStr = endDate ? format(new Date(endDate), "dd/MM/yyyy") : "End";
    return `${startStr} — ${endStr}`;
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Single Calendar Box Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded border border-border bg-card text-xs text-foreground cursor-pointer hover:border-primary/50 transition-colors select-none"
      >
        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] font-medium truncate">{formatDateDisplay()}</span>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: "", end: "" });
            }}
            className="text-muted-foreground hover:text-foreground ml-1"
            title="Clear dates"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Popover Calendar Box */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-lg p-3 w-64 space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">From Date</label>
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => onChange({ start: e.target.value, end: endDate })}
              className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">To Date</label>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => onChange({ start: startDate, end: e.target.value })}
              className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ start: "", end: "" });
                setIsOpen(false);
              }}
              className="h-6 px-2 text-[10px] text-muted-foreground"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 px-3 text-[10px]"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}