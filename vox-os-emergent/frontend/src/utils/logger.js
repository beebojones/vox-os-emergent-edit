/**
 * Frontend Logger Utility
 * Logs to console with timestamps and categories
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Set to DEBUG for development, INFO for production
const CURRENT_LEVEL = LOG_LEVELS.DEBUG;

const getTimestamp = () => {
  return new Date().toISOString().split('T')[1].split('.')[0];
};

const formatMessage = (level, category, message, data) => {
  const prefix = `[${getTimestamp()}] [${level}] [${category}]`;
  return { prefix, message, data };
};

const logger = {
  debug: (category, message, data = null) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      const { prefix } = formatMessage('DEBUG', category, message, data);
      if (data) {
        console.log(`🔍 ${prefix} ${message}`, data);
      } else {
        console.log(`🔍 ${prefix} ${message}`);
      }
    }
  },

  info: (category, message, data = null) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      const { prefix } = formatMessage('INFO', category, message, data);
      if (data) {
        console.log(`ℹ️ ${prefix} ${message}`, data);
      } else {
        console.log(`ℹ️ ${prefix} ${message}`);
      }
    }
  },

  warn: (category, message, data = null) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      const { prefix } = formatMessage('WARN', category, message, data);
      if (data) {
        console.warn(`⚠️ ${prefix} ${message}`, data);
      } else {
        console.warn(`⚠️ ${prefix} ${message}`);
      }
    }
  },

  error: (category, message, data = null) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      const { prefix } = formatMessage('ERROR', category, message, data);
      if (data) {
        console.error(`❌ ${prefix} ${message}`, data);
      } else {
        console.error(`❌ ${prefix} ${message}`);
      }
    }
  },

  // Specific loggers for common operations
  api: {
    request: (method, url, data = null) => {
      logger.info('API', `📤 ${method} ${url}`, data);
    },
    response: (method, url, status, data = null) => {
      const emoji = status < 400 ? '📥' : '❌';
      logger.info('API', `${emoji} ${method} ${url} - Status: ${status}`, data);
    },
    error: (method, url, error) => {
      logger.error('API', `${method} ${url} failed`, error);
    },
  },

  chat: {
    send: (message) => {
      logger.info('CHAT', `💬 Sending message: ${message.substring(0, 100)}...`);
    },
    receive: (response) => {
      logger.info('CHAT', `🤖 Received response: ${response.substring(0, 100)}...`);
    },
  },

  calendar: {
    connect: (provider) => {
      logger.info('CALENDAR', `🔗 Connecting to ${provider}`);
    },
    disconnect: (provider) => {
      logger.info('CALENDAR', `🔌 Disconnecting from ${provider}`);
    },
    event: (action, eventData) => {
      logger.info('CALENDAR', `📅 ${action} event`, eventData);
    },
  },

  task: {
    create: (task) => {
      logger.info('TASK', `📋 Creating task: ${task.title}`);
    },
    update: (taskId, updates) => {
      logger.info('TASK', `📋 Updating task: ${taskId}`, updates);
    },
    delete: (taskId) => {
      logger.info('TASK', `📋 Deleting task: ${taskId}`);
    },
  },

  memory: {
    create: (memory) => {
      logger.info('MEMORY', `🧠 Creating memory: ${memory.content?.substring(0, 50)}...`);
    },
    update: (memoryId, updates) => {
      logger.info('MEMORY', `🧠 Updating memory: ${memoryId}`, updates);
    },
    delete: (memoryId) => {
      logger.info('MEMORY', `🧠 Deleting memory: ${memoryId}`);
    },
  },

  ui: {
    action: (action, details = null) => {
      logger.debug('UI', `🖱️ ${action}`, details);
    },
    stateChange: (component, state) => {
      logger.debug('UI', `📊 ${component} state changed`, state);
    },
  },
};

export default logger;
