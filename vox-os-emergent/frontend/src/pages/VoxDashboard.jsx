// VoxDashboard.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";

import {
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import CalendarPanel from "@/components/CalendarPanel";
import CalendarEventModal from "@/components/CalendarEventModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

axios.defaults.withCredentials = true;

const API = "https://voxconsole.com/api";
const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function VoxDashboard() {
  /* ================= STATE ================= */

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [events, setEvents] = useState([]);

  const [showCalendar, setShowCalendar] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showMemories, setShowMemories] = useState(false);

  const [calendarEventModal, setCalendarEventModal] = useState({
    isOpen: false,
    event: null,
    selectedDate: null,
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* ================= HELPERS ================= */

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ================= INIT ================= */

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const [tasksRes, memoriesRes, eventsRes] = await Promise.allSettled([
        axios.get(`${API}/tasks`),
        axios.get(`${API}/memories`),
        axios.get(`${API}/calendar`),
      ]);

      setTasks(
        tasksRes.status === "fulfilled"
          ? safeArray(tasksRes.value.data)
          : []
      );

      setMemories(
        memoriesRes.status === "fulfilled"
          ? safeArray(memoriesRes.value.data)
          : []
      );

      setEvents(
        eventsRes.status === "fulfilled"
          ? safeArray(eventsRes.value.data)
          : []
      );

      fetchChatHistory();
    } catch (err) {
      console.error("Init error:", err);
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

  /* ================= CHAT ================= */

  const sendMessage = async (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (isLoading) return;

  const content = inputValue.trim();
  if (!content) return;

  const userMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content,
  };

  // 👇 SHOW USER MESSAGE IMMEDIATELY
  setMessages((prev) => [...prev, userMessage]);

  setInputValue("");
  setIsLoading(true);

  try {
    const res = await axios.post(`${API}/chat/send`, {
      session_id: "default",
      content,
    });

    // 👇 APPEND VOX RESPONSE
    setMessages((prev) => [...prev, res.data]);
  } catch (err) {
    console.error("Chat send error:", err.response || err);
    toast.error("Failed to send message");
  } finally {
    setIsLoading(false);
  }
};


  /* ================= COMPUTED ================= */

  const pendingTasks = safeArray(tasks).filter(
    (t) => t.status !== "completed"
  ).length;

  /* ================= RENDER ================= */

  return (
    <div className="console-wrapper">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="title-gradient text-4xl font-bold tracking-[0.18em] uppercase">
            VOX OS
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-3 space-y-6">
            <Collapsible open={showCalendar} onOpenChange={setShowCalendar}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between w-full mb-4">
                  <span className="uppercase text-sm">Calendar</span>
                  {showCalendar ? <ChevronUp /> : <ChevronDown />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CalendarPanel
                    events={safeArray(events)}
                    isConnected={false}
                    onAddEvent={() => {}}
                    onEditEvent={() => {}}
                    onDeleteEvent={() => {}}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* CENTER */}
          <div className="lg:col-span-6">
            <div className="console-card h-[600px] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-white/10">
                <span className="text-sm">Chat</span>
                <button
                  onClick={clearChat}
                  className="console-button text-xs"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              </div>

              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                  <p className="text-soft text-sm text-center py-8">
                    No messages yet.
                  </p>
                )}

                {messages.map((m) => (
                  <pre
                     key={m.id}
                     style={{
                     color: "white",
                     background: "rgba(255,255,255,0.05)",
                     padding: "8px",
                     marginBottom: "6px",
                     fontSize: "12px",
                    }}
                  >
                    {JSON.stringify(m, null, 2)}
                  </pre>
                ))}


                <div ref={messagesEndRef} />
              </ScrollArea>

              <form
                onSubmit={sendMessage}
                method="post"
                className="p-4 border-t border-white/10"
              >
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="console-input flex-1"
                    placeholder="Ask Vox anything..."
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className="console-button"
                    disabled={isLoading}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-3 space-y-6">
            <Collapsible open={showTasks} onOpenChange={setShowTasks}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between w-full mb-4">
                  <span>Tasks</span>
                  <span className="console-badge">{pendingTasks}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {tasks.length === 0 && (
                    <p className="text-xs text-soft text-center py-4">
                      No tasks yet
                    </p>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible open={showMemories} onOpenChange={setShowMemories}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between w-full mb-4">
                  <span>Memory</span>
                  <span className="console-badge orange">
                    {memories.length}
                  </span>
                </CollapsibleTrigger>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>

      <CalendarEventModal
        isOpen={calendarEventModal.isOpen}
        onClose={() =>
          setCalendarEventModal({ isOpen: false, event: null })
        }
        onSave={() => {}}
        onDelete={() => {}}
        event={calendarEventModal.event}
        selectedDate={calendarEventModal.selectedDate}
      />
    </div>
  );
}


