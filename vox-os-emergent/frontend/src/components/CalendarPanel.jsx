import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Grid3X3,
  List,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";

const VIEW_MODES = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day",
};

export default function CalendarPanel({ 
  events = [], 
  onDateSelect, 
  onAddEvent, 
  onEditEvent, 
  onDeleteEvent,
  isConnected = false 
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(VIEW_MODES.MONTH);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => {
      const eventDate = event.start?.split("T")[0] || event.date;
      return eventDate === dateStr;
    });
  };

  // Get events for current week
  const getWeekEvents = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    const weekEvents = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekEvents.push({
        date: day,
        events: getEventsForDate(day),
      });
    }
    return weekEvents;
  };

  // Format time from ISO string
  const formatTime = (isoString) => {
    if (!isoString || !isoString.includes("T")) return "All day";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { 
        hour: "numeric", 
        minute: "2-digit",
        hour12: true 
      });
    } catch {
      return isoString;
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Navigate month
  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // Navigate week
  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  // Navigate day
  const navigateDay = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);
    }
  };

  // Get dates with events for calendar dots
  const datesWithEvents = events.map((e) => {
    const dateStr = e.start?.split("T")[0] || e.date;
    return new Date(dateStr + "T00:00:00");
  });

  // Render event item
  const renderEvent = (event, compact = false) => (
    <div
      key={event.id}
      className={`p-2 rounded-lg bg-black/40 border-l-2 border-neon-cyan/50 ${
        compact ? "text-[10px]" : "text-xs"
      } group relative`}
      data-testid={`event-${event.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-soft mb-1">
          <Clock className="w-3 h-3" />
          <span>{event.is_all_day ? "All day" : formatTime(event.start)}</span>
        </div>
        {/* Edit/Delete buttons - only show when connected */}
        {isConnected && !compact && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditEvent?.(event);
              }}
              className="p-1 text-soft hover:text-neon-cyan"
              data-testid={`edit-event-${event.id}`}
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEvent?.(event.id);
              }}
              className="p-1 text-soft hover:text-neon-orange"
              data-testid={`delete-event-${event.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <div className={`font-medium text-white/90 ${compact ? "truncate" : ""}`}>
        {event.title}
      </div>
      {!compact && event.location && (
        <div className="flex items-center gap-1 text-soft mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
      {!compact && event.html_link && (
        <a
          href={event.html_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-neon-cyan/70 hover:text-neon-cyan mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          <span>Open</span>
        </a>
      )}
    </div>
  );

  // Render Month View
  const renderMonthView = () => (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="rounded-md"
        modifiers={{
          hasEvents: datesWithEvents,
        }}
        modifiersStyles={{
          hasEvents: {
            fontWeight: "bold",
            textDecoration: "underline",
            textDecorationColor: "#00f6ff",
          },
        }}
      />
      
      {/* Selected date events */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-soft">
            {formatDate(selectedDate)}
          </div>
          {isConnected && (
            <button
              onClick={() => onAddEvent?.(selectedDate)}
              className="console-button text-[10px] px-2 py-1"
              data-testid="add-event-btn"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {getEventsForDate(selectedDate).length > 0 ? (
            getEventsForDate(selectedDate).map((event) => renderEvent(event))
          ) : (
            <p className="text-xs text-soft/60 text-center py-2">
              {isConnected ? "No events - click Add to create one" : "No events"}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Render Week View
  const renderWeekView = () => {
    const weekEvents = getWeekEvents();
    const today = new Date().toDateString();

    return (
      <div className="space-y-3">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-soft">
            {formatDate(weekEvents[0].date)} - {formatDate(weekEvents[6].date)}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Week grid */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {weekEvents.map(({ date, events: dayEvents }) => (
              <div
                key={date.toISOString()}
                className={`p-2 rounded-lg ${
                  date.toDateString() === today
                    ? "bg-neon-cyan/10 border border-neon-cyan/30"
                    : "bg-black/20"
                } ${
                  date.toDateString() === selectedDate.toDateString()
                    ? "ring-1 ring-neon-magenta/50"
                    : ""
                }`}
                onClick={() => handleDateSelect(date)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium ${
                      date.toDateString() === today
                        ? "text-neon-cyan"
                        : "text-white/80"
                    }`}
                  >
                    {date.toLocaleDateString([], {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-soft">
                      {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {dayEvents.length > 0 && (
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => renderEvent(event, true))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-soft">
                        +{dayEvents.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate);
    const today = new Date().toDateString();
    const isToday = selectedDate.toDateString() === today;

    return (
      <div className="space-y-3">
        {/* Day navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDay(-1)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <div className={`text-sm font-medium ${isToday ? "text-neon-cyan" : ""}`}>
              {selectedDate.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            {isToday && (
              <span className="text-[10px] text-neon-cyan">Today</span>
            )}
          </div>
          <button
            onClick={() => navigateDay(1)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day events */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {dayEvents.length > 0 ? (
              dayEvents.map((event) => renderEvent(event))
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-soft/40" />
                <p className="text-xs text-soft/60">No events scheduled</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Add Event Button for Day View */}
        {isConnected && (
          <button
            onClick={() => onAddEvent?.(selectedDate)}
            className="console-button w-full text-xs mt-3"
            data-testid="add-event-day-btn"
          >
            <Plus className="w-3 h-3" />
            Add Event
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid="calendar-full-panel">
      {/* View Mode Tabs */}
      <div className="flex gap-1 p-1 bg-black/30 rounded-lg">
        <button
          onClick={() => setViewMode(VIEW_MODES.MONTH)}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs transition-all ${
            viewMode === VIEW_MODES.MONTH
              ? "bg-neon-cyan/20 text-neon-cyan"
              : "text-soft hover:text-white"
          }`}
          data-testid="view-month-btn"
        >
          <Grid3X3 className="w-3 h-3" />
          Month
        </button>
        <button
          onClick={() => setViewMode(VIEW_MODES.WEEK)}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs transition-all ${
            viewMode === VIEW_MODES.WEEK
              ? "bg-neon-cyan/20 text-neon-cyan"
              : "text-soft hover:text-white"
          }`}
          data-testid="view-week-btn"
        >
          <List className="w-3 h-3" />
          Week
        </button>
        <button
          onClick={() => setViewMode(VIEW_MODES.DAY)}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded text-xs transition-all ${
            viewMode === VIEW_MODES.DAY
              ? "bg-neon-cyan/20 text-neon-cyan"
              : "text-soft hover:text-white"
          }`}
          data-testid="view-day-btn"
        >
          <CalendarIcon className="w-3 h-3" />
          Day
        </button>
      </div>

      {/* View Content */}
      {viewMode === VIEW_MODES.MONTH && renderMonthView()}
      {viewMode === VIEW_MODES.WEEK && renderWeekView()}
      {viewMode === VIEW_MODES.DAY && renderDayView()}
    </div>
  );
}
