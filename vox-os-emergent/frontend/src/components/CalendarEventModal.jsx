import { useState, useMemo } from "react";
import { X, Calendar, Clock, MapPin, FileText, Users, Bell, Trash2, Save } from "lucide-react";

// Helper to compute initial form data
function getInitialFormData(event, selectedDate) {
  if (event) {
    const startDate = event.start ? new Date(event.start) : new Date();
    const endDate = event.end ? new Date(event.end) : new Date();
    const isAllDay = event.is_all_day || !event.start?.includes("T");
    
    return {
      title: event.title || "",
      date: startDate.toISOString().split("T")[0],
      startTime: isAllDay ? "" : startDate.toTimeString().slice(0, 5),
      endTime: isAllDay ? "" : endDate.toTimeString().slice(0, 5),
      isAllDay,
      description: event.description || "",
      location: event.location || "",
      attendees: "",
      reminder: "30",
    };
  } else if (selectedDate) {
    const dateStr = selectedDate.toISOString().split("T")[0];
    const now = new Date();
    const nextHour = new Date(now.setHours(now.getHours() + 1, 0, 0, 0));
    const endHour = new Date(nextHour.getTime() + 60 * 60 * 1000);
    
    return {
      title: "",
      date: dateStr,
      startTime: nextHour.toTimeString().slice(0, 5),
      endTime: endHour.toTimeString().slice(0, 5),
      isAllDay: false,
      description: "",
      location: "",
      attendees: "",
      reminder: "30",
    };
  }
  return {
    title: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    isAllDay: false,
    description: "",
    location: "",
    attendees: "",
    reminder: "30",
  };
}

export default function CalendarEventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event = null,
  selectedDate = null,
}) {
  // Only render the form content when modal is open
  // This effectively resets state when modal closes/opens
  if (!isOpen) return null;
  
  return (
    <CalendarEventModalContent
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      event={event}
      selectedDate={selectedDate}
    />
  );
}

function CalendarEventModalContent({
  onClose,
  onSave,
  onDelete,
  event,
  selectedDate,
}) {
  const isEditing = !!event;
  
  // Initialize with computed data - this runs fresh each time modal opens
  const [formData, setFormData] = useState(() => getInitialFormData(event, selectedDate));
  const [errors, setErrors] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    if (!formData.isAllDay) {
      if (!formData.startTime) {
        newErrors.startTime = "Start time is required";
      }
      if (!formData.endTime) {
        newErrors.endTime = "End time is required";
      }
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        newErrors.endTime = "End time must be after start time";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    let startDateTime, endDateTime;

    if (formData.isAllDay) {
      // All-day event - just use the date
      startDateTime = formData.date;
      // For all-day events, end date is typically the next day
      const nextDay = new Date(formData.date);
      nextDay.setDate(nextDay.getDate() + 1);
      endDateTime = nextDay.toISOString().split("T")[0];
    } else {
      // Timed event - combine date and time
      startDateTime = `${formData.date}T${formData.startTime}:00`;
      endDateTime = `${formData.date}T${formData.endTime}:00`;
    }

    onSave({
      id: event?.id,
      title: formData.title.trim(),
      start_time: startDateTime,
      end_time: endDateTime,
      description: formData.description.trim(),
      location: formData.location.trim(),
    });
  };

  const handleDelete = () => {
    if (isDeleting) {
      onDelete(event.id);
    } else {
      setIsDeleting(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="calendar-event-modal">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative console-card border-neon-cyan/30 max-w-lg w-full mx-4 p-6 z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-soft hover:text-white"
          data-testid="close-event-modal"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neon-cyan" />
          {isEditing ? "Edit Event" : "New Event"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-soft mb-1">Event Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Meeting with team..."
              className={`console-input w-full ${errors.title ? "border-red-500" : ""}`}
              data-testid="event-title-input"
              autoFocus
            />
            {errors.title && <p className="text-red-400 text-[10px] mt-1">{errors.title}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-soft mb-1">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={`console-input w-full ${errors.date ? "border-red-500" : ""}`}
              data-testid="event-date-input"
            />
            {errors.date && <p className="text-red-400 text-[10px] mt-1">{errors.date}</p>}
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={formData.isAllDay}
              onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
              className="accent-neon-cyan"
              data-testid="event-allday-checkbox"
            />
            <label htmlFor="isAllDay" className="text-xs text-white/80">All day event</label>
          </div>

          {/* Time (only if not all day) */}
          {!formData.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-soft mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={`console-input w-full ${errors.startTime ? "border-red-500" : ""}`}
                  data-testid="event-start-time-input"
                />
                {errors.startTime && <p className="text-red-400 text-[10px] mt-1">{errors.startTime}</p>}
              </div>
              <div>
                <label className="block text-xs text-soft mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  End Time *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={`console-input w-full ${errors.endTime ? "border-red-500" : ""}`}
                  data-testid="event-end-time-input"
                />
                {errors.endTime && <p className="text-red-400 text-[10px] mt-1">{errors.endTime}</p>}
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs text-soft mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Office, Zoom, etc."
              className="console-input w-full"
              data-testid="event-location-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-soft mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this event..."
              rows={3}
              className="console-input w-full resize-none"
              data-testid="event-description-input"
            />
          </div>

          {/* Attendees (informational - not sent to Google) */}
          <div>
            <label className="block text-xs text-soft mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Attendees
              <span className="text-[9px] text-soft/60">(for reference only)</span>
            </label>
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              placeholder="John, Sarah (not sent to calendar)"
              className="console-input w-full"
              data-testid="event-attendees-input"
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-xs text-soft mb-1 flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Reminder
            </label>
            <select
              value={formData.reminder}
              onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
              className="console-input w-full"
              data-testid="event-reminder-select"
            >
              <option value="0">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className={`console-button text-xs ${
                  isDeleting
                    ? "border-red-500 text-red-400 hover:bg-red-500/20"
                    : "border-neon-orange/50 text-neon-orange hover:bg-neon-orange/20"
                }`}
                data-testid="delete-event-btn"
              >
                <Trash2 className="w-3 h-3" />
                {isDeleting ? "Confirm Delete?" : "Delete"}
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="console-button text-xs"
                data-testid="cancel-event-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="console-button text-xs border-neon-cyan/50 hover:bg-neon-cyan/20"
                data-testid="save-event-btn"
              >
                <Save className="w-3 h-3" />
                {isEditing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
