// Chat History Service - Firestore
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  language: string;
}

// Save chat session
export const saveChatSession = async (
  userId: string,
  messages: ChatMessage[],
  language: string,
  sessionId?: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
  try {
    // Generate session ID if not provided
    const id = sessionId || `session_${Date.now()}`;
    
    // Generate title from first user message (max 50 chars)
    const firstUserMessage = messages.find(m => m.role === 'user');
    const title = firstUserMessage 
      ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
      : 'New Conversation';

    const chatSession: ChatSession = {
      id,
      userId,
      title,
      messages: messages.map(m => ({
        ...m,
        timestamp: m.timestamp || new Date()
      })),
      createdAt: sessionId ? (await getDoc(doc(db, 'chatSessions', id))).data()?.createdAt.toDate() || new Date() : new Date(),
      updatedAt: new Date(),
      language
    };

    await setDoc(doc(db, 'chatSessions', id), {
      ...chatSession,
      createdAt: Timestamp.fromDate(chatSession.createdAt),
      updatedAt: Timestamp.fromDate(chatSession.updatedAt),
      messages: chatSession.messages.map(m => ({
        ...m,
        timestamp: Timestamp.fromDate(m.timestamp!)
      }))
    });

    return { success: true, sessionId: id };
  } catch (error: any) {
    console.error('Error saving chat session:', error);
    return { success: false, error: error.message };
  }
};

// Load a specific chat session
export const loadChatSession = async (sessionId: string): Promise<ChatSession | null> => {
  try {
    const docRef = doc(db, 'chatSessions', sessionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        messages: data.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp.toDate()
        }))
      } as ChatSession;
    }
    return null;
  } catch (error) {
    console.error('Error loading chat session:', error);
    return null;
  }
};

// Get all chat sessions for a user
export const getUserChatSessions = async (
  userId: string,
  maxSessions: number = 50
): Promise<ChatSession[]> => {
  try {
    const sessionsRef = collection(db, 'chatSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(maxSessions)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions: ChatSession[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        messages: data.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp.toDate()
        }))
      } as ChatSession);
    });
    
    return sessions;
  } catch (error) {
    console.error('Error getting user chat sessions:', error);
    return [];
  }
};

// Delete a chat session
export const deleteChatSession = async (sessionId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'chatSessions', sessionId));
    return true;
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return false;
  }
};

// Auto-save current conversation (debounced)
let saveTimeout: NodeJS.Timeout | null = null;

export const autoSaveChatSession = (
  userId: string,
  messages: ChatMessage[],
  language: string,
  sessionId?: string,
  delay: number = 3000 // 3 seconds debounce
) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    await saveChatSession(userId, messages, language, sessionId);
  }, delay);
};
