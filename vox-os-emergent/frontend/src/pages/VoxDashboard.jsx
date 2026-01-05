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
  Calendar,
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
  ExternalLink,
  AlertCircle,
  CalendarDays,
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
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [briefing, setBriefing] = useState(null);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [showBriefing, setShowBriefing] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showMemories, setShowMemories] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [calendarStatus, setCalendarStatus] = useState({
    google: { connected: false, email: "" },
    outlook: { connected: false, email: "" },
  });
  const [googleEvents, setGoogleEvents] = useState([]);
  const [showCalendarInfo, setShowCalendarInfo] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [calendarProviders, setCalendarProviders] = useState([]); // already correct
  const [newMemory, setNewMemory] = useState({ content: "", category: "fact" });
  const [editingMemory, setEditingMemory] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [calendarEventModal, setCalendarEventModal] = useState({
    isOpen: false,
    event: null,
    selectedDate: null,
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container =
        messagesEndRef.current.closest(
          "[data-radix-scroll-area-viewport]"
        );
      if (container) {
        container.scrollTop = container.scrollHeight;
      } else {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

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

      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setMemories(Array.isArray(memoriesRes.data) ? memoriesRes.data : []);

      await fetchChatHistory();
    } catch (error) {
      console.error("Error initializing data:", error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history/default`);
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setMessages([]);
    }
  };

  // ✅ FIX 1: crash-safe provider fetch
  const fetchCalendarProviders = async () => {
    try {
      const response = await axios.get(`${API}/auth/calendar/providers`);
      const providers = Array.isArray(response.data?.providers)
        ? response.data.providers
        : [];
      setCalendarProviders(providers);
    } catch (error) {
      console.error("Error fetching calendar providers:", error);
      setCalendarProviders([]); // critical
    }
  };

  const fetchOutlookCalendarEvents = async () => {
    try {
      const response = await axios.get(`${API}/outlook-calendar/events`);
      if (Array.isArray(response.data?.events)) {
        setGoogleEvents((prev) => {
          const safePrev = Array.isArray(prev) ? prev : []; // ✅ FIX 2
          const googleOnly = safePrev.filter(
            (e) => e.provider !== "outlook"
          );
          return [...googleOnly, ...response.data.events];
        });
      }
    } catch (error) {
      console.error("Error fetching Outlook Calendar events:", error);
    }
  };

  const checkCalendarConnection = async () => {
    try {
      let googleStatus = { connected: false, email: "" };
      let outlookStatus = { connected: false, email: "" };

      try {
        const googleResponse = await axios.get(
          `${API}/auth/google/status`
        );
        googleStatus = {
          connected: !!googleResponse.data.connected,
          email: googleResponse.data.email || "",
        };
      } catch {}

      try {
        const outlookResponse = await axios.get(
          `${API}/auth/outlook/status`
        );
        outlookStatus = {
          connected: !!outlookResponse.data.connected,
          email: outlookResponse.data.email || "",
        };
      } catch {}

      setCalendarStatus({
        google: googleStatus,
        outlook: outlookStatus,
      });

      fetchCalendarProviders();
    } catch (error) {
      console.error("Error checking calendar status:", error);
    }
  };

  return (
    <div className="console-wrapper">
      {/* snip: everything else unchanged */}

      {/* ✅ FIX 3: render guard */}
      {(calendarProviders ?? [])
        .filter(
          (p) =>
            (p.id === "google" &&
              !calendarStatus.google?.connected) ||
            (p.id === "outlook" &&
              !calendarStatus.outlook?.connected)
        )
        .map((provider) => (
          <div key={provider.id}>{provider.name}</div>
        ))}
    </div>
  );
}
