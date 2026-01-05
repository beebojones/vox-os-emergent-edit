import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://voxconsole.com/api";

// ====================
// SAFETY HELPERS
// ====================

const asArray = (v) => (Array.isArray(v) ? v : []);
const unwrap = (v) => {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") {
    if (Array.isArray(v.items)) return v.items;
    if (Array.isArray(v.messages)) return v.messages;
    if (Array.isArray(v.data)) return v.data;
  }
  return [];
};

export default function VoxDashboard() {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [messages, setMessages] = useState([]);
  const [calendarProviders, setCalendarProviders] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState({
    google: { connected: false },
    outlook: { connected: false },
  });

  // ====================
  // FETCHERS
  // ====================

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API}/calendar`);
      setEvents(unwrap(res.data));
    } catch {
      setEvents([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API}/tasks`);
      setTasks(unwrap(res.data));
    } catch {
      setTasks([]);
    }
  };

  const fetchMemories = async () => {
    try {
      const res = await axios.get(`${API}/memories`);
      setMemories(unwrap(res.data));
    } catch {
      setMemories([]);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API}/chat/history/default`);
      setMessages(unwrap(res.data));
    } catch {
      setMessages([]);
    }
  };

  const fetchCalendarProviders = async () => {
    try {
      const res = await axios.get(`${API}/auth/calendar/providers`);
      setCalendarProviders(asArray(res.data?.providers));
    } catch {
      setCalendarProviders([]);
    }
  };

  const checkCalendarConnection = async () => {
    let google = { connected: false };
    let outlook = { connected: false };

    try {
      const g = await axios.get(`${API}/auth/google/status`);
      google = {
        connected: !!g.data?.connected,
        email: g.data?.email || "",
      };
    } catch {}

    try {
      const o = await axios.get(`${API}/auth/outlook/status`);
      outlook = {
        connected: !!o.data?.connected,
        email: o.data?.email || "",
      };
    } catch {}

    setCalendarStatus({ google, outlook });
    fetchCalendarProviders();
  };

  const initialize = async () => {
    await Promise.all([
      fetchEvents(),
      fetchTasks(),
      fetchMemories(),
    ]);

    await fetchChatHistory();
    await checkCalendarConnection();
  };

  // ====================
  // INIT
  // ====================

  useEffect(() => {
    initialize();
  }, []);

  // ====================
  // RENDER
  // ====================

  return (
    <div className="vox-dashboard">
      <h1>Vox OS</h1>

      <section>
        <h2>Calendar</h2>
        {calendarProviders.length === 0 && (
          <p>No calendar providers available.</p>
        )}
        {calendarProviders.map((p) => (
          <div key={p.id}>
            {p.name} ·{" "}
            {calendarStatus[p.id]?.connected ? "Connected" : "Not connected"}
          </div>
        ))}
      </section>

      <section>
        <h2>Tasks</h2>
        {asArray(tasks).map((t) => (
          <div key={t.id}>{t.title}</div>
        ))}
      </section>

      <section>
        <h2>Memories</h2>
        {asArray(memories).map((m) => (
          <div key={m.id}>{m.content}</div>
        ))}
      </section>

      <section>
        <h2>Chat</h2>
        {asArray(messages).length === 0 && <p>No messages yet.</p>}
        {asArray(messages).map((m) => (
          <div key={m.id}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </section>
    </div>
  );
}
