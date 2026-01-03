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
// Using custom modal instead of Dialog for better stability
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
    outlook: { connected: false, email: "" }
  });
  const [googleEvents, setGoogleEvents] = useState([]);
  const [showCalendarInfo, setShowCalendarInfo] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [calendarProviders, setCalendarProviders] = useState([]);
  const [newMemory, setNewMemory] = useState({ content: "", category: "fact" });
  const [editingMemory, setEditingMemory] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [calendarEventModal, setCalendarEventModal] = useState({ isOpen: false, event: null, selectedDate: null });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    // Scroll within the messages container only, not the whole page
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.closest('[data-radix-scroll-area-viewport]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      } else {
        // Fallback: scroll the ref into view but only within nearest scrollable parent
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  useEffect(() => {
    // Small delay to ensure DOM is updated before scrolling
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    initializeData();
    checkCalendarConnection();
    
    // Check URL params for calendar connection result
    const params = new URLSearchParams(window.location.search);
    const calendarConnected = params.get('calendar_connected');
    const calendarError = params.get('calendar_error');
    
    if (calendarConnected === 'true') {
      toast.success('Google Calendar connected successfully!');
      checkCalendarConnection();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarConnected === 'outlook') {
      toast.success('Outlook Calendar connected successfully!');
      checkCalendarConnection();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarError) {
      const errorMsg = calendarError === 'auth_failed' 
        ? 'Failed to connect calendar. Please try again.' 
        : `Calendar connection error: ${calendarError}`;
      toast.error(errorMsg);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const initializeData = async () => {
    try {
      // Fetch all data
      const [eventsRes, tasksRes, memoriesRes] = await Promise.all([
        axios.get(`${API}/calendar`),
        axios.get(`${API}/tasks`),
        axios.get(`${API}/memories`),
      ]);
      
      // Seed demo data only if no data exists
      if (eventsRes.data.length === 0 && tasksRes.data.length === 0) {
        await axios.post(`${API}/seed`);
        // Refetch after seeding
        await Promise.all([
          fetchEvents(),
          fetchTasks(),
          fetchMemories(),
        ]);
      } else {
        setEvents(eventsRes.data);
        setTasks(tasksRes.data);
        setMemories(memoriesRes.data);
      }
      
      await fetchChatHistory();
    } catch (error) {
      console.error("Error initializing data:", error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/chat/history/default`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/calendar`);
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchMemories = async () => {
    try {
      const response = await axios.get(`${API}/memories`);
      setMemories(response.data);
    } catch (error) {
      console.error("Error fetching memories:", error);
    }
  };

  const checkCalendarConnection = async () => {
    try {
      // Check Google Calendar status
      let googleStatus = { connected: false, email: "" };
      let outlookStatus = { connected: false, email: "" };
      
      try {
        const googleResponse = await axios.get(`${API}/auth/google/status`);
        googleStatus = {
          connected: googleResponse.data.connected || false,
          email: googleResponse.data.email || ""
        };
      } catch (e) {
        console.log("Google Calendar not configured or error:", e);
      }
      
      // Check Outlook Calendar status  
      try {
        const outlookResponse = await axios.get(`${API}/auth/outlook/status`);
        outlookStatus = {
          connected: outlookResponse.data.connected || false,
          email: outlookResponse.data.email || ""
        };
      } catch (e) {
        console.log("Outlook Calendar not configured or error:", e);
      }
      
      setCalendarStatus({
        google: googleStatus,
        outlook: outlookStatus
      });
      
      // Fetch events from connected calendars
      if (googleStatus.connected) {
        fetchGoogleCalendarEvents();
      }
      if (outlookStatus.connected) {
        fetchOutlookCalendarEvents();
      }
      
      // Also fetch providers
      fetchCalendarProviders();
    } catch (error) {
      console.error("Error checking calendar status:", error);
    }
  };
  
  const fetchOutlookCalendarEvents = async () => {
    try {
      const response = await axios.get(`${API}/outlook-calendar/events`);
      if (response.data.events) {
        // Add Outlook events to the combined events list
        setGoogleEvents(prev => {
          const googleOnly = prev.filter(e => e.provider !== "outlook");
          return [...googleOnly, ...response.data.events];
        });
      }
    } catch (error) {
      console.error("Error fetching Outlook Calendar events:", error);
    }
  };

  const fetchGoogleCalendarEvents = async () => {
    try {
      // Fetch events for the next 30 days
      const response = await axios.get(`${API}/google-calendar/events?days=30`);
      if (response.data.connected && response.data.events) {
        setGoogleEvents(response.data.events);
      }
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
    }
  };

const fetchCalendarProviders = async () => {
  try {
    const response = await axios.get(`${API}/auth/calendar/providers`);
    const providers = Array.isArray(response.data?.providers)
      ? response.data.providers
      : [];
    setCalendarProviders(providers);
  } catch (error) {
    console.error("Error fetching calendar providers:", error);
    setCalendarProviders([]); // 🔒 NEVER leave it undefined
  }
};


  const connectGoogleCalendar = async () => {
    try {
      logger.calendar.connect("Google");
      toast.info("Connecting to Google Calendar...");
      
      const response = await axios.get(`${API}/auth/google/login`);
      logger.api.response("GET", "/api/auth/google/login", 200, response.data);
      
      // Check if OAuth is configured
      if (!response.data.configured) {
        toast.error(response.data.message || "Google Calendar isn't configured yet.");
        return;
      }
      
      // Redirect to Google OAuth
      logger.info("AUTH", "Redirecting to Google OAuth", response.data.authorization_url);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      logger.api.error("GET", "/api/auth/google/login", error);
      toast.error("Failed to start calendar connection");
    }
  };

  const handleProviderSelect = async (provider) => {
    if (provider.id === "google") {
      if (!provider.configured) {
        toast.error(provider.message || `${provider.name} isn't configured yet.`);
        setShowProviderPicker(false);
      } else {
        // Provider shows as configured, attempt connection
        if (provider.id === "google") {
          await connectGoogleCalendar();
        } else if (provider.id === "outlook") {
          await connectOutlookCalendar();
        }
        setShowProviderPicker(false);
      }
    } else if (!provider.enabled) {
      toast.info(`${provider.name}: ${provider.message || "Coming soon"}`);
      setShowProviderPicker(false);
    }
  };

  const connectOutlookCalendar = async () => {
    try {
      logger.calendar.connect("Outlook");
      toast.info("Connecting to Outlook Calendar...");
      
      const response = await axios.get(`${API}/auth/outlook/login`);
      logger.api.response("GET", "/api/auth/outlook/login", 200, response.data);
      
      // Check if OAuth is configured
      if (!response.data.configured) {
        toast.error(response.data.message || "Outlook Calendar isn't configured yet.");
        return;
      }
      
      // Redirect to Microsoft OAuth
      logger.info("AUTH", "Redirecting to Outlook OAuth", response.data.authorization_url);
      window.location.href = response.data.authorization_url;
    } catch (error) {
      logger.api.error("GET", "/api/auth/outlook/login", error);
      toast.error("Failed to start Outlook calendar connection");
    }
  };

  const disconnectCalendar = async (provider = "all") => {
    try {
      const promises = [];
      
      if (provider === "all" || provider === "google") {
        if (calendarStatus.google?.connected) {
          promises.push(axios.post(`${API}/auth/google/disconnect`));
        }
      }
      
      if (provider === "all" || provider === "outlook") {
        if (calendarStatus.outlook?.connected) {
          promises.push(axios.post(`${API}/auth/outlook/disconnect`));
        }
      }
      
      await Promise.all(promises);
      
      if (provider === "all") {
        setCalendarStatus({ 
          google: { connected: false, email: "" },
          outlook: { connected: false, email: "" }
        });
        setGoogleEvents([]);
        toast.success("All calendars disconnected");
      } else {
        // Refresh status
        checkCalendarConnection();
        toast.success(`${provider === "google" ? "Google" : "Outlook"} Calendar disconnected`);
      }
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      toast.error("Failed to disconnect calendar");
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      await axios.post(`${API}/auth/google/disconnect`);
      setCalendarStatus({ connected: false });
      setGoogleEvents([]);
      toast.success("Google Calendar disconnected");
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      toast.error("Failed to disconnect calendar");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    logger.chat.send(inputValue);

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Add user message optimistically
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, id: Date.now().toString() },
    ]);

    try {
      const response = await axios.post(`${API}/chat`, {
        message: userMessage,
        session_id: "default",
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data.response,
          id: (Date.now() + 1).toString(),
        },
      ]);

      // If Vox added a task, refresh the task list
      if (response.data.task_added) {
        fetchTasks();
        toast.success(`Task added: ${response.data.task_added.title}`);
      }
      
      // If Vox added a memory, refresh the memory list
      if (response.data.memory_added) {
        fetchMemories();
        toast.success(`Memory saved: ${response.data.memory_added.content.substring(0, 30)}...`);
      }
      
      // If Vox added a calendar event, refresh the calendar
      if (response.data.event_added) {
        fetchGoogleCalendarEvents();
        toast.success(`Event created: ${response.data.event_added.title}`);
      }
      
      // If Vox deleted a calendar event, refresh the calendar
      if (response.data.event_deleted) {
        fetchGoogleCalendarEvents();
        toast.success("Calendar event deleted");
      }
      
      // If Vox deleted a task, refresh the task list
      if (response.data.task_deleted) {
        fetchTasks();
        toast.success("Task deleted");
      }
      
      // If Vox completed a task, refresh the task list
      if (response.data.task_completed) {
        fetchTasks();
        toast.success("Task marked as completed");
      }
    } catch (error) {
      logger.api.error("POST", "/api/chat", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
      // Focus input without scrolling the page
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  // ==================== VOICE RECORDING ====================
  
  // Use Web Speech API for real-time transcription
  const recognitionRef = useRef(null);
  
  const startRecording = async () => {
    try {
      logger.info("Voice", "Starting speech recognition...");
      
      // Check for browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Speech recognition is not supported in this browser. Please use Chrome.");
        return;
      }
      
      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        logger.info("Voice", "Microphone permission granted");
      } catch (permError) {
        logger.error("Voice", "Microphone permission denied:", permError);
        toast.error("Microphone access denied. Please allow microphone access in browser settings.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      let finalTranscript = '';
      
      recognition.onstart = () => {
        logger.info("Voice", "Speech recognition started");
      };
      
      recognition.onaudiostart = () => {
        logger.info("Voice", "Audio capturing started");
      };
      
      recognition.onspeechstart = () => {
        logger.info("Voice", "Speech detected");
      };
      
      recognition.onresult = (event) => {
        logger.info("Voice", `Got result: ${event.results.length} results`);
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          logger.info("Voice", `Transcript: "${transcript}" (final: ${event.results[i].isFinal})`);
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update input with real-time transcription
        const fullText = (finalTranscript + interimTranscript).trim();
        logger.info("Voice", `Setting input value to: "${fullText}"`);
        setInputValue(fullText);
      };
      
      recognition.onerror = (event) => {
        logger.error("Voice", `Speech recognition error: ${event.error}`);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please allow microphone access.");
        } else if (event.error === 'no-speech') {
          toast.info("No speech detected. Try again.");
        } else if (event.error === 'network') {
          toast.error("Network error. Please check your internet connection.");
        } else if (event.error === 'aborted') {
          // User stopped, don't show error
          logger.info("Voice", "Recognition aborted by user");
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        logger.info("Voice", "Speech recognition ended");
        setIsRecording(false);
      };
      
      // Start recognition
      recognition.start();
      setIsRecording(true);
      toast.info("Listening... Speak now. Click mic to stop.");
      
    } catch (error) {
      logger.error("Voice", "Failed to start speech recognition:", error);
      toast.error("Failed to start speech recognition. Please try again.");
    }
  };
  
  const stopRecording = () => {
    if (recognitionRef.current) {
      logger.info("Voice", "Stopping speech recognition...");
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };
  
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getBriefing = async (type) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API}/briefing/${type}`);
      setBriefing(response.data);
      toast.success(`${type === "morning" ? "Morning" : "Evening"} briefing ready`);
    } catch (error) {
      console.error("Error getting briefing:", error);
      toast.error("Failed to generate briefing");
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
      toast.success("Task updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      await axios.post(`${API}/tasks`, {
        title: newTask.trim(),
        priority: "normal",
        energy_level: "medium",
      });
      setNewTask("");
      fetchTasks();
      toast.success("Task added");
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      fetchTasks();
      toast.success("Task removed");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const updateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;

    try {
      await axios.put(`${API}/tasks/${editingTask.id}`, {
        title: editingTask.title.trim(),
        description: editingTask.description || "",
        priority: editingTask.priority,
        energy_level: editingTask.energy_level,
      });
      setEditingTask(null);
      fetchTasks();
      toast.success("Task updated");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  // Memory management functions
  const addMemory = async (e) => {
    e.preventDefault();
    if (!newMemory.content.trim()) return;

    try {
      await axios.post(`${API}/memories`, {
        content: newMemory.content.trim(),
        category: newMemory.category,
        tags: [],
      });
      setNewMemory({ content: "", category: "fact" });
      fetchMemories();
      toast.success("Memory added");
    } catch (error) {
      console.error("Error adding memory:", error);
      toast.error("Failed to add memory");
    }
  };

  const updateMemory = async () => {
    if (!editingMemory || !editingMemory.content.trim()) return;

    try {
      await axios.put(`${API}/memories/${editingMemory.id}`, {
        content: editingMemory.content.trim(),
        category: editingMemory.category,
      });
      setEditingMemory(null);
      fetchMemories();
      toast.success("Memory updated");
    } catch (error) {
      console.error("Error updating memory:", error);
      toast.error("Failed to update memory");
    }
  };

  const confirmDeleteMemory = async () => {
    if (!deleteConfirm) return;

    try {
      await axios.delete(`${API}/memories/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchMemories();
      toast.success("Memory deleted");
    } catch (error) {
      console.error("Error deleting memory:", error);
      toast.error("Failed to delete memory");
    }
  };

  // Calendar event management functions
  const openAddEventModal = (date) => {
    setCalendarEventModal({ isOpen: true, event: null, selectedDate: date || new Date() });
  };

  const openEditEventModal = (event) => {
    setCalendarEventModal({ isOpen: true, event, selectedDate: null });
  };

  const closeEventModal = () => {
    setCalendarEventModal({ isOpen: false, event: null, selectedDate: null });
  };

  const saveCalendarEvent = async (eventData) => {
    try {
      logger.calendar.event(eventData.id ? "UPDATE" : "CREATE", eventData);
      if (eventData.id) {
        // Update existing event
        await axios.put(`${API}/google-calendar/events/${eventData.id}`, {
          title: eventData.title,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          description: eventData.description,
          location: eventData.location,
        });
        toast.success("Event updated");
      } else {
        // Create new event
        await axios.post(`${API}/google-calendar/events`, {
          title: eventData.title,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          description: eventData.description,
          location: eventData.location,
        });
        toast.success("Event created");
      }
      closeEventModal();
      fetchGoogleCalendarEvents();
    } catch (error) {
      console.error("Error saving calendar event:", error);
      const errorMsg = error.response?.data?.detail || "Failed to save event";
      toast.error(errorMsg);
    }
  };

  const deleteCalendarEvent = async (eventId) => {
    try {
      logger.calendar.event("DELETE", { eventId });
      await axios.delete(`${API}/google-calendar/events/${eventId}`);
      toast.success("Event deleted");
      closeEventModal();
      fetchGoogleCalendarEvents();
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      const errorMsg = error.response?.data?.detail || "Failed to delete event";
      toast.error(errorMsg);
    }
  };

  const clearChat = async () => {
    try {
      await axios.delete(`${API}/chat/history/default`);
      setMessages([]);
      toast.success("Chat cleared");
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  const getTodayEvents = () => {
    const today = new Date().toISOString().split("T")[0];
    return events.filter((e) => e.date === today).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "text-neon-orange";
      case "normal": return "text-neon-cyan";
      case "low": return "text-soft";
      default: return "text-soft";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed": return <CheckSquare className="w-4 h-4 text-green-400" />;
      case "in_progress": return <Clock className="w-4 h-4 text-neon-cyan" />;
      case "dropped": return <Trash2 className="w-4 h-4 text-neon-orange" />;
      default: return <Circle className="w-4 h-4 text-soft" />;
    }
  };

  const getEventColor = (color) => {
    switch (color) {
      case "cyan": return "border-neon-cyan/50 text-neon-cyan";
      case "magenta": return "border-neon-magenta/50 text-neon-magenta";
      case "purple": return "border-neon-purple/50 text-neon-purple";
      case "orange": return "border-neon-orange/50 text-neon-orange";
      default: return "border-neon-cyan/50 text-neon-cyan";
    }
  };

  const getCategoryStyle = (category) => {
    const styles = {
      fact: "category-fact",
      preference: "category-preference",
      habit: "category-habit",
      context: "category-context",
      goal: "category-goal",
      relationship: "category-relationship",
      health: "category-health",
      work: "category-work",
      personal: "category-personal",
      reminder: "category-reminder",
    };
    return styles[category] || "category-fact";
  };

  const formatEventTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="console-wrapper" data-testid="vox-dashboard">
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Briefing & Calendar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Briefing Panel */}
            <Collapsible open={showBriefing} onOpenChange={setShowBriefing}>
              <div className="console-card p-4" data-testid="briefing-panel">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-neon-magenta" />
                    <span className="text-sm font-medium tracking-wider uppercase text-white/90">
                      Daily Briefing
                    </span>
                  </div>
                  {showBriefing ? (
                    <ChevronUp className="w-4 h-4 text-soft" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-soft" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => getBriefing("morning")}
                      className="console-button flex-1 text-xs"
                      disabled={isLoading}
                      data-testid="morning-briefing-btn"
                    >
                      <Sun className="w-3 h-3" />
                      Morning
                    </button>
                    <button
                      onClick={() => getBriefing("evening")}
                      className="console-button flex-1 text-xs"
                      disabled={isLoading}
                      data-testid="evening-briefing-btn"
                    >
                      <Moon className="w-3 h-3" />
                      Evening
                    </button>
                  </div>
                  {briefing && (
                    <div className="text-sm text-white/80 leading-relaxed fade-in" data-testid="briefing-content">
                      {briefing.content}
                    </div>
                  )}
                  {!briefing && (
                    <p className="text-xs text-soft text-center py-4">
                      Request a briefing to see Vox&apos;s summary
                    </p>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Calendar Panel */}
            <Collapsible open={showCalendar} onOpenChange={setShowCalendar}>
              <div className="console-card p-4" data-testid="calendar-panel">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-neon-cyan" />
                    <span className="text-sm font-medium tracking-wider uppercase text-white/90">
                      Calendar
                    </span>
                    {calendarStatus.google?.connected && (
                      <span className="console-badge text-[9px]">Google</span>
                    )}
                    {calendarStatus.outlook?.connected && (
                      <span className="console-badge text-[9px]">Outlook</span>
                    )}
                  </div>
                  {showCalendar ? (
                    <ChevronUp className="w-4 h-4 text-soft" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-soft" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {/* Calendar Connection UI */}
                  {!calendarStatus.google?.connected && !calendarStatus.outlook?.connected ? (
                    <div className="mb-4 p-3 rounded-lg bg-black/30 border border-white/10">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-neon-orange mt-0.5" />
                        <div className="text-xs text-soft">
                          Connect your calendars for time-aware briefings and task coordination.
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCalendarInfo(!showCalendarInfo)}
                        className="text-[10px] text-neon-cyan underline mb-2"
                        data-testid="calendar-info-toggle"
                      >
                        {showCalendarInfo ? "Hide details" : "What does this allow?"}
                      </button>
                      {showCalendarInfo && (
                        <div className="text-[10px] text-soft mb-3 p-2 bg-black/20 rounded fade-in">
                          <p className="mb-1"><strong className="text-white/80">Vox can:</strong></p>
                          <ul className="list-disc list-inside space-y-0.5 mb-2">
                            <li>Read your calendar events (past & future)</li>
                            <li>Create, edit, and delete events</li>
                            <li>Use event times in briefings and suggestions</li>
                            <li>Help coordinate tasks with your schedule</li>
                          </ul>
                          <p className="mb-1"><strong className="text-white/80">Vox cannot:</strong></p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>Access other Google services</li>
                            <li>Share your data externally</li>
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={async () => {
                          // Fetch providers if not already loaded
                          if (calendarProviders.length === 0) {
                            await fetchCalendarProviders();
                          }
                          setShowProviderPicker(!showProviderPicker);
                        }}
                        className="console-button w-full text-xs"
                        data-testid="connect-calendar-btn"
                      >
                        <Link className="w-3 h-3" />
                        Connect Calendar
                      </button>
                      
                      {/* Provider Picker */}
                      {showProviderPicker && (
                        <div className="mt-3 space-y-2 fade-in" data-testid="provider-picker">
                          {calendarProviders.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => handleProviderSelect(provider)}
                              disabled={!provider.enabled && provider.id !== "google"}
                              className={`w-full p-3 rounded-lg text-left transition-all ${
                                provider.enabled || provider.id === "google"
                                  ? "bg-black/40 border border-white/10 hover:border-neon-cyan/50 cursor-pointer"
                                  : "bg-black/20 border border-white/5 cursor-not-allowed opacity-60"
                              }`}
                              data-testid={`provider-${provider.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {provider.id === "google" && (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                  )}
                                  {provider.id === "outlook" && (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                      <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.154-.353.23-.578.23h-8.547v-6.959l1.6 1.229c.102.086.227.127.376.127.14 0 .26-.04.362-.12l6.787-5.217c.094-.07.168-.089.238-.089.187 0 .28.12.28.36v-.002l-.28.387zm-.238-1.06c.159 0 .238.125.238.376l-7.004 5.476-2.36-1.81V4.673h8.548c.225 0 .418.08.578.238.158.16.238.354.238.576v.84zm-10.125 12.344H2.83c-.225 0-.418-.076-.578-.23-.16-.152-.238-.345-.238-.576V7.387c0-.222.078-.416.238-.576.16-.158.353-.238.578-.238h10.807v12.098zM7.518 15.56c.86 0 1.576-.293 2.147-.878.573-.584.859-1.32.859-2.205 0-.893-.29-1.636-.867-2.228-.576-.59-1.295-.887-2.156-.887-.852 0-1.567.297-2.147.89-.578.594-.867 1.337-.867 2.225 0 .894.289 1.634.867 2.22.58.588 1.3.88 2.164.863zm-.017-5.194c.55 0 1.004.193 1.365.58.36.388.54.886.54 1.493 0 .607-.18 1.103-.54 1.486-.36.383-.816.574-1.365.574-.55 0-1.008-.19-1.373-.574-.364-.383-.547-.88-.547-1.486 0-.607.183-1.105.547-1.494.365-.386.822-.58 1.373-.58z"/>
                                    </svg>
                                  )}
                                  <span className="text-sm text-white/90">{provider.name}</span>
                                </div>
                                {!provider.enabled && provider.id !== "google" && (
                                  <span className="text-[10px] text-soft">Coming soon</span>
                                )}
                                {provider.id === "google" && !provider.configured && (
                                  <span className="text-[10px] text-neon-orange">Not configured</span>
                                )}
                              </div>
                              {provider.id === "google" && !provider.configured && (
                                <p className="text-[10px] text-soft mt-1">
                                  {provider.message}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Connected calendars status */}
                      <div className="mb-4 space-y-2">
                        {calendarStatus.google?.connected && (
                          <div className="p-2 rounded-lg bg-black/20 border border-neon-cyan/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                <svg className="w-3 h-3" viewBox="0 0 24 24">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span className="text-[10px] text-soft">
                                  {calendarStatus.google.email}
                                </span>
                              </div>
                              <button
                                onClick={() => disconnectCalendar("google")}
                                className="text-[10px] text-neon-orange hover:underline flex items-center gap-1"
                                data-testid="disconnect-google-calendar-btn"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {calendarStatus.outlook?.connected && (
                          <div className="p-2 rounded-lg bg-black/20 border border-blue-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                <svg className="w-3 h-3" viewBox="0 0 24 24">
                                  <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.154-.353.23-.578.23h-8.547v-6.959l1.6 1.229c.102.086.227.127.376.127.14 0 .26-.04.362-.12l6.787-5.217c.094-.07.168-.089.238-.089.187 0 .28.12.28.36v-.002l-.28.387zm-.238-1.06c.159 0 .238.125.238.376l-7.004 5.476-2.36-1.81V4.673h8.548c.225 0 .418.08.578.238.158.16.238.354.238.576v.84zm-10.125 12.344H2.83c-.225 0-.418-.076-.578-.23-.16-.152-.238-.345-.238-.576V7.387c0-.222.078-.416.238-.576.16-.158.353-.238.578-.238h10.807v12.098z"/>
                                </svg>
                                <span className="text-[10px] text-soft">
                                  {calendarStatus.outlook.email}
                                </span>
                              </div>
                              <button
                                onClick={() => disconnectCalendar("outlook")}
                                className="text-[10px] text-neon-orange hover:underline flex items-center gap-1"
                                data-testid="disconnect-outlook-calendar-btn"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Add another calendar button */}
                        {(!calendarStatus.google?.connected || !calendarStatus.outlook?.connected) && (
                          <button
                            onClick={() => setShowProviderPicker(!showProviderPicker)}
                            className="console-button w-full text-xs"
                            data-testid="add-calendar-btn"
                          >
                            <Plus className="w-3 h-3" />
                            Add Calendar
                          </button>
                        )}
                        
                        {/* Provider Picker for adding more calendars */}
                        {showProviderPicker && (
                          <div className="mt-2 space-y-2 fade-in">
                            {calendarProviders.filter(p => 
                              (p.id === "google" && !calendarStatus.google?.connected) ||
                              (p.id === "outlook" && !calendarStatus.outlook?.connected)
                            ).map((provider) => (
                              <button
                                key={provider.id}
                                onClick={() => handleProviderSelect(provider)}
                                disabled={!provider.configured}
                                className={`w-full p-2 rounded-lg text-left transition-all ${
                                  provider.configured
                                    ? "bg-black/40 border border-white/10 hover:border-neon-cyan/50 cursor-pointer"
                                    : "bg-black/20 border border-white/5 cursor-not-allowed opacity-60"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {provider.id === "google" && (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                  )}
                                  {provider.id === "outlook" && (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                      <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.154-.353.23-.578.23h-8.547v-6.959l1.6 1.229c.102.086.227.127.376.127.14 0 .26-.04.362-.12l6.787-5.217c.094-.07.168-.089.238-.089.187 0 .28.12.28.36v-.002l-.28.387zm-.238-1.06c.159 0 .238.125.238.376l-7.004 5.476-2.36-1.81V4.673h8.548c.225 0 .418.08.578.238.158.16.238.354.238.576v.84zm-10.125 12.344H2.83c-.225 0-.418-.076-.578-.23-.16-.152-.238-.345-.238-.576V7.387c0-.222.078-.416.238-.576.16-.158.353-.238.578-.238h10.807v12.098z"/>
                                    </svg>
                                  )}
                                  <span className="text-xs text-white/90">{provider.name}</span>
                                  {!provider.configured && (
                                    <span className="text-[9px] text-neon-orange ml-auto">Not configured</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Full Calendar Panel */}
                      <CalendarPanel 
                        events={googleEvents}
                        isConnected={calendarStatus.google?.connected || calendarStatus.outlook?.connected}
                        onAddEvent={openAddEventModal}
                        onEditEvent={openEditEventModal}
                        onDeleteEvent={deleteCalendarEvent}
                      />
                    </>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-6">
            <div className="console-card h-[calc(100vh-200px)] min-h-[400px] flex flex-col overflow-hidden" data-testid="chat-panel">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-magenta flex items-center justify-center">
                    <Zap className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Vox</div>
                    <div className="text-xs text-soft">Ready to assist</div>
                  </div>
                </div>
                <button
                  onClick={clearChat}
                  className="console-button text-xs px-3 py-1"
                  data-testid="clear-chat-btn"
                >
                  <RefreshCw className="w-3 h-3" />
                  Clear
                </button>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4" style={{ maxHeight: 'calc(100% - 140px)' }}>
                <div className="space-y-4 pb-2">
                  {messages.length === 0 && (
                    <div className="text-center py-12" data-testid="empty-chat">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-magenta/20 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-neon-cyan" />
                      </div>
                      <p className="text-soft text-sm mb-2">
                        Hello. I&apos;m Vox, your personal assistant.
                      </p>
                      <p className="text-xs text-soft/60">
                        How can I help you today?
                      </p>
                    </div>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chat-message ${message.role} fade-in`}
                      data-testid={`message-${message.id}`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="chat-message assistant" data-testid="typing-indicator">
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
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isRecording ? "Listening..." : "Ask Vox anything..."}
                    className="console-input flex-1"
                    disabled={isLoading}
                    data-testid="chat-input"
                  />
                  {/* Microphone Button */}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isLoading}
                    className={`console-button px-4 transition-all relative ${
                      isRecording 
                        ? 'bg-red-500/30 border-red-500 text-red-400' 
                        : 'hover:border-neon-cyan/50'
                    }`}
                    data-testid="mic-btn"
                    title={isRecording ? "Click to stop recording" : "Click to start voice input"}
                  >
                    {isRecording ? (
                      <>
                        {/* Pulsing ring animation */}
                        <span className="absolute inset-0 rounded border-2 border-red-500 animate-ping opacity-75"></span>
                        {/* Recording dot */}
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        <Mic className="w-4 h-4 text-red-400" />
                      </>
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="submit"
                    className="console-button px-4"
                    disabled={isLoading || !inputValue.trim()}
                    data-testid="send-message-btn"
                  >
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
              <div className="console-card p-4" data-testid="tasks-panel">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-neon-purple" />
                    <span className="text-sm font-medium tracking-wider uppercase text-white/90">
                      Tasks
                    </span>
                    <span className="console-badge text-[10px]">
                      {tasks.filter((t) => t.status !== "completed").length}
                    </span>
                  </div>
                  {showTasks ? (
                    <ChevronUp className="w-4 h-4 text-soft" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-soft" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {/* Add Task Form */}
                  <form onSubmit={addTask} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Add a task..."
                      className="console-input flex-1 text-xs py-2"
                      data-testid="add-task-input"
                    />
                    <button
                      type="submit"
                      className="console-button px-3 py-2"
                      data-testid="add-task-btn"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </form>

                  {/* Task List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 rounded-lg bg-black/30 border border-white/5"
                          data-testid={`task-${task.id}`}
                        >
                          {editingTask?.id === task.id ? (
                            // Edit Mode
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingTask.title}
                                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                className="w-full bg-black/40 border border-neon-cyan/30 rounded px-2 py-1 text-xs text-white/90 focus:outline-none"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <select
                                  value={editingTask.priority}
                                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 focus:outline-none flex-1"
                                >
                                  <option value="low">Low</option>
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                </select>
                                <select
                                  value={editingTask.energy_level}
                                  onChange={(e) => setEditingTask({ ...editingTask, energy_level: e.target.value })}
                                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 focus:outline-none flex-1"
                                >
                                  <option value="low">Low Energy</option>
                                  <option value="medium">Medium Energy</option>
                                  <option value="high">High Energy</option>
                                </select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingTask(null)}
                                  className="text-soft hover:text-white"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={updateTask}
                                  className="text-neon-cyan hover:text-white"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() =>
                                  updateTaskStatus(
                                    task.id,
                                    task.status === "completed" ? "pending" : "completed"
                                  )
                                }
                                className="mt-0.5"
                                data-testid={`task-toggle-${task.id}`}
                              >
                                {getStatusIcon(task.status)}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm ${
                                    task.status === "completed"
                                      ? "line-through text-soft/50"
                                      : ""
                                  }`}
                                >
                                  {task.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`text-[10px] uppercase tracking-wide ${getPriorityColor(
                                      task.priority
                                    )}`}
                                  >
                                    {task.priority}
                                  </span>
                                  {task.energy_level && (
                                    <span className="text-[10px] text-soft">
                                      • {task.energy_level} energy
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingTask({ ...task }); }}
                                  className="text-soft/50 hover:text-neon-cyan p-1"
                                  data-testid={`task-edit-${task.id}`}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                  className="text-soft/50 hover:text-neon-orange p-1"
                                  data-testid={`task-delete-${task.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-soft text-center py-4">
                        No tasks yet. Add one above.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Memories Panel */}
            <Collapsible open={showMemories} onOpenChange={setShowMemories}>
              <div className="console-card p-4" data-testid="memories-panel">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-neon-orange" />
                    <span className="text-sm font-medium tracking-wider uppercase text-white/90">
                      Memory
                    </span>
                    <span className="console-badge orange text-[10px]">
                      {memories.length}
                    </span>
                  </div>
                  {showMemories ? (
                    <ChevronUp className="w-4 h-4 text-soft" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-soft" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-xs text-soft mb-3">
                    What Vox remembers about you
                  </p>
                  
                  {/* Add Memory Form */}
                  <form onSubmit={addMemory} className="mb-4 p-3 rounded-lg bg-black/20 border border-white/10">
                    <textarea
                      value={newMemory.content}
                      onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                      placeholder="Add a memory..."
                      className="w-full bg-transparent border-none text-xs text-white/80 resize-none focus:outline-none placeholder:text-soft/50"
                      rows={2}
                      data-testid="add-memory-input"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <select
                        value={newMemory.category}
                        onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 focus:outline-none focus:border-neon-cyan/50"
                        data-testid="add-memory-category"
                      >
                        <option value="fact">Fact</option>
                        <option value="preference">Preference</option>
                        <option value="habit">Habit</option>
                        <option value="context">Context</option>
                        <option value="goal">Goal</option>
                        <option value="relationship">Relationship</option>
                        <option value="health">Health</option>
                        <option value="work">Work</option>
                        <option value="personal">Personal</option>
                        <option value="reminder">Reminder</option>
                      </select>
                      <button
                        type="submit"
                        className="console-button text-[10px] px-3 py-1"
                        disabled={!newMemory.content.trim()}
                        data-testid="add-memory-btn"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                  </form>

                  {/* Memory List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {memories.length > 0 ? (
                      memories.map((memory) => (
                        <div
                          key={memory.id}
                          className={`p-3 rounded-lg bg-black/30 pl-4 ${getCategoryStyle(
                            memory.category
                          )}`}
                          data-testid={`memory-${memory.id}`}
                        >
                          {editingMemory?.id === memory.id ? (
                            // Edit Mode
                            <div className="space-y-2">
                              <textarea
                                value={editingMemory.content}
                                onChange={(e) => setEditingMemory({ ...editingMemory, content: e.target.value })}
                                className="w-full bg-black/40 border border-neon-cyan/30 rounded px-2 py-1 text-xs text-white/90 resize-none focus:outline-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex items-center justify-between">
                                <select
                                  value={editingMemory.category}
                                  onChange={(e) => setEditingMemory({ ...editingMemory, category: e.target.value })}
                                  className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 focus:outline-none"
                                >
                                  <option value="fact">Fact</option>
                                  <option value="preference">Preference</option>
                                  <option value="habit">Habit</option>
                                  <option value="context">Context</option>
                                  <option value="goal">Goal</option>
                                  <option value="relationship">Relationship</option>
                                  <option value="health">Health</option>
                                  <option value="work">Work</option>
                                  <option value="personal">Personal</option>
                                  <option value="reminder">Reminder</option>
                                </select>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingMemory(null)}
                                    className="text-soft hover:text-white"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={updateMemory}
                                    className="text-neon-cyan hover:text-white"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-xs text-white/80 flex-1">
                                  {memory.content}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingMemory({ ...memory }); }}
                                    className="text-soft/50 hover:text-neon-cyan p-1"
                                    data-testid={`memory-edit-${memory.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(memory); }}
                                    className="text-soft/50 hover:text-neon-orange p-1"
                                    data-testid={`memory-delete-${memory.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="console-badge text-[9px]">
                                  {memory.category}
                                </span>
                                {memory.tags?.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[9px] text-soft"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-soft text-center py-4">
                        No memories stored yet
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Calendar Event Modal */}
      <CalendarEventModal
        isOpen={calendarEventModal.isOpen}
        onClose={closeEventModal}
        onSave={saveCalendarEvent}
        onDelete={deleteCalendarEvent}
        event={calendarEventModal.event}
        selectedDate={calendarEventModal.selectedDate}
      />

      {/* Delete Confirmation Modal - Custom implementation for stability */}
      {deleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="delete-modal-overlay"
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          
          {/* Modal Content */}
          <div className="relative console-card border-neon-orange/50 max-w-md w-full mx-4 p-6 z-10">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="absolute top-4 right-4 text-soft hover:text-white"
              data-testid="close-delete-modal"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h2 className="text-lg font-semibold text-white mb-2">Delete Memory?</h2>
            <p className="text-sm text-soft mb-4">
              Are you sure you want to delete this memory? This action cannot be undone.
            </p>
            
            <div className={`p-3 rounded-lg bg-black/30 pl-4 mb-6 ${getCategoryStyle(deleteConfirm.category)}`}>
              <div className="text-xs text-white/80">{deleteConfirm.content}</div>
              <div className="text-[9px] text-soft mt-1">{deleteConfirm.category}</div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="console-button text-xs"
                data-testid="cancel-delete-btn"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMemory}
                className="console-button text-xs border-neon-orange/50 hover:bg-neon-orange/20"
                data-testid="confirm-delete-btn"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




