import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Import the worker as a URL so the bundled worker matches the installed pdfjs-dist version (Vite-friendly)
// The `?url` suffix tells Vite to return the file URL instead of bundling its contents.
// the package provides .mjs worker files; import the existing file with .mjs extension so Vite can resolve it
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import './App.css';
import { askOpenAIAgent } from './agents';

// Direct resume analysis function with proper token limits
const analyzeResumeDirectly = async (
  resumeText: string, 
  onStream?: (partial: string) => void
): Promise<string> => {
  const resumeSystemPrompt = `You are an expert career coach and resume reviewer. When provided with resume content, analyze it immediately and give specific feedback. Never ask for the resume content if it's already provided in the user message. Always analyze what you're given and provide detailed, actionable insights based on the actual content you can see.`;
  
  const resumePrompt = `IMPORTANT: You have been provided with a complete resume to analyze. Do NOT ask for the resume content - it is already included below. Analyze the provided resume content thoroughly and give specific feedback based on what you see.

Provide a detailed professional review of this resume. Format your response with these sections:

**📋 Summary**
Brief overview of this candidate's profile and career level based on the resume content below.

**💪 Strengths** 
Specific strengths and standout qualifications from this resume.

**🎯 Areas for Improvement**
Specific areas in this resume that could be enhanced.

**📈 Recommendations**
Actionable suggestions for improving this specific resume.

**🔍 Keywords & ATS Optimization**
Industry keywords and ATS-friendly suggestions for this resume's target field.

RESUME TO ANALYZE:
${resumeText}

ANALYZE THE ABOVE RESUME CONTENT - DO NOT ASK FOR MORE INFORMATION.`;

  const messages = [
    { role: "system", content: resumeSystemPrompt },
    { role: "user", content: resumePrompt }
  ];

  const response = await fetch("/api/chat-completion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      max_tokens: 1500, // Much higher token limit for detailed analysis
      stream: true,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  // Stream response handling
  const reader = response.body?.getReader();
  let result = "";
  const decoder = new TextDecoder("utf-8");
  
  while (reader) {
    const { value, done } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      if (line.startsWith("data: ")) {
        const json = line.replace("data: ", "").trim();
        if (json === "[DONE]") break;
        
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content) {
            result += content;
            if (onStream) onStream(result);
          }
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  }
  
  return result;
};
import { askOpenAIVoiceAgent } from './voiceAgent';
import ParticleBackground from './ParticleBackground';
import ChatBubble from './components/ChatBubble';
import ThinkingAnimation from './components/ThinkingAnimation';
import VoiceSpectrum from './components/VoiceSpectrum';
import SwipeableJobCards from './components/SwipeableJobCards';
import SpeechModeUI from './components/SpeechModeUI';
import { SuccessCelebration, PremiumProcessingIndicator } from './components/PremiumAnimations';
import HandoffAnimation from './components/HandoffAnimation';
import JobSearchHandoffAnimation from './components/JobSearchHandoffAnimation';
import StartupAnimation from './components/StartupAnimation';
import LanguageSuggestion from './components/LanguageSuggestion';
import { jobSearchService } from './utils/jobSearchService';
import type { JobSearchResult } from './types/job'
import type { UserProfile as JobUserProfile } from './types/job';
import { useLiveKitVoice } from './hooks/useLiveKitVoice';
import { useAuth } from './hooks/useAuth';
import { ttsService } from './utils/openaiTtsService';
import { webSearchService } from './utils/webSearchService';
import { autoSaveChatSession } from './services/chatHistoryService';
import InstallPrompt from './components/InstallPrompt';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import LanguageSettings from './components/LanguageSettings';
import Onboarding from './components/Onboarding';
import { autoDetectAndUpdateLanguage } from './utils/languageUtils';

declare global {
  interface Window {
    mammoth?: any;
  }
}

// Use the worker URL from the installed package to avoid version mismatch with any public worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  meta?: { structured?: boolean };
}


function App() {

  console.log('App component rendering');


  // Startup animation enabled - shows the beautiful opening animation when app loads
  const [showStartupAnimation, setShowStartupAnimation] = useState(true);
  const [showLanguageSuggestion, setShowLanguageSuggestion] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [partialReply, setPartialReply] = useState('');
  const [voiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // TTS is now manual only - users click speaker icon to hear responses
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string, type: string, url: string } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Job search related state
  const [jobResults, setJobResults] = useState<JobSearchResult[]>([]);
  const [hasUploadedResume, setHasUploadedResume] = useState(false);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [showJobResults, setShowJobResults] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [speechMode, setSpeechMode] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{title: string; message: string}>({
    title: '',
    message: ''
  });
  const [showProcessingIndicator, setShowProcessingIndicator] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [hasUsedSpeechMode, setHasUsedSpeechMode] = useState(false);
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
  const [currentTTSMessageIndex, setCurrentTTSMessageIndex] = useState<number | null>(null);
  
  // Authentication state
  const { user, userProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [listeningTimeout, setListeningTimeout] = useState<number | null>(null);
  const [ttsLock, setTTSLock] = useState(false); // Prevent TTS interruption
  const [showHandoffAnimation, setShowHandoffAnimation] = useState(false);
  const [handoffStep, setHandoffStep] = useState(0);
  const [handoffInterval, setHandoffInterval] = useState<number | null>(null);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [jobSearchMode, setJobSearchMode] = useState(false); // Off by default, enabled for logged-in users
  const [jobSearchPrompt, setJobSearchPrompt] = useState('');
  const [jobSearchIntent, setJobSearchIntent] = useState<'none' | 'curious' | 'actively_searching'>('none');
  
  // Voice conversation tracking to prevent repetitive questions
  const [askedTopics, setAskedTopics] = useState<Set<string>>(new Set());
  const [, setConversationPhase] = useState<'greeting' | 'gathering' | 'searching' | 'advising'>('greeting');
  
  // Language preference state - will be synced with user profile
  const [language, setLanguage] = useState<'english' | 'french' | 'swahili' | 'arabic' | 'spanish' | 'auto'>('auto');
    // For auto-detect, store last detected language
  const [detectedLang, setDetectedLang] = useState<string>('en-US');
  
  // Job profile state - separate from auth user profile
  const [jobProfile, setJobProfile] = useState<JobUserProfile | null>(null);
  
  // --- Phase 3: Job Search State ---
  // Removed unused jobSearchLoading state

  // LiveKit Voice Agent Configuration - Mobile-safe environment variables
  const livekitConfig = {
    wsUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIVEKIT_WS_URL) || 'wss://everon-j8bcgnfb.livekit.cloud',
    apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIVEKIT_API_KEY) || 'APIbVwcHU7dWxMu', 
    apiSecret: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIVEKIT_API_SECRET) || 'tMcus2fal3ozu33hRvoRlUTJHex6GbX5fCYqTkLB2WbA',
    roomName: 'everon-voice-chat'
  };

  // Manual listening mode - no auto-restart
  // TTS handler for chat bubbles
  const handleTTSPlay = async (text: string, messageIndex: number) => {
    // Stop any current TTS
    ttsService.stop();
    setIsTTSSpeaking(false);
    setCurrentTTSMessageIndex(null);
    setIsTTSPaused(false);

    try {
      setIsTTSSpeaking(true);
      setCurrentTTSMessageIndex(messageIndex);
      
      await ttsService.speak(text, {
        language: language,
        onEnd: () => {
          setIsTTSSpeaking(false);
          setCurrentTTSMessageIndex(null);
          setIsTTSPaused(false);
        },
        onError: (error) => {
          console.error('TTS error:', error);
          setIsTTSSpeaking(false);
          setCurrentTTSMessageIndex(null);
          setIsTTSPaused(false);
        }
      });
    } catch (error) {
      console.error('TTS failed:', error);
      setIsTTSSpeaking(false);
      setCurrentTTSMessageIndex(null);
      setIsTTSPaused(false);
    }
  };

  // TTS pause handler
  const handleTTSPause = () => {
    if (ttsService.isSpeaking()) {
      ttsService.pause();
      setIsTTSPaused(true);
    }
  };

  // TTS resume handler
  const handleTTSResume = () => {
    if (isTTSPaused) {
      ttsService.resume();
      setIsTTSPaused(false);
    }
  };

  // Job search mode toggle - simple on/off without messages
  const handleJobSearchMode = () => {
    setJobSearchMode(prev => !prev);
    if (!jobSearchMode) {
      setJobSearchPrompt('I want to find jobs. ');
    } else {
      setJobSearchPrompt('');
    }
    setShowDropdown(false);
  };

  // Logout handler
  const handleLogout = () => {
    setMessages([]);
    setCurrentSessionId(null);
    // Auth service logout will be called by UserMenu component
  };

  // Load chat session from history
  const handleLoadSession = (sessionId: string, messages: any[]) => {
    setCurrentSessionId(sessionId);
    setMessages(messages);
  };

  // Start new chat
  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setJobResults([]);
    
    // Show welcome message if user is logged in
    if (user) {
      const firstName = user.displayName?.split(' ')[0] || 'there';
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `Hi ${firstName}! 👋 Ready for a new conversation! What would you like to work on today?`
      };
      setMessages([welcomeMessage]);
    }
  };

  // LiveKit Voice Agent Hook - with speech recognition callback
  const livekit = useLiveKitVoice(livekitConfig, async (transcript: string) => {
    
    // Only auto-detect language if user is logged in AND preference is 'auto'
    // For non-logged-in users, always use English (no auto-switching)
    const detectedLanguage = !user 
      ? 'english' // Non-logged-in users always use English
      : userProfile?.preferences?.language && userProfile.preferences.language !== 'auto'
        ? userProfile.preferences.language // Force user's preferred language
        : autoDetectAndUpdateLanguage(
            transcript, 
            language, 
            (lang: string) => setLanguage(lang as any), 
            setDetectedLang
          );
    
    // Update TTS language
    ttsService.setLanguage(detectedLanguage);
    
    // CRITICAL: Only stop listening if TTS is not currently speaking
    // This prevents interrupting AI responses mid-sentence
    if (!ttsLock && !isTTSSpeaking) {
      await livekit.stopListening();
      console.log('🛑 Stopped listening - user speech detected while AI is not speaking');
    } else {
      console.log('🔒 TTS protection active - ignoring speech input until AI finishes');
      return; // Don't process user input while AI is speaking
    }
    
    // Show the user's speech immediately as they speak
    setCurrentTranscript(`You: ${transcript}`);
    setIsProcessingSpeech(true);
    
    try {
      let response: string;
      
      // Auto-detect job search intent and activate tools automatically
      const allMessages = messages.slice(-4); // Check recent conversation context
      const conversationContext = allMessages.map(msg => msg.content).join(' ').toLowerCase();
      const currentInput = transcript.toLowerCase();
      
      // Enhanced recruiter-style keyword detection
      const jobKeywords = /\b(job|jobs|work|position|positions|role|roles|career|careers|hire|hiring|employ|employment|salary|company|companies|interview|resume|cv|developer|developers|engineer|engineers|manager|managers|analyst|analysts|opportunity|opportunities)\b/;
      const searchTriggers = /\b(find me|show me|get me|search for|look for|looking for|seeking|want|need|interested in|available|openings|hiring|recruiting)\b/;
      const locationTriggers = /\b(near me|in|at|from|remote|hybrid|onsite|local|nearby|city|state|area)\b/;
      
      // Recruiter-focused detection - more aggressive
      const isJobRelated = jobKeywords.test(currentInput) || jobKeywords.test(conversationContext);
      const hasSearchIntent = searchTriggers.test(currentInput);
      const hasLocationContext = locationTriggers.test(currentInput);
      
      // Auto-search triggers (recruiter behavior)
      const shouldAutoSearch = (isJobRelated && hasSearchIntent) || 
                              (hasSearchIntent && hasLocationContext) ||
                              /\b(find.*job|job.*find|hiring.*near|work.*remote|position.*in)\b/.test(currentInput);
      
      if (shouldAutoSearch) {
        console.log('🤖 Auto-detected job search intent, activating web search...');
        setActiveTools(['websearch']); // Auto-activate web search
        
        // Show user that we're automatically searching
        setCurrentTranscript('🔍 Analyzing your request and searching for jobs...');
      }
      
      // Check if tools are active (manually or auto-activated) and handle accordingly
      if (activeTools.length > 0 || shouldAutoSearch) {
        console.log('🛠️ Processing request with active tools:', activeTools);
        
        let searchResults = '';
        
        if (activeTools.includes('websearch') || shouldAutoSearch) {
          try {
            console.log('🔍 Performing real-time web search...');
            setIsSearchingJobs(true); // Show job search animation
            
            // Safety timeout to ensure animation doesn't get stuck
            setTimeout(() => {
              setIsSearchingJobs(false);
            }, 15000); // 15 second timeout
            
            // Always focus on jobs - this is a career coach
            if (transcript.toLowerCase().includes('trend') || transcript.toLowerCase().includes('market')) {
              const trends = await webSearchService.getJobMarketTrends();
              searchResults = `Top 2 trending roles: ${trends.slice(0, 2).map(t => t.title).join(', ')}. `;
            } else {
              const jobs = await webSearchService.searchJobs(transcript, jobProfile || undefined);
              
              // Set job results for carousel display (same as regular chat mode)
              if (jobs && jobs.length > 0) {
                setJobResults(jobs);
                setShowJobResults(true);
                
                // Create detailed voice response that reads out the positions
                const topJobs = jobs.slice(0, 3); // Read out top 3 jobs
                let detailedResults = `I found ${jobs.length} relevant job opportunities for you! Here are the top positions: `;
                
                topJobs.forEach((job, index) => {
                  const jobNumber = index + 1;
                  const salaryInfo = job.salary ? ` with salary ${job.salary}` : '';
                  const locationInfo = job.location ? ` located in ${job.location}` : '';
                  
                  detailedResults += `${jobNumber}. ${job.title} at ${job.company}${salaryInfo}${locationInfo}. `;
                  
                  // Add brief description for the first job
                  if (index === 0 && job.description) {
                    const shortDesc = job.description.split('.')[0] || job.description.substring(0, 100);
                    detailedResults += `This role involves ${shortDesc.toLowerCase()}. `;
                  }
                });
                
                if (jobs.length > 3) {
                  detailedResults += `Plus ${jobs.length - 3} more opportunities available in the job carousel above. `;
                }
                
                detailedResults += `You can see all the details in the job cards displayed above!`;
                searchResults = detailedResults;
              } else {
                searchResults = `I searched extensively but couldn't find specific job listings right now. Let me help you refine your search or explore other opportunities. `;
              }
            }
          } catch (error) {
            console.error('Web search failed:', error);
            searchResults = `Let me help you find jobs. `;
          } finally {
            setIsSearchingJobs(false); // Hide job search animation
          }
        }
        
        // Extract information from conversation history
        const allMessages = messages.slice(-8); // Last 8 messages for full context
        const conversationText = allMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
        
        // Analyze what information we already have
        const hasRole = /(?:looking for|want|seeking|interested in|as a|position|job|role).*?(developer|engineer|manager|analyst|designer|data scientist|product manager|marketing|sales|consultant|specialist|coordinator)/i.test(conversationText);
        const hasLocation = /(?:remote|hybrid|onsite|in |from |located|area|city|state|country|anywhere)/i.test(conversationText);
        const hasSalary = /(?:\$|salary|pay|compensation|income|k |000|budget|range).*?[\d,]+/i.test(conversationText);
        const hasExperience = /(?:year|experience|exp|junior|senior|mid-level|entry|level|\d+\s*years?)/i.test(conversationText);
        
        console.log('Info extracted:', { hasRole, hasLocation, hasSalary, hasExperience });
        
        // Determine what to ask next based on missing information
        let nextQuestion = '';
        if (!hasRole) {
          nextQuestion = 'What specific role are you targeting?';
        } else if (!hasLocation) {
          nextQuestion = 'Any location preferences? (remote, specific city, etc.)';
        } else if (!hasSalary) {
          nextQuestion = 'What\'s your target salary range?';
        } else if (!hasExperience) {
          nextQuestion = 'How many years of experience do you have?';
        }
        
        // Prepare enhanced prompt
        const enhancedPrompt = `${searchResults}${shouldAutoSearch ? '[AUTO-SEARCH ACTIVATED] ' : ''}User said: "${transcript}". 
        
Context - Already discussed: Role:${hasRole ? 'Yes' : 'No'}, Location:${hasLocation ? 'Yes' : 'No'}, Salary:${hasSalary ? 'Yes' : 'No'}, Experience:${hasExperience ? 'Yes' : 'No'}

${shouldAutoSearch ? 'I automatically searched for jobs based on your request. ' : ''}${nextQuestion ? `Ask: "${nextQuestion}"` : 'You have enough info - provide job recommendations or next steps.'}`;
        
        // Use the full agent for tool-enhanced responses
        const userName = user?.displayName?.split(' ')[0];
        response = await askOpenAIAgent(enhancedPrompt, undefined, detectedLanguage, userName);
        
        // Deactivate tools after processing (single-use behavior)
        setTimeout(() => {
          setActiveTools([]);
          console.log('🔄 Tools deactivated after use');
        }, 500); // Small delay to show the activation briefly
      } else {
        // Smart conversation tracking to avoid repetitive questions
        const recentMessages = messages.slice(-8); // Last 8 messages for better context
        const conversationText = recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
        
        // Track what's been discussed to avoid repetition
        const discussedTopics = {
          role: /(?:role|position|job|title|work as|looking for|want to be|career|profession)/i.test(conversationText),
          location: /(?:location|where|remote|city|state|area|live|based|prefer)/i.test(conversationText),
          salary: /(?:salary|pay|money|compensation|income|budget|\$)/i.test(conversationText),
          experience: /(?:experience|years|level|background|worked|previous|skills)/i.test(conversationText),
          timeline: /(?:when|start|timeline|available|looking to)/i.test(conversationText),
          company: /(?:company|employer|startup|corporation|team)/i.test(conversationText)
        };
        
        // Check recent AI responses to avoid asking same questions
        const recentAIQuestions = recentMessages
          .filter(msg => msg.role === 'assistant')
          .map(msg => msg.content.toLowerCase())
          .join(' ');
        
        const hasAskedAbout = {
          role: /what.*role|what.*job|what.*position|looking for/i.test(recentAIQuestions),
          location: /where.*work|location|remote/i.test(recentAIQuestions),
          salary: /salary|pay|compensation/i.test(recentAIQuestions),
          experience: /experience|background|years/i.test(recentAIQuestions)
        };
        
        // Update conversation phase and tracking
        const messageCount = messages.length;
        const currentPhase = messageCount < 2 ? 'greeting' : 
                           messageCount < 8 ? 'gathering' : 
                           discussedTopics.role && discussedTopics.location ? 'searching' : 'advising';
        setConversationPhase(currentPhase);
        
        console.log(`🎯 Voice Agent Phase: ${currentPhase}, Messages: ${messageCount}`);
        
        // Track what we've recently asked about to avoid repetition
        const newAskedTopics = new Set(askedTopics);
        Object.entries(hasAskedAbout).forEach(([topic, asked]) => {
          if (asked) newAskedTopics.add(topic);
        });
        setAskedTopics(newAskedTopics);
        
        // Create context-aware prompt for more natural conversations
        const contextPrompt = `
CONVERSATION CONTEXT: The user just said "${transcript}"
PHASE: ${currentPhase.toUpperCase()}
MESSAGE COUNT: ${messageCount}

DISCUSSION HISTORY:
- Role/Position: ${discussedTopics.role ? '✓ Discussed' : '✗ Not mentioned'}
- Location: ${discussedTopics.location ? '✓ Discussed' : '✗ Not mentioned'}  
- Experience: ${discussedTopics.experience ? '✓ Discussed' : '✗ Not mentioned'}
- Salary: ${discussedTopics.salary ? '✓ Discussed' : '✗ Not mentioned'}

PREVIOUSLY ASKED: ${Array.from(newAskedTopics).join(', ') || 'Nothing'}

INSTRUCTIONS: 
- ${currentPhase === 'greeting' ? 'Welcome enthusiastically and ask what brings them here' : ''}
- ${currentPhase === 'gathering' ? 'Ask about ONE new topic not yet discussed, be encouraging' : ''}
- ${currentPhase === 'searching' ? 'Offer to search for jobs or provide specific career tips' : ''}
- ${currentPhase === 'advising' ? 'Give actionable career advice or motivation' : ''}
- NEVER repeat questions about topics in PREVIOUSLY ASKED list
- Be upbeat, use casual language, show genuine excitement about helping
- If user asks about your creator, mention you were built by an innovative developer who wanted to help job seekers succeed`;
        
        const userName = user?.displayName?.split(' ')[0];
        response = await askOpenAIVoiceAgent(contextPrompt, recentMessages, undefined, detectedLanguage, userName);
      }
      
      // Add user message to chat
      setMessages(prev => [...prev, { role: 'user', content: transcript }]);
      
      // Add AI response to chat
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        // Show AI response as text while it speaks
        setCurrentTranscript(`Everon: ${response}`);
        
        // Speak the AI response aloud with protection
        setIsTTSSpeaking(true);
        setTTSLock(true); // Lock to prevent interruption
        try {
          await ttsService.speak(response, {
            language: detectedLanguage,
            onStart: () => {
              console.log('🔒 TTS started speaking - protected from interruption');
            },
            onEnd: () => {
              console.log('🔓 TTS finished speaking - releasing lock and resuming listening');
              setIsTTSSpeaking(false);
              setTTSLock(false); // Release lock
              
              // Keep showing the AI response text instead of clearing it
              // This maintains conversation context
              
              // Manual mode: User must click to start listening again
              console.log('🎤 TTS finished - waiting for user to manually start listening');
            },
            onError: (error) => {
              console.error('TTS error:', error);
              setIsTTSSpeaking(false);
              setTTSLock(false); // Release lock on error
              // Manual mode: User must restart listening after TTS error
            }
          });
        } catch (ttsError) {
          console.error('TTS failed:', ttsError);
          setIsTTSSpeaking(false);
          setTTSLock(false); // Release lock on catch error
          // Manual mode: User must manually restart listening
        }
      }
    } catch (error) {
      console.error('Voice agent error:', error);
      // Manual mode: User must manually restart listening on error
    } finally {
      setIsProcessingSpeech(false);
      // Don't clear the transcript - keep showing conversation context
      // The transcript will be updated when the next user speaks
    }
  }, detectedLang);

  // Example resume text (replace with actual resume parsing later)

  // (Removed unused handleJobSearch function)

  // Check if user has completed onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('everon_onboarding_completed');
    if (!hasCompletedOnboarding && !showStartupAnimation) {
      // Show onboarding after startup animation completes
      setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
    }
  }, [showStartupAnimation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partialReply]);

  // Keep voiceModeRef in sync with voiceMode
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  // Sync language preference from user profile
  useEffect(() => {
    if (userProfile?.preferences?.language) {
      const preferredLang = userProfile.preferences.language;
      // Only update if it's a valid language option
      if (['english', 'french', 'swahili', 'arabic', 'spanish', 'chinese', 'swedish', 'portuguese', 'hindi', 'german', 'japanese', 'korean', 'auto'].includes(preferredLang)) {
        setLanguage(preferredLang as any);
        console.log(`🌍 User's preferred language set to: ${preferredLang}`);
      }
    }
  }, [userProfile]);

  // Cleanup listening timeout on component unmount
  useEffect(() => {
    return () => {
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
      }
      ttsService.stop();
    };
  }, [listeningTimeout]);

  // Auto-save chat history when messages change and user is authenticated
  useEffect(() => {
    if (user && messages.length > 0) {
      autoSaveChatSession(
        user.uid,
        messages,
        language,
        currentSessionId || undefined
      );
      // Generate session ID on first save if not exists
      if (!currentSessionId && messages.length > 0) {
        const newSessionId = `${user.uid}_${Date.now()}`;
        setCurrentSessionId(newSessionId);
      }
    }
  }, [messages, user, language, currentSessionId]);

  // Welcome message when user logs in
  useEffect(() => {
    if (user && messages.length === 0) {
      const firstName = user.displayName?.split(' ')[0] || 'there';
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `Hi ${firstName}! 👋 It's great to see you again! I'm Everon, your AI career coach. I'm here to help you with resume reviews, job searching, interview prep, career advice, and more. What would you like to work on today?`
      };
      setMessages([welcomeMessage]);
    }
  }, [user]);

  // Enable job search mode for logged-in users, disable for non-logged-in users
  useEffect(() => {
    if (user) {
      setJobSearchMode(true); // Enable for logged-in users
    } else {
      setJobSearchMode(false); // Disable for non-logged-in users
    }
  }, [user]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const sendMessage = async (text?: string) => {
    const messageToSend = (text || input).trim();
    if (!messageToSend) return;

    console.log('sendMessage called. voiceMode:', voiceMode, 'messageToSend:', messageToSend);

    // Auto-detect language from user input for regular chat
    // For non-logged-in users, always use English (no auto-switching)
    const detectedLanguage = !user 
      ? 'english' // Non-logged-in users always use English
      : autoDetectAndUpdateLanguage(
          messageToSend,
          language,
          (lang: string) => setLanguage(lang as any),
          setDetectedLang
        );
    
    console.log('🌍 Detected language for this message:', detectedLanguage);

    setMessages((prev: Message[]) => [...prev, { role: 'user', content: messageToSend }]);
    setInput('');
    setLoading(true);
    setPartialReply('');

    // Use detected language for the response
    let languageInstruction = '';
    switch (detectedLanguage) {
      case 'french':
        languageInstruction = 'Répondez en français uniquement.';
        break;
      case 'swahili':
        languageInstruction = 'Jibu kwa Kiswahili tu.';
        break;
      case 'arabic':
        languageInstruction = 'الرد باللغة العربية فقط.';
        break;
      case 'spanish':
        languageInstruction = 'Responde solo en español.';
        break;
      case 'portuguese':
        languageInstruction = 'Responda apenas em português.';
        break;
      case 'hindi':
        languageInstruction = 'केवल हिंदी में जवाब दें।';
        break;
      case 'german':
        languageInstruction = 'Antworte nur auf Deutsch.';
        break;
      case 'japanese':
        languageInstruction = '日本語のみで回答してください。';
        break;
      case 'korean':
        languageInstruction = '한국어로만 답변하세요.';
        break;
      default:
        languageInstruction = 'Please respond in English.';
    }
    
    console.log('📝 Language instruction:', languageInstruction);

    try {
      // Now process the message (AI starts thinking) - get the response
      const aiResponse = await processMessage(languageInstruction + '\n' + messageToSend, detectedLanguage);
      
      // Only add the assistant message if there's actual content
      // Empty string means job search already handled the response
      if (aiResponse && aiResponse.trim().length > 0) {
        console.log('✅ AI response ready, adding to chat...');
        setMessages((prev: Message[]) => [...prev, { 
          role: 'assistant', 
          content: aiResponse 
        }]);
      } else {
        console.log('✅ AI response empty (job search handled) - skipping message add');
      }
      
      // If in voice mode, automatically start listening again after response
      if (voiceModeRef.current) {
        console.log('Voice mode active, scheduling next listening session...');
        // Small delay to ensure audio cleanup and give user a moment to respond
        setTimeout(() => {
          console.log('Timeout executed. voiceModeRef:', voiceModeRef.current, 'isListening:', isListening, 'isSpeaking:', isSpeaking);
          // Double-check we're still in voice mode and not currently busy
          if (voiceModeRef.current && !isListening && !isSpeaking) {
            console.log('Starting listening for next user input...');
            startListening();
          } else {
            console.log('Cannot start listening - conditions not met');
          }
        }, 1000); // Slightly longer delay for better audio separation
      } else {
        console.log('Not in voice mode, skipping continuous listening');
      }
    } catch (err) {
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: 'Error: ' + (err as Error).message }]);
    } finally {
      setLoading(false);
      setPartialReply('');
    }
  };

  // Stop any ongoing speech
  const stopSpeaking = () => {
    // Stop OpenAI audio
    if (audioRef.current) {
      try {
        // Only pause if audio is not already paused and has started loading
        if (!audioRef.current.paused && audioRef.current.readyState >= 2) {
          audioRef.current.pause();
        }
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      } catch (error) {
        console.log('Audio stop error (safe to ignore):', error);
        audioRef.current = null;
      }
    }
    
    // Stop browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  };



  const startListening = () => {
    console.log('startListening called. isSpeaking:', isSpeaking, 'isListening:', isListening);

    // Don't start listening if already speaking or listening
    if (isSpeaking || isListening) {
      console.log('Cannot start listening: already speaking or listening');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    console.log('Initializing speech recognition...');

    // Stop any ongoing speech before starting to listen
    stopSpeaking();

    const recognition = new SpeechRecognition();
    // Set recognition language for auto-detect or user preference
    let recogLang = '';
    if (language !== 'auto') {
      switch (language) {
        case 'french': recogLang = 'fr-FR'; break;
        case 'swahili': recogLang = 'sw-KE'; break;
        case 'arabic': recogLang = 'ar-EG'; break;
        case 'spanish': recogLang = 'es-ES'; break;
        case 'english': recogLang = 'en-US'; break;
        default: recogLang = '';
      }
    }
    // For auto-detect, recogLang remains '' (empty string)
    recognition.lang = recogLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);
    console.log('Speech recognition started, listening for input...');

    recognition.onresult = async (event: any) => {
      // Try to get detected language from event
      let detected = recogLang;
      if (language === 'auto' && event.results && event.results[0][0]?.language) {
        detected = event.results[0][0].language;
      }
      if (language === 'auto' && detected) {
        setDetectedLang(detected);
      }
      const transcript = event.results[0][0].transcript;
      console.log('Voice recognition result received. transcript:', transcript, 'detectedLang:', detected, 'current voiceModeRef:', voiceModeRef.current);
      setIsListening(false);

      // Additional check: don't process if we're currently speaking
      if (isSpeaking) {
        console.log('Ignoring voice input while speaking');
        return;
      }

      // Send the transcribed message (TTS will happen automatically in sendMessage)
      await sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        alert('Voice recognition error: ' + event.error);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      const fileData = { name: file.name, type: file.type, url: URL.createObjectURL(file) };
      
      if (speechMode) {
        // In voice mode, automatically process the resume without preview
        setPreviewFile(fileData);
        // Auto-process the file immediately in voice mode
        setTimeout(() => processPreviewFile(), 100);
        
        // Provide voice feedback
        const uploadMessage = `I've received your resume "${file.name}". I'm now analyzing it to understand your background and skills for better job matching.`;
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: uploadMessage
        }]);
        
        // Speak the confirmation
        ttsService.speak(uploadMessage);
        setIsTTSSpeaking(true);
      } else {
        // Regular chat mode - show preview first
        setPreviewFile(fileData);
      }
    }
  };

  const processPreviewFile = async () => {
    if (!previewFile) return;
    const { type, url } = previewFile;
    setPreviewFile(null);
    
    // Show handoff animation with cycling messages
    setShowHandoffAnimation(true);
    setUploadStatus(null); // Clear basic status
    setHandoffStep(0);
    
    // Start cycling through processing messages with extended timing
    const messages = [
      "Parsing document structure...",
      "Extracting key information...",
      "Analyzing your experience...",
      "Identifying key skills...", 
      "Evaluating career achievements...",
      "Reviewing education & certifications...",
      "Assessing industry alignment...",
      "Preparing personalized insights..."
    ];
    
    const interval = setInterval(() => {
      setHandoffStep(prev => {
        const next = (prev + 1) % messages.length;
        return next;
      });
    }, 3000); // Extended to 3 seconds per message
    
    // Store interval ID to clear later
    setHandoffInterval(interval as unknown as number);
    let parsedText = '';

    try {
      if (type === 'application/pdf') {
        const pdf = await pdfjsLib.getDocument(url).promise;
        console.log('PDF loaded, pages:', pdf.numPages);
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          parsedText += pageText + ' ';
          console.log(`Page ${i} text length:`, pageText.length);
        }
      } else if (type.includes('wordprocessingml') && window.mammoth) {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        parsedText = result.value.replace(/<[^>]+>/g, ' ');
      } else if (type.startsWith('text/')) {
        parsedText = await (await fetch(url)).text();
      } else {
        throw new Error('Unsupported file type.');
      }

      // Debug: Check if resume text was extracted
      console.log('Extracted resume text length:', parsedText.length);
      console.log('First 200 chars:', parsedText.substring(0, 200));
      
      if (!parsedText || parsedText.trim().length < 50) {
        throw new Error('Unable to extract readable text from the resume. Please ensure the file contains readable text.');
      }

      // Use direct OpenAI API call for resume analysis to bypass token limitations
      setLoading(true);
      const fullReply = await analyzeResumeDirectly(parsedText, setPartialReply);
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: fullReply, meta: { structured: true } }]);
      
      // Extract and store user profile from resume for future job searches
      try {
        const extractedProfile = jobSearchService.extractUserProfile(parsedText);
        console.log('📋 Extracted user profile from resume:', extractedProfile);
        setJobProfile(extractedProfile);
        setHasUploadedResume(true);
      } catch (profileError) {
        console.warn('⚠️ Could not extract profile from resume:', profileError);
      }
      
      // Hide processing indicator and show success celebration
      // Hide handoff animation and show success
      if (handoffInterval) {
        clearInterval(handoffInterval);
        setHandoffInterval(null);
      }
      setShowHandoffAnimation(false);
      setCelebrationData({
        title: "Resume Analysis Complete!",
        message: "Your resume has been successfully analyzed. Would you like me to find relevant job opportunities for you?"
      });
      setShowSuccessCelebration(true);
      
      // Automatically suggest job search after resume analysis
      setTimeout(() => {
        const jobSuggestionMessage = speechMode 
          ? `🎯 Excellent! I've successfully analyzed your resume and extracted your professional profile. I now understand your background as a ${jobProfile?.jobTitle || 'professional'} with ${jobProfile?.experience || 'valuable experience'} in your field. Your resume is now ready and I can use it to find personalized job opportunities. You can now ask me to search for jobs by saying something like "Find me jobs" or "Search for positions in my field", and I'll use your resume information to find the best matches!`
          : `🎯 Perfect! I've analyzed your resume and extracted your profile. Would you like me to find job opportunities that match your background in ${jobProfile?.jobTitle || 'your field'}? Just type "find jobs" or click the job search button to get started!`;
          
        setMessages((prev: Message[]) => [...prev, { 
          role: 'assistant', 
          content: jobSuggestionMessage
        }]);
        
        // In voice mode, speak the message
        if (speechMode) {
          ttsService.speak(jobSuggestionMessage);
          setIsTTSSpeaking(true);
        }
      }, 2000);
      
    } catch (err) {
      if (handoffInterval) {
        clearInterval(handoffInterval);
        setHandoffInterval(null);
      }
      setShowHandoffAnimation(false);
      const errorMessage = 'Error processing file: ' + (err as Error).message;
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: errorMessage }]);
      
      // In voice mode, speak the error message
      if (speechMode) {
        const voiceErrorMessage = `I encountered an issue processing your resume: ${(err as Error).message}. Please try uploading the file again or use a different format like PDF.`;
        ttsService.speak(voiceErrorMessage);
        setIsTTSSpeaking(true);
      }
    } finally {
      setLoading(false);
      setPartialReply('');
      setUploadStatus(null);
      if (handoffInterval) {
        clearInterval(handoffInterval);
        setHandoffInterval(null);
      }
      setShowHandoffAnimation(false); // Ensure handoff animation is hidden
    }
  };

  // Job search functionality using Perplexity API
  const handleJobSearch = async (query?: string) => {
    if (!userProfile && !query) {
      // If no profile exists, try to extract from recent messages
      const recentMessages = messages.slice(-5);
      const resumeContent = recentMessages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');
      
      if (resumeContent) {
        const profile = jobSearchService.extractUserProfile(resumeContent);
        setJobProfile(profile);
      }
    }

    if (!jobProfile && !query && !hasUploadedResume) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I need to know more about your background to search for relevant jobs. Please share your resume or tell me about your skills and experience!' 
      }]);
      return;
    }

    setIsSearchingJobs(true);
    setShowJobResults(false);
    
    // Show premium processing indicator for job search
    setProcessingMessage("🔍 Searching for the perfect job opportunities...");
    setShowProcessingIndicator(true);

    try {
      const results = await jobSearchService.searchJobs(
        jobProfile || {
          skills: [],
          experience: 'Mid-level',
          location: 'Remote',
          jobTitle: 'Developer',
          preferences: { remote: true }
        },
        query
      );

      setJobResults(results);
      setShowJobResults(true);

      // Add a message about the search results
      const resultCount = results.length;
      const message = resultCount > 0 
        ? `🎯 I found ${resultCount} job opportunities that match your profile! Here are the results:`
        : `I couldn't find any jobs matching your criteria right now. Try broadening your search or check back later for new opportunities.`;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: message,
        meta: { structured: false }
      }]);

      // Show success celebration for job results
      if (resultCount > 0) {
        setCelebrationData({
          title: `${resultCount} Jobs Found! 🚀`,
          message: `Great news! I discovered ${resultCount} opportunities that align perfectly with your skills and experience.`
        });
        setShowSuccessCelebration(true);
      }

    } catch (error) {
      console.error('Job search error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, I encountered an error while searching for jobs: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.` 
      }]);
    } finally {
      setIsSearchingJobs(false);
      setShowProcessingIndicator(false);
    }
  };

  // Enhanced message processing with webSearchService integration
  const processMessage = async (messageToSend: string, detectedLanguage?: string): Promise<string> => {
    const lowerMessage = messageToSend.toLowerCase();
    
    // Detect job search intent
    const activeSearchKeywords = [
      'find me', 'find jobs', 'search for jobs', 'looking for a job', 
      'i need a job', 'help me find', 'get me a job', 'i want to apply'
    ];
    
    const curiousKeywords = [
      'what jobs', 'tell me about', 'how much do', 'what\'s the salary',
      'job market', 'available positions', 'opportunities in'
    ];
    
    const hasActiveIntent = activeSearchKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasCuriousIntent = curiousKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Update intent state - but preserve existing intent if user is just responding
    if (hasActiveIntent) {
      setJobSearchIntent('actively_searching');
    } else if (hasCuriousIntent && jobSearchIntent === 'none') {
      // Only set curious if no intent exists yet
      setJobSearchIntent('curious');
    }
    // Don't reset intent to 'none' - let it persist across the conversation
    
    // Check conversation history (last 5 messages) for job search details
    const recentConversation = messages.slice(-5).map(m => m.content).join(' ').toLowerCase();
    const fullContext = (recentConversation + ' ' + lowerMessage).toLowerCase();
    
    // Enhanced pattern matching for job details across conversation
    // Much more comprehensive role detection including multi-word titles and variations
    const hasRole = /\b(full[\s-]?stack|software|engineer|developer|dev|manager|designer|analyst|scientist|consultant|accountant|nurse|teacher|programmer|architect|director|coordinator|specialist|administrator|technician|associate|front[\s-]?end|back[\s-]?end|web|mobile|data|machine learning|ml|ai|devops|qa|tester|product|project|scrum|agile|ux|ui|graphic|marketing|sales|customer|support|recruiter|hr|finance|accounting|legal|writer|content|seo|digital|social media|executive|ceo|cto|cfo|vp|vice president)\b/i.test(fullContext);
    const hasLocation = /\b(in|at|near|remote|hybrid|onsite)\s*[A-Z]?[a-z]+/i.test(messageToSend + ' ' + recentConversation) || 
                       /\b(remote|hybrid|onsite|anywhere|flexible)\b/i.test(fullContext);
    const hasSalary = /\$?\d{2,3}k|\$\d{3,6}|salary|pay|compensation/i.test(fullContext);
    const hasExperience = /\b(\d+[\+]?\s*years?|junior|senior|mid[\s-]?level|entry[\s-]?level|experienced)\b/i.test(fullContext);
    
    // Determine if we have enough information
    const hasMinimumInfo = hasRole && hasLocation; // Role + Location is minimum
    const hasGoodInfo = hasRole && hasLocation && (hasSalary || hasExperience); // Better with salary/experience
    
    // Automatic search triggers:
    // 1. Active intent + minimum info gathered
    // 2. User confirms with "yes", "sure", "go ahead", "do it", etc.
    // 3. User provides additional details after initial intent AND we have minimum info
    const confirmationKeywords = /\b(yes|yeah|sure|okay|ok|go ahead|do it|sounds good|let's do it|please|absolutely)\b/i.test(lowerMessage);
    const providedMoreDetails = (jobSearchIntent === 'actively_searching' || jobSearchIntent === 'curious') && 
                                (hasRole || hasLocation || hasSalary || hasExperience);
    
    const shouldTriggerSearch = (hasActiveIntent && hasMinimumInfo) || // Immediate search if user asks with details
                                (confirmationKeywords && jobSearchIntent === 'actively_searching' && hasMinimumInfo) || // User confirms AND we have info
                                (providedMoreDetails && hasMinimumInfo); // User provided details AND we have minimum info now
    
    console.log('🔍 Message:', messageToSend);
    console.log('🔍 Job search intent:', jobSearchIntent);
    console.log('🔍 Has role?', hasRole, '| Has location?', hasLocation);
    console.log('🔍 Has salary?', hasSalary, '| Has experience?', hasExperience);
    console.log('🔍 Has minimum info?', hasMinimumInfo, '| Has good info?', hasGoodInfo);
    console.log('🔍 Confirmation?', confirmationKeywords, '| Provided details?', providedMoreDetails);
    console.log('🔍 Should trigger search?', shouldTriggerSearch);

    if (shouldTriggerSearch) {
      // Combine job search prompt with user message if in mode
      const searchQuery = jobSearchMode ? `${jobSearchPrompt}${messageToSend}` : messageToSend;
      
      // Reset job search mode after use
      if (jobSearchMode) {
        setJobSearchMode(false);
        setJobSearchPrompt('');
      }
      
      // Show "I'm searching..." message immediately
      const searchingMessage = `Perfect! I'm searching for ${hasRole ? 'the best' : ''} opportunities for you right now... 🔍`;
      setMessages((prev: Message[]) => [...prev, { 
        role: 'assistant', 
        content: searchingMessage
      }]);
      
      try {
        // Show job search animation
        setIsSearchingJobs(true);
        
        // Safety timeout to ensure animation doesn't get stuck
        const timeoutId = setTimeout(() => {
          setIsSearchingJobs(false);
        }, 15000); // 15 second timeout
        
        // Use webSearchService for real-time job search
        console.log('🔍 Starting job search with webSearchService for query:', searchQuery);
        console.log('👤 Using job profile:', jobProfile);
        const jobResults = await webSearchService.searchJobs(searchQuery, jobProfile || undefined);
        
        // Clear timeout since search completed
        clearTimeout(timeoutId);
        setIsSearchingJobs(false);
        
        if (jobResults && jobResults.length > 0) {
          console.log('✅ Found', jobResults.length, 'job results');
          console.log('🔧 DEBUG: Setting job results and show flag', jobResults);
          // Set job results for display
          setJobResults(jobResults);
          setShowJobResults(true); // Enable job results display
          console.log('🔧 DEBUG: Job results state should now be visible');
          
          // Create enhanced AI response with job details - more conversational
          const isAutoTriggered = !hasActiveIntent; // Auto-triggered if user didn't explicitly ask
          const responseText = isAutoTriggered 
            ? `Excellent! I found ${jobResults.length} outstanding ${hasRole ? 'opportunities' : 'job openings'} that match what you're looking for! 🎯\n\nTop match: **${jobResults[0].title}** at **${jobResults[0].company}**${jobResults[0].salary ? ` • Salary: ${jobResults[0].salary}` : ''}\n\nScroll up to see all ${jobResults.length} opportunities in the job carousel!`
            : `Great news! I found ${jobResults.length} relevant job opportunities for you! 🚀\n\nTop match: **${jobResults[0].title}** at **${jobResults[0].company}**${jobResults[0].salary ? ` • Salary: ${jobResults[0].salary}` : ''}\n\nCheck out all ${jobResults.length} positions in the job carousel above!`;
          
          // Replace the "searching" message with results
          setMessages((prev: Message[]) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: responseText
            };
            return updated;
          });
          
          // Reset intent after successful search
          setJobSearchIntent('none');
          
          // Return empty string since we already added the message
          return '';
        } else {
          console.log('⚠️ No job results found, falling back to regular job search');
          setIsSearchingJobs(false);
          // Fallback to regular job search if no results found
          await handleJobSearch(searchQuery);
          return '';
        }
      } catch (error) {
        console.error('❌ WebSearchService failed:', error);
        setIsSearchingJobs(false);
        
        // Provide user-friendly error message - emphasize the working backup system
        let errorMessage = '🔍 Searching for jobs using your resume profile! This personalized search analyzes your background for the best matches.';
        
        if (error instanceof Error) {
          console.log('🔍 Error details for user-friendly message:', error.message);
          if (error.message.includes('temporarily disabled')) {
            errorMessage = '🎯 Using our personalized job search with your resume profile. This method provides targeted results based on your specific background!';
          } else if (error.message.includes('API key')) {
            errorMessage = '🔍 Searching with your resume profile for personalized job matches.';
          } else if (error.message.includes('JSON') || error.message.includes('Unexpected token') || error.message.includes('PK')) {
            errorMessage = '🎯 Using reliable job search with your extracted resume data.';
          } else if (error.message.includes('400') || error.message.includes('401')) {
            errorMessage = '🔍 Switching to personalized job search using your resume profile.';
          }
        }
        
        console.log('📝 Showing user-friendly error message:', errorMessage);
        
        // Replace the "searching" message with error message
        setMessages((prev: Message[]) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: errorMessage
          };
          return updated;
        });
        
        // Still attempt fallback to regular job search
        try {
          await handleJobSearch(searchQuery);
        } catch (fallbackError) {
          console.error('❌ Fallback job search also failed:', fallbackError);
        }
        
        return '';
      }
    } else {
      // Regular AI conversation - build context from previous messages
      const context = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Add resume context if available
      let contextualPrompt = messageToSend;
      if (hasUploadedResume && jobProfile) {
        const profileContext = `\n\nCONTEXT: The user has uploaded their resume. Their background includes:
- Skills: ${jobProfile.skills?.join(', ') || 'Not specified'}
- Experience Level: ${jobProfile.experience || 'Not specified'}
- Job Title: ${jobProfile.jobTitle || 'Not specified'}
- Location Preference: ${jobProfile.location || 'Not specified'}

Use this information to provide personalized career advice and job recommendations.`;
        contextualPrompt = messageToSend + profileContext;
      }
      
      const fullPrompt = context ? `${context}\nuser: ${contextualPrompt}` : contextualPrompt;
      
      // Use the detected language passed from sendMessage, or fall back to current language state
      const langToUse = detectedLanguage || language;
      
      console.log('🔤 Using language for AI response:', langToUse);
      
      const userName = user?.displayName?.split(' ')[0];
      const response = await askOpenAIAgent(fullPrompt, setPartialReply, langToUse, userName);
      
      // Return the response instead of adding to messages
      // The sendMessage function will add it after the delay
      return response;
    }
    
    return ''; // Fallback return
  };

  return (
    <div className="app-container">
      {/* Onboarding Flow for New Users */}
      {showOnboarding && (
        <Onboarding 
          onComplete={() => setShowOnboarding(false)}
          userName={userProfile?.displayName || user?.displayName || undefined}
        />
      )}

      {/* Startup Animation */}
      {showStartupAnimation && (
        <StartupAnimation 
          onComplete={() => setShowStartupAnimation(false)} 
        />
      )}
      
      {/* Language Suggestion Modal */}
      {showLanguageSuggestion && (
        <LanguageSuggestion onClose={() => setShowLanguageSuggestion(false)} />
      )}
      
      {previewFile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Preview: {previewFile.name}</h3>
            {previewFile.type.startsWith('image/') ? <img src={previewFile.url} alt="preview" /> : <iframe src={previewFile.url} title="preview" />}
            <div className="modal-actions">
              <button onClick={() => setPreviewFile(null)}>Cancel</button>
              <button onClick={processPreviewFile}>Confirm & Upload</button>
            </div>
          </div>
        </div>
      )}

  <ParticleBackground isSpeaking={isSpeaking} />
      <main className="main-content">

        {/* Chat History Button (only show when user is logged in) */}
        {user && (
          <button 
            className="chat-history-btn"
            onClick={() => setShowChatHistory(true)}
            title="Chat History"
          >
            ☰
          </button>
        )}

        <header className="app-header">
          <h1>Everon</h1>
          <h2>
            {user ? (
              <>Welcome back, {user.displayName?.split(' ')[0] || 'there'}! 👋</>
            ) : (
              <>Your AI Career Coach</>
            )}
          </h2>
          <p>
            {user ? (
              <>I'm here to help you achieve your career goals!</>
            ) : (
              <>Ask Everon about your career questions!</>
            )}
          </p>
          
          {/* Authentication UI */}
          <div className="auth-controls">
            {user ? (
              <UserMenu 
                user={user} 
                onLogout={handleLogout}
                onLanguageSettings={() => setShowLanguageSettings(true)}
                onShowOnboarding={() => setShowOnboarding(true)}
              />
            ) : (
              <button 
                className="auth-btn"
                onClick={() => setShowAuthModal(true)}
              >
                Log In
              </button>
            )}
          </div>
        </header>

        <div className="chat-window">
          {uploadStatus && <div className="upload-status">{uploadStatus}</div>}
          
          {/* Handoff Animation during Resume Processing */}
          {showHandoffAnimation && (() => {
            const messages = [
              "Analyzing your experience...",
              "Identifying key skills...", 
              "Evaluating career achievements...",
              "Preparing personalized insights..."
            ];
            return (
              <HandoffAnimation
                title="Processing Your Resume"
                subtitle={messages[handoffStep] || messages[0]}
                size={180}
                onClose={() => setShowHandoffAnimation(false)}
              />
            );
          })()}
          
          {messages.map((msg: Message, idx: number) => (
            <ChatBubble
              key={idx}
              msg={msg}
              isLastMessage={idx === messages.length - 1}
              index={idx}
              isSpeaking={currentTTSMessageIndex === idx}
              onPlayTTS={(text: string) => handleTTSPlay(text, idx)}
              onPauseTTS={handleTTSPause}
              onResumeTTS={handleTTSResume}
              ttsEnabled={true}
              isTTSActive={currentTTSMessageIndex === idx && isTTSSpeaking}
              isTTSPaused={currentTTSMessageIndex === idx && isTTSPaused}
            />
          ))}
          
          {/* AI Thinking Animation */}
          {loading && !partialReply && (
            <ThinkingAnimation />
          )}
          
          {/* Job Search Results */}
          {showJobResults && jobResults.length > 0 && (
            <SwipeableJobCards jobs={jobResults} />
          )}
          
          {isSearchingJobs && (() => {
            const searchMessages = [
              "Analyzing job market trends...",
              "Finding opportunities that match your skills...", 
              "Searching across top job boards...",
              "Curating the best matches for you..."
            ];
            return (
              <JobSearchHandoffAnimation
                title="🔍 Finding Your Perfect Job"
                subtitle={searchMessages[handoffStep] || searchMessages[0]}
                size={180}
                onClose={() => setIsSearchingJobs(false)}
              />
            );
          })()}
          
          {/* LiveKit Voice Status */}
          {livekit.isActive && (
            <div className="voice-status-indicator">
              <div className="voice-status-animation">🎤</div>
              <p>
                {livekit.isListening ? 'Listening with LiveKit...' : 
                 livekit.isSpeaking ? 'Speaking...' : 'Voice session active'}
              </p>
              <button 
                className="stop-voice-btn"
                onClick={() => livekit.stopVoiceSession()}
                title="Stop voice session"
              >
                Stop
              </button>
            </div>
          )}
          
          {/* LiveKit Error Display */}
          {livekit.error && (
            <div className="livekit-error">
              <p>Voice Error: {livekit.error}</p>
              <button onClick={() => window.location.reload()}>
                Refresh to retry
              </button>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        <form className="input-bar" onSubmit={(e: React.FormEvent) => { e.preventDefault(); sendMessage(); }}>
          {/* Dropdown Menu for Tools */}
          <div className="dropdown-container" ref={dropdownRef}>
            <button 
              type="button" 
              className={`icon-btn dropdown-toggle ${showDropdown ? 'active' : ''}`}
              onClick={() => setShowDropdown(!showDropdown)}
              title="Tools & Actions"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            
            {showDropdown && (
              <div className="dropdown-menu">
                <button 
                  type="button" 
                  className="dropdown-item" 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowDropdown(false);
                  }}
                  title="Upload files"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 1 1-8.49-8.49l9.19-9.19a4.5 4.5 0 0 1 6.36 6.36l-9.2 9.2a2.5 2.5 0 1 1-3.54-3.54l8.49-8.49" />
                  </svg>
                  <span>Upload File</span>
                </button>
                
                <button 
                  type="button" 
                  className={`dropdown-item ${jobSearchMode ? 'active' : ''}`}
                  onClick={handleJobSearchMode}
                  title={jobSearchMode ? "Turn off job search mode" : "Turn on job search mode"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{jobSearchMode ? '🎯 Job Mode ON' : 'Find Jobs'}</span>
                </button>
                
                <button 
                  type="button" 
                  className="dropdown-item"
                  onClick={() => {
                    setShowLanguageSuggestion(true);
                    setShowDropdown(false);
                  }}
                  title="Learn about language support"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                  <span>🌍 Languages</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Voice Mode Toggle Button */}
          <button
            type="button"
            title={speechMode ? "Exit Speech Mode" : "Enter Speech Mode"}
            className={`icon-btn mic-btn ${speechMode ? 'voice-mode' : ''}`}
            disabled={loading}
            onClick={async () => {
              if (speechMode) {
                console.log('Exiting speech mode');
                setSpeechMode(false);
                await livekit.stopVoiceSession();
              } else {
                console.log('Entering speech mode');
                
                // Stop any ongoing TTS from chat messages
                ttsService.stop();
                setIsTTSSpeaking(false);
                setCurrentTTSMessageIndex(null);
                
                setSpeechMode(true);
                
                // Reset conversation tracking for fresh voice session
                setAskedTopics(new Set());
                setConversationPhase('greeting');
                
                // Show celebration for first-time speech mode users
                if (!hasUsedSpeechMode) {
                  setCelebrationData({
                    title: "Welcome to Voice Mode!",
                    message: "You're now ready to have natural conversations with Everon. Just speak and I'll respond!"
                  });
                  setShowSuccessCelebration(true);
                  setHasUsedSpeechMode(true);
                }
                
                await livekit.startVoiceSession();
                console.log('🔍 Voice session started, checking state:', {
                  isActive: livekit.isActive,
                  session: livekit.session,
                  error: livekit.error
                });
                
                // Manual mode: User must click Start Listening
                setCurrentTranscript('Click Start Listening to begin');
                console.log('🎤 Voice session ready - manual mode enabled');
              }
            }}
          >
            {speechMode ? (
              <VoiceSpectrum />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
              </svg>
            )}
          </button>
          
          {/* Text Input */}
          <input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder={jobSearchMode ? "🎯 Job search mode: Describe what you're looking for..." : "Ask Everon..."}
            disabled={loading}
            autoFocus
          />
          
          {/* Send Button */}
          <button type="submit" className="icon-btn send-btn" disabled={loading || !input.trim()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
          
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} />
        </form>
      </main>

      {/* Speech Mode Overlay */}
      {speechMode && (
        <SpeechModeUI
          isListening={livekit.isListening}
          isSpeaking={livekit.isSpeaking}
          transcript={currentTranscript}
          error={livekit.error}
          isProcessing={isProcessingSpeech}
          isTTSSpeaking={isTTSSpeaking}
          recentMessages={messages}
          language={language}
          onToggleListening={async () => {
            try {
              if (livekit.isListening) {
                // Clear timeout and stop listening
                if (listeningTimeout) {
                  clearTimeout(listeningTimeout);
                  setListeningTimeout(null);
                }
                await livekit.stopListening();
                console.log('🎤 Stopped listening');
              } else {
                console.log('🎤 Attempting to start listening...');
                await livekit.startListening();
                console.log('🎤 Started listening - manual mode');
                
                // Set a timeout to auto-stop listening after 30 seconds
                const timeout = setTimeout(async () => {
                  console.log('⏰ Auto-stopping listening after 30 seconds');
                  await livekit.stopListening();
                  setListeningTimeout(null);
                }, 30000);
                setListeningTimeout(timeout as unknown as number);
              }
            } catch (error) {
              console.error('🎤 Voice listening error:', error);
              
              // Show user-friendly error message
              const errorMessage = error instanceof Error ? error.message : 'Voice recognition failed';
              
              // Check if it's a permission error
              if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
                alert('🎤 Microphone Permission Required\n\nPlease:\n1. Enable microphone access in your browser\n2. Tap the microphone button again\n3. Allow permission when prompted\n\nOn mobile: Check your browser settings if needed.');
              } else {
                alert(`Voice recognition error: ${errorMessage}`);
              }
            }
          }}
          onEndSpeechMode={async () => {
            setSpeechMode(false);
            await livekit.stopListening(); // Stop LiveKit listening
            await livekit.stopVoiceSession();
            setCurrentTranscript('');
            setIsProcessingSpeech(false);
            // Stop any ongoing TTS
            ttsService.stop();
            setIsTTSSpeaking(false);
          }}
        />
      )}

      {/* Premium Processing Indicator */}
      {showProcessingIndicator && (
        <PremiumProcessingIndicator message={processingMessage} />
      )}

      {/* Success Celebration Modal */}
      <SuccessCelebration
        isVisible={showSuccessCelebration}
        onComplete={() => setShowSuccessCelebration(false)}
        title={celebrationData.title}
        message={celebrationData.message}
      />

      {/* TTS Speaking Indicator (only show when not in speech mode) */}
      {isTTSSpeaking && !speechMode && (
        <div className="tts-speaking-indicator">
          <span className="tts-icon">🗣️</span>
          <span>Everon is speaking...</span>
        </div>
      )}
      
      {/* PWA Install Prompt */}
      <InstallPrompt />
      
      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={() => {
            setShowAuthModal(false);
          }}
        />
      )}

      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        user={user}
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        onLoadSession={handleLoadSession}
        onNewChat={handleNewChat}
        currentSessionId={currentSessionId}
      />

      {/* Language Settings Modal */}
      {showLanguageSettings && user && (
        <LanguageSettings
          user={user}
          currentLanguage={userProfile?.preferences?.language || language}
          onClose={() => setShowLanguageSettings(false)}
          onLanguageChange={(newLang) => {
            setLanguage(newLang as any);
            console.log(`🌍 Language preference updated to: ${newLang}`);
          }}
        />
      )}
    </div>
  );
}

export default App;