// Build: 1766445068
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import logger from "@/utils/logger";
axios.defaults.withCredentials = true;

import {
  Send,
  RefreshCw,
  Sun,
  Moon,
  CalendarDays,
  CheckSquare,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Clock,
  Zap,
  Circle,
  Link,
  Unlink,
  AlertCircle,
  Edit2,
  Save,
  X,
  Mic,
} from "lucide-react";

import CalendarPanel from "@/components/CalendarPanel";
import CalendarEventModal from "@/components/CalendarEventModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const API = "https://voxconsole.com/api";

export default function VoxDashboard() {
  // ================= STATE =================
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [briefing, setBriefing] = useState(null);

  const [events, setEvents] = useState([]);          // ✅ HARDEN
  const [tasks, setTasks] = useState([]);            // ✅ HARDEN
  const [memories, setMemories] = useState([]);      // ✅ HARDEN

  const [showBriefing, setShowBriefing] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showMemories, setShowMemories] = useState(false);

  const [newTask, setNewTask] = useState("");

  const [calendarStatus, setCalendarStatus] = useState({
    google: { connected: false, email: "" },
    outlook: { connected: false, email: "" },
  });

  const [googleEvents, setGoogleEvents] = useState([]); // ✅ HARDEN
  const [calendarProviders, setCalendarProviders] = useState([]); // ✅ HARDEN

  const [showCalendarInfo, setShowCalendarInfo] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const [newMemory, setNewMemory] = useState({ content: "", category: "fact" });
  const [editingMemory, setEditingMemory] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [calendarEventModal, setCalendarEventModal] = useState({
    isOpen: false,
    event: null,
    selectedDate: null,
  });

  const [isRecording, setIsRecording] = useState(false);

  // ================= REFS =================
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ================= HELPERS =================
  const safeArray = (v) => (Array.isArray(v) ? v : []); // ✅ HARDEN

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages]);

  // ================= INIT =================
  useEffect(() => {
    initializeData();
    checkCalendarConnection();
  }, []);

  const initializeData = async () => {
    try {
      const [eventsRes, tasksRes, memoriesRes] = await Promise.all([
        axios.get(`${API}/calendar`),
        axios.get(`${API}/tasks`),
        axios.get(`${API}/memories`),
      ]);

      setEvents(safeArray(eventsRes.data));
      setTasks(safeArray(tasksRes.data));
      setMemories(safeArray(memoriesRes.data));

      await fetchChatHistory();
    } catch (e) {
      console.error("Init error:", e);
      setEvents([]);
      setTasks([]);
      setMemories([]);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API}/chat/history/default`);
      setMessages(safeArray(res.data));
    } catch {
      setMessages([]);
    }
  };

  // ================= CALENDAR =================
  const fetchCalendarProviders = async () => {
    try {
      const res = await axios.get(`${API}/auth/calendar/providers`);
      setCalendarProviders(safeArray(res.data?.providers)); // ✅ HARDEN
    } catch {
      setCalendarProviders([]); // ✅ HARDEN
    }
  };

  const checkCalendarConnection = async () => {
    let google = { connected: false, email: "" };
    let outlook = { connected: false, email: "" };

    try {
      const r = await axios.get(`${API}/auth/google/status`);
      google = {
        connected: !!r.data?.connected,
        email: r.data?.email || "",
      };
    } catch {}

    try {
      const r = await axios.get(`${API}/auth/outlook/status`);
      outlook = {
        connected: !!r.data?.connected,
        email: r.data?.email || "",
      };
    } catch {}

    setCalendarStatus({ google, outlook });
    fetchCalendarProviders();
  };

  // ================= COMPUTED =================
  const pendingTaskCount = safeArray(tasks).filter(
    (t) => t.status !== "completed"
  ).length; // ✅ HARDEN

  const todayEvents = safeArray(events).filter(
    (e) => e?.date === new Date().toISOString().split("T")[0]
  ); // ✅ HARDEN

  // ================= RENDER =================
  return (
    <div className="console-wrapper" data-testid="vox-dashboard">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="mb-8">
          <h1 className="title-gradient text-4xl font-bold tracking-[0.18em] uppercase">
            VOX OS
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-3 space-y-6">

            {/* CALENDAR */}
            <Collapsible open={showCalendar} onOpenChange={setShowCalendar}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between w-full mb-4">
                  <span className="uppercase text-sm tracking-wider">Calendar</span>
                  {showCalendar ? <ChevronUp /> : <ChevronDown />}
                </CollapsibleTrigger>

                <CollapsibleContent>

                  {!calendarStatus.google.connected &&
                  !calendarStatus.outlook.connected ? (
                    <>
                      <button
                        className="console-button w-full text-xs"
                        onClick={() => setShowProviderPicker((v) => !v)}
                      >
                        <Link className="w-3 h-3" /> Connect Calendar
                      </button>

                      {showProviderPicker &&
                        safeArray(calendarProviders) // ✅ HARDEN
                          .filter(
                            (p) =>
                              (p.id === "google" &&
                                !calendarStatus.google.connected) ||
                              (p.id === "outlook" &&
                                !calendarStatus.outlook.connected)
                          )
                          .map((p) => (
                            <button
                              key={p.id}
                              className="console-button w-full text-xs mt-2"
                            >
                              {p.name}
                            </button>
                          ))}
                    </>
                  ) : (
                    <CalendarPanel
                      events={safeArray(googleEvents)} // ✅ HARDEN
                      isConnected
                      onAddEvent={() => {}}
                      onEditEvent={() => {}}
                      onDeleteEvent={() => {}}
                    />
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* CENTER */}
          <div className="lg:col-span-6">
            <div className="console-card h-[600px] flex flex-col">

              <ScrollArea className="flex-1 p-4">
                {safeArray(messages).map((m) => (
                  <div key={m.id} className={`chat-message ${m.role}`}>
                    {m.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <form className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="console-input flex-1"
                    placeholder="Ask Vox anything..."
                  />
                  <button className="console-button">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-3 space-y-6">

            {/* TASKS */}
            <Collapsible open={showTasks} onOpenChange={setShowTasks}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between w-full mb-4">
                  <span>Tasks</span>
                  <span className="console-badge">{pendingTaskCount}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {safeArray(tasks).length === 0 && (
                    <p className="text-xs text-soft text-center py-4">
                      No tasks yet
                    </p>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* MEMORIES */}
            <Collapsible open={showMemories} onOpenChange={setShowMemories}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between w-full mb-4">
                  <span>Memory</span>
                  <span className="console-badge orange">
                    {safeArray(memories).length}
                  </span>
                </CollapsibleTrigger>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>

      <CalendarEventModal
        isOpen={calendarEventModal.isOpen}
        onClose={() => setCalendarEventModal({ isOpen: false })}
        onSave={() => {}}
        onDelete={() => {}}
        event={calendarEventModal.event}
        selectedDate={calendarEventModal.selectedDate}
      />
    </div>
  );
}
