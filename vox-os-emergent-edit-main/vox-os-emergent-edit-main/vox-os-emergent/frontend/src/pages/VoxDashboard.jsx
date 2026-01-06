// VoxDashboard.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";

import {
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp,
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
        <header className="mb-8">
          <h1 className="title-gradient text-4xl sm:text-5xl font-bold tracking-[0.18em] uppercase">
            VOX OS
          </h1>
          <p className="text-soft text-sm tracking-wide uppercase">
            Personal Assistant • Good {getTimeOfDay()}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-3 space-y-6">
            <Collapsible open={showBriefing} onOpenChange={setShowBriefing}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <span className="uppercase text-sm tracking-wider">Daily Briefing</span>
                  {showBriefing ? <ChevronUp /> : <ChevronDown />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 text-xs text-soft">
                  Request a briefing to see Vox summary
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible open={showCalendar} onOpenChange={setShowCalendar}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <span className="uppercase text-sm tracking-wider">Calendar</span>
                  {showCalendar ? <ChevronUp /> : <ChevronDown />}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CalendarPanel events={events} />
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* Center */}
          <div className="lg:col-span-6">
            <div className="console-card h-[calc(100vh-200px)] flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-message ${m.role}`}>
                    {m.content}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <form onSubmit={sendMessage} className="p-4 border-t border-white/10 flex gap-2">
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="console-input flex-1"
                  placeholder="Ask Vox anything..."
                />
                <button className="console-button">
                  <Send />
                </button>
              </form>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-3 space-y-6">
            <Collapsible open={showTasks} onOpenChange={setShowTasks}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between">
                  <span>Tasks</span>
                  <span>{pendingTasks}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {tasks.map((t) => (
                    <div key={t.id}>{t.title}</div>
                  ))}
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible open={showMemories} onOpenChange={setShowMemories}>
              <div className="console-card p-4">
                <CollapsibleTrigger className="flex justify-between">
                  <span>Memory</span>
                  <span>{memories.length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {memories.map((m) => (
                    <div key={m.id}>{m.content}</div>
                  ))}
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>

    {/* CalendarEventModal removed for build isolate */}

    </div>
  );
}
