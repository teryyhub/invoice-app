// src/components/ui/FlowCalendarPicker.jsx
import React, { useState, useRef, useEffect } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isWithinInterval, 
  addMonths, 
  subMonths, 
  isValid, 
  parseISO 
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FlowCalendarPicker({ startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse incoming string dates to Date objects for comparison
  const start = startDate ? parseISO(startDate) : null;
  const end = endDate ? parseISO(endDate) : null;

  const handleDayClick = (day) => {
    // Case 1: Neither start nor end selected, OR both already selected (reset flow)
    if (!start || (start && end)) {
      onChange({ start: format(day, "yyyy-MM-dd"), end: "" });
      return;
    }

    // Case 2: Start is selected, but not end
    if (start && !end) {
      if (isSameDay(day, start)) {
        // Clicking the same day treats it as a single-day selection
        onChange({ start: format(day, "yyyy-MM-dd"), end: format(day, "yyyy-MM-dd") });
        setIsOpen(false);
      } else if (day < start) {
        // If clicked date is before start, reset start to this new date
        onChange({ start: format(day, "yyyy-MM-dd"), end: "" });
      } else {
        // Set as end date and complete the flow range
        onChange({ start: format(start, "yyyy-MM-dd"), end: format(day, "yyyy-MM-dd") });
        setIsOpen(false);
      }
    }
  };

  const formatDisplayLabel = () => {
    if (!start) return "Select date range";
    const startStr = isValid(start) ? format(start, "dd/MM/yyyy") : "";
    const endStr = end && isValid(end) ? format(end, "dd/MM/yyyy") : "";

    if (!endStr || startStr === endStr) {
      return startStr; // Single day or start only
    }
    return `${startStr} — ${endStr}`;
  };

  // Generate days for the active month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay(); // 0 (Sun) to 6 (Sat)

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-card text-xs text-foreground cursor-pointer hover:border-primary/60 transition-colors select-none shadow-2xs"
      >
        <CalendarIcon className="w-3 h-3 text-primary shrink-0" />
        <span className="text-[11px] font-medium truncate">{formatDisplayLabel()}</span>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: "", end: "" });
            }}
            className="text-muted-foreground hover:text-foreground ml-1 p-0.5 rounded-full hover:bg-muted"
            title="Clear dates"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Single Month Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 w-64 space-y-2.5 animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Month Navigation Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
            {/* Empty slots for offset days */}
            {Array.from({ length: startDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {daysInMonth.map((day) => {
              const isSelectedStart = start && isSameDay(day, start);
              const isSelectedEnd = end && isSameDay(day, end);
              const isInBetween = start && end && isWithinInterval(day, { start, end });

              let btnStyle = "hover:bg-accent hover:text-accent-foreground text-foreground rounded-md";
              if (isSelectedStart || isSelectedEnd) {
                btnStyle = "bg-primary text-primary-foreground font-bold rounded-md shadow-2xs";
              } else if (isInBetween) {
                btnStyle = "bg-primary/15 text-primary rounded-none font-medium";
              }

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={`h-7 w-full flex items-center justify-center text-[11px] transition-colors ${btnStyle}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ start: "", end: "" });
                setIsOpen(false);
              }}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (start && !end) {
                  onChange({ start: format(start, "yyyy-MM-dd"), end: format(start, "yyyy-MM-dd") });
                }
                setIsOpen(false);
              }}
              className="h-6 px-3 text-[10px] font-semibold shadow-none"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}