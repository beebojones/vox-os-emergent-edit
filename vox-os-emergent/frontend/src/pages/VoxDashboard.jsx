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
  Zap,
  Sun,
  Moon,
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

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
};

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
    // Prefer viewport scroll area like Emergent
    const node = messagesEndRef.current;
    if (node) {
      const viewport = node.closest('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
      else node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  useEffect(() => {
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
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

  const pendingTasks = safeArray(tasks).filter((t) => t.status !== "completed").length;
  const statusLabel = isLoading ? "Thinking..." : "Ready to assist";

  /* ================= RENDER ================= */

  return (
    <div className="console-wrapper">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8" data-testid="dashboard-header">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="title-gradient text-4xl sm:text-5xl font-bold tracking-[0.18em] uppercase" data-testid="vox-title">
              VOX OS
            </h1>
          </div>
          <p className="text-soft text-sm tracking-wide uppercase">
            Personal Assistant • Good {getTimeOfDay()}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Briefing & Calendar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Daily Briefing (summary only to match visual hierarchy) */}
            <Collapsible open={showBriefing} onOpenChange={setShowBriefing}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <span className="uppercase text-sm tracking-wider text-white/90">Daily Briefing</span>
                  {showBriefing ? <ChevronUp className="w-4 h-4 text-soft" /> : <ChevronDown className="w-4 h-4 text-soft" />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex gap-2 mb-3 mt-3">
                    <button type="button" className="console-button flex-1 text-xs" disabled>
                      <Sun className="w-3 h-3" />
                      Morning
                    </button>
                    <button type="button" className="console-button flex-1 text-xs" disabled>
                      <Moon className="w-3 h-3" />
                      Evening
                    </button>
                  </div>
                  <div className="text-xs text-soft">Request a briefing to see Vox&apos;s summary</div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Calendar */}
            <Collapsible open={showCalendar} onOpenChange={setShowCalendar}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <span className="uppercase text-sm tracking-wider text-white/90">Calendar</span>
                  {showCalendar ? <ChevronUp className="w-4 h-4 text-soft" /> : <ChevronDown className="w-4 h-4 text-soft" />}
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

          {/* Main Chat Area */}
          <div className="lg:col-span-6">
            <div className="console-card h-[calc(100vh-200px)] min-h-[400px] flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #00f6ff, #ff00d4)" }}
                  >
                    <Zap className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Vox</div>
                    <div className="text-xs text-soft">{statusLabel}</div>
                  </div>
                </div>
                <button onClick={clearChat} className="console-button text-xs px-3 py-1">
                  <RefreshCw className="w-3 h-3" />
                  Clear
                </button>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4" style={{ maxHeight: "calc(100% - 140px)" }}>
                <div className="space-y-4 pb-2">
                  {messages.map((m) => (
                    <div key={m.id} className={`chat-message ${m.role} fade-in`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="chat-message assistant" aria-live="polite">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="console-input flex-1"
                    placeholder={isLoading ? "Working..." : "Ask Vox anything..."}
                    disabled={isLoading}
                  />
                  <button type="submit" className="console-button px-4" disabled={isLoading}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Sidebar - Tasks & Memories */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tasks Panel */}
            <Collapsible open={showTasks} onOpenChange={setShowTasks}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <span className="text-sm font-medium tracking-wider uppercase text-white/90">Tasks</span>
                  <span className="console-badge text-[10px]">{pendingTasks}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {safeArray(tasks).map((t) => (
                      <div key={t.id} className="p-3 rounded-lg bg-black/30 border border-white/5 text-xs text-white/80">
                        {t.title}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Memories Panel */}
            <Collapsible open={showMemories} onOpenChange={setShowMemories}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <span className="text-sm font-medium tracking-wider uppercase text-white/90">Memory</span>
                  <span className="console-badge orange text-[10px]">{safeArray(memories).length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto text-xs text-white/80">
                    {safeArray(memories).map((m) => (
                      <div key={m.id} className="p-3 rounded-lg bg-black/30 border border-white/10">
                        {m.content}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>

