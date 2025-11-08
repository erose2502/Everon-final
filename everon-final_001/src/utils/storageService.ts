// Local storage persistence for chat history
export const STORAGE_KEYS = {
  CHAT_HISTORY: 'everon_chat_history',
  LANGUAGE_PREFERENCE: 'everon_language',
  USER_STATS: 'everon_user_stats'
};

export const storageService = {
  // Save chat history
  saveChatHistory: (messages: Array<{role: string, content: string}>) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  },

  // Load chat history
  loadChatHistory: (): Array<{role: string, content: string}> | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load chat history:', error);
      return null;
    }
  },

  // Save language preference
  saveLanguage: (language: string) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE_PREFERENCE, language);
    } catch (error) {
      console.warn('Failed to save language:', error);
    }
  },

  // Load language preference
  loadLanguage: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREFERENCE);
    } catch (error) {
      console.warn('Failed to load language:', error);
      return null;
    }
  },

  // Clear all data
  clearAll: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  },

  // Track usage stats (for gamification)
  saveStats: (stats: {
    conversationCount: number;
    totalMessages: number;
    streak: number;
    lastActiveDate: string;
  }) => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_STATS, JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to save stats:', error);
    }
  },

  loadStats: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_STATS);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load stats:', error);
      return null;
    }
  }
};
