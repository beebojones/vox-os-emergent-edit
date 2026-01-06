// VoxDashboard.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";

import {
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
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

  const [showBriefing, setShowBriefing] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showMemories, setShowMemories] = useState(true);

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

  useEffect(scrollToBottom, [messages]);

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

      setTasks(tasksRes.status === "fulfilled" ? safeArray(tasksRes.value.data) : []);
      setMemories(memoriesRes.status === "fulfilled" ? safeArray(memoriesRes.value.data) : []);
      setEvents(eventsRes.status === "fulfilled" ? safeArray(eventsRes.value.data) : []);

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
    if (isLoading) return;

    const content = inputValue.trim();
    if (!content) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${API}/chat/send`, {
        session_id: "default",
        content,
      });

      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      setMessages([]);
      await axios.delete(`${API}/chat/history/default`);
      toast.success("Chat cleared");
    } catch {
      toast.error("Failed to clear chat");
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

        {/* HEADER */}
        <header className="mb-8">
          <h1 className="title-gradient text-4xl font-bold tracking-[0.18em] uppercase">
            VOX OS
          </h1>
        </header>

        {/* DAILY BRIEFING */}
        <Collapsible open={showBriefing} onOpenChange={setShowBriefing}>
          <div className="console-card p-4 mb-6">
            <CollapsibleTrigger className="flex justify-between w-full">
              <span className="uppercase text-sm tracking-wider">
                Daily Briefing
              </span>
              {showBriefing ? <ChevronUp /> : <ChevronDown />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 text-sm text-soft">
              You have {pendingTasks} pending tasks today.
            </CollapsibleContent>
          </div>
        </Collapsible>

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
                    events={events}
                    isConnected={false}
                    onAddEvent={() => {}}
                    onEditEvent={() => {}}
                    onDeleteEvent={() => {}}
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* CENTER CHAT */}
          <div className="lg:col-span-6">
            <div className="console-card h-[620px] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-white/10">
                <span className="text-sm uppercase tracking-wider">Chat</span>
                <button onClick={clearChat} className="console-button text-xs">
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              </div>

              <ScrollArea className="flex-1 p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`chat-message ${m.role}`}
                  >
                    {m.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="console-input flex-1"
                    placeholder="Ask Vox anything..."
                    disabled={isLoading}
                  />
                  <button type="submit" className="console-button" disabled={isLoading}>
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
                <CollapsibleContent className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="text-xs text-soft">
                      • {t.title}
                    </div>
                  ))}
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
                <CollapsibleContent className="space-y-2 text-xs text-soft">
                  {memories.map((m) => (
                    <div key={m.id}>• {m.content}</div>
                  ))}
                </CollapsibleContent>
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
