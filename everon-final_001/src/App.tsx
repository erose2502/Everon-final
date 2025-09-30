import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Import the worker as a URL so the bundled worker matches the installed pdfjs-dist version (Vite-friendly)
// The `?url` suffix tells Vite to return the file URL instead of bundling its contents.
// the package provides .mjs worker files; import the existing file with .mjs extension so Vite can resolve it
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
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
import ChatBubble, { StreamingBubble } from './components/ChatBubble';
import VoiceSpectrum from './components/VoiceSpectrum';
import SwipeableJobCards from './components/SwipeableJobCards';
import SpeechModeUI from './components/SpeechModeUI';
import { SuccessCelebration, PremiumProcessingIndicator } from './components/PremiumAnimations';
import HandoffAnimation from './components/HandoffAnimation';
import { jobSearchService } from './utils/jobSearchService';
import type { JobSearchResult, UserProfile } from './types/job';
import { useLiveKitVoice } from './hooks/useLiveKitVoice';
import { ttsService } from './utils/openaiTtsService';
import { webSearchService } from './utils/webSearchService';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [listeningTimeout, setListeningTimeout] = useState<number | null>(null);
  const [ttsLock, setTTSLock] = useState(false); // Prevent TTS interruption
  const [showHandoffAnimation, setShowHandoffAnimation] = useState(false);
  const [handoffStep, setHandoffStep] = useState(0);
  const [handoffInterval, setHandoffInterval] = useState<number | null>(null);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [jobSearchMode, setJobSearchMode] = useState(false);
  const [jobSearchPrompt, setJobSearchPrompt] = useState('');
  
  // Language preference state
  const [language] = useState<'english' | 'french' | 'swahili' | 'arabic' | 'spanish' | 'auto'>('english');
    // For auto-detect, store last detected language
  const [detectedLang, setDetectedLang] = useState<string>('en-US');  // --- Phase 3: Job Search State ---
  // Removed unused jobSearchLoading state

  // LiveKit Voice Agent Configuration
  const livekitConfig = {
    wsUrl: import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://your-livekit-server.com',
    apiKey: import.meta.env.VITE_LIVEKIT_API_KEY || 'your-livekit-api-key',
    apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET || 'your-livekit-api-secret',
    roomName: 'everon-voice-chat'
  };

  // Smart listening with extended timeout for natural conversation flow
  const startContinuousListening = async () => {
    try {
      // Clear any existing timeout first
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
        setListeningTimeout(null);
      }

      // Ensure we're not already listening to prevent conflicts
      if (livekit.isListening) {
        console.log('🎤 Already listening, skipping start');
        return;
      }

      console.log('🎤 Starting simplified continuous listening');
      await livekit.startListening();
      console.log('✅ Continuous listening started successfully');

    } catch (error) {
      console.error('❌ Continuous listening error:', error);
    }
  };

  // Stop smart listening and clear timeout
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

  // LiveKit Voice Agent Hook - with speech recognition callback
  const livekit = useLiveKitVoice(livekitConfig, async (transcript: string) => {
    console.log('LiveKit speech recognized:', transcript);
    
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
      
      // Check for job-related keywords
      const jobKeywords = /\b(job|work|position|role|career|hire|employ|salary|company|interview|resume|cv|developer|engineer|manager|analyst)\b/;
      const searchKeywords = /\b(search|find|look|seeking|available|openings|opportunities|market|trending|help me find|show me|get me)\b/;
      
      // Check both current input and recent conversation
      const isJobRelated = jobKeywords.test(currentInput) || jobKeywords.test(conversationContext);
      const needsWebSearch = searchKeywords.test(currentInput);
      
      // Also auto-search if user has been discussing job details and now asks for help
      const hasJobContext = conversationContext.includes('role') || conversationContext.includes('position') || conversationContext.includes('job');
      const askingForHelp = /\b(help|assist|recommend|suggest|advice|what should|can you|please)\b/.test(currentInput);
      
      // Automatically activate job search if conditions are met
      const shouldAutoSearch = (isJobRelated && needsWebSearch) || (hasJobContext && askingForHelp);
      
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
            
            // Always focus on jobs - this is a career coach
            if (transcript.toLowerCase().includes('trend') || transcript.toLowerCase().includes('market')) {
              const trends = await webSearchService.getJobMarketTrends();
              searchResults = `Top 2 trending roles: ${trends.slice(0, 2).map(t => t.title).join(', ')}. `;
            } else {
              const jobs = await webSearchService.searchJobs(transcript, userProfile || undefined);
              searchResults = `Found ${jobs.length} jobs. Top match: ${jobs[0]?.title} at ${jobs[0]?.company}${jobs[0]?.salary ? ` - ${jobs[0]?.salary}` : ''}. `;
            }
          } catch (error) {
            console.error('Web search failed:', error);
            searchResults = `Let me help you find jobs. `;
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
        response = await askOpenAIAgent(enhancedPrompt);
        
        // Deactivate tools after processing (single-use behavior)
        setTimeout(() => {
          setActiveTools([]);
          console.log('🔄 Tools deactivated after use');
        }, 500); // Small delay to show the activation briefly
      } else {
        // Use optimized voice agent with smart information tracking
        const allMessages = messages.slice(-6); // Last 6 messages for context
        const conversationText = allMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n') + `\nuser: ${transcript}`;
        
        // Extract information from entire conversation
        const hasRole = /(?:looking for|want|seeking|interested in|as a|position|job|role).*?(developer|engineer|manager|analyst|designer|data scientist|product manager|marketing|sales|consultant|specialist|coordinator)/i.test(conversationText);
        const hasLocation = /(?:remote|hybrid|onsite|in |from |located|area|city|state|country|anywhere)/i.test(conversationText);
        const hasSalary = /(?:\$|salary|pay|compensation|income|k |000|budget|range).*?[\d,]+/i.test(conversationText);
        const hasExperience = /(?:year|experience|exp|junior|senior|mid-level|entry|level|\d+\s*years?)/i.test(conversationText);
        
        // Create enhanced prompt for voice agent
        const missingInfo = [];
        if (!hasRole) missingInfo.push('role');
        if (!hasLocation) missingInfo.push('location');
        if (!hasSalary) missingInfo.push('salary');
        if (!hasExperience) missingInfo.push('experience');
        
        const enhancedTranscript = missingInfo.length > 0 
          ? `User said: "${transcript}". Missing info: ${missingInfo.join(', ')}. Ask for ONE missing detail only.`
          : `User said: "${transcript}". You have all info needed. Provide job recommendations or next steps.`;
        
        response = await askOpenAIVoiceAgent(enhancedTranscript, allMessages);
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
            onStart: () => {
              console.log('🔒 TTS started speaking - protected from interruption');
            },
            onEnd: () => {
              console.log('🔓 TTS finished speaking - releasing lock and resuming listening');
              setIsTTSSpeaking(false);
              setTTSLock(false); // Release lock
              
              // Keep showing the AI response text instead of clearing it
              // This maintains conversation context
              
              // Automatically restart listening after TTS completes (hands-free experience)
              setTimeout(async () => {
                if (speechMode && !livekit.isListening) {
                  console.log('🎤 Auto-resuming continuous listening for hands-free conversation');
                  setCurrentTranscript('Listening...');
                  await startContinuousListening();
                }
              }, 1500); // Longer delay to let user finish their thoughts
            },
            onError: (error) => {
              console.error('TTS error:', error);
              setIsTTSSpeaking(false);
              setTTSLock(false); // Release lock on error
              // Still restart listening on TTS error
              setTimeout(async () => {
                if (speechMode && !livekit.isListening) {
                  await startContinuousListening();
                }
              }, 1500);
            }
          });
        } catch (ttsError) {
          console.error('TTS failed:', ttsError);
          setIsTTSSpeaking(false);
          setTTSLock(false); // Release lock on catch error
          // Restart listening even if TTS fails
          setTimeout(async () => {
            if (speechMode && !livekit.isListening) {
              await startContinuousListening();
            }
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Voice agent error:', error);
      // Restart listening on any error
      setTimeout(async () => {
        if (speechMode && !livekit.isListening) {
          await startContinuousListening();
        }
      }, 1000);
    } finally {
      setIsProcessingSpeech(false);
      // Don't clear the transcript - keep showing conversation context
      // The transcript will be updated when the next user speaks
    }
  });

  // Example resume text (replace with actual resume parsing later)

  // (Removed unused handleJobSearch function)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partialReply]);

  // Keep voiceModeRef in sync with voiceMode
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  // Cleanup listening timeout on component unmount
  useEffect(() => {
    return () => {
      if (listeningTimeout) {
        clearTimeout(listeningTimeout);
      }
      ttsService.stop();
    };
  }, [listeningTimeout]);

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

    setMessages((prev: Message[]) => [...prev, { role: 'user', content: messageToSend }]);
    setInput('');
    setLoading(true);
    setPartialReply('');

    // Compose language instruction, using detectedLang if auto
    let languageInstruction = '';
    let langForPrompt = language;
    if (language === 'auto') {
      if (detectedLang.startsWith('fr')) langForPrompt = 'french';
      else if (detectedLang.startsWith('sw')) langForPrompt = 'swahili';
      else if (detectedLang.startsWith('ar')) langForPrompt = 'arabic';
      else if (detectedLang.startsWith('es')) langForPrompt = 'spanish';
      else langForPrompt = 'english';
    }
    switch (langForPrompt) {
      case 'french':
        languageInstruction = 'Please respond in French.';
        break;
      case 'swahili':
        languageInstruction = 'Please respond in Swahili.';
        break;
      case 'arabic':
        languageInstruction = 'Please respond in Arabic.';
        break;
      case 'spanish':
        languageInstruction = 'Please respond in Spanish.';
        break;
      default:
        languageInstruction = 'Please respond in English.';
    }

    try {
      // Use the enhanced message processing
      await processMessage(languageInstruction + '\n' + messageToSend);
      
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
    if (file) setPreviewFile({ name: file.name, type: file.type, url: URL.createObjectURL(file) });
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
    setHandoffInterval(interval);
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
        setUserProfile(extractedProfile);
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
        setMessages((prev: Message[]) => [...prev, { 
          role: 'assistant', 
          content: `🎯 Perfect! I've analyzed your resume and extracted your profile. Would you like me to find job opportunities that match your background in ${userProfile?.jobTitle || 'your field'}? Just type "find jobs" or click the job search button to get started!`
        }]);
      }, 2000);
      
    } catch (err) {
      if (handoffInterval) {
        clearInterval(handoffInterval);
        setHandoffInterval(null);
      }
      setShowHandoffAnimation(false);
      setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: 'Error processing file: ' + (err as Error).message }]);
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
        setUserProfile(profile);
      }
    }

    if (!userProfile && !query && !hasUploadedResume) {
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
        userProfile || {
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
  const processMessage = async (messageToSend: string) => {
    // Check if we're in job search mode or if this is a job search request
    let isJobSearchRequest = jobSearchMode;
    
    if (!jobSearchMode) {
      // Auto-detect job search queries with SPECIFIC action keywords only
      const jobSearchKeywords = [
        'find jobs', 
        'search jobs', 
        'job search', 
        'find work', 
        'job opportunities', 
        'career opportunities', 
        'job openings',
        'look for jobs',
        'help me find',
        'search for positions'
      ];
      isJobSearchRequest = jobSearchKeywords.some(keyword => 
        messageToSend.toLowerCase().includes(keyword)
      );
    }

    console.log('🔍 Message:', messageToSend);
    console.log('🔍 Job search mode active?', jobSearchMode);
    console.log('🔍 Is job search request?', isJobSearchRequest);

    if (isJobSearchRequest) {
      // Combine job search prompt with user message if in mode
      const searchQuery = jobSearchMode ? `${jobSearchPrompt}${messageToSend}` : messageToSend;
      
      // Reset job search mode after use
      if (jobSearchMode) {
        setJobSearchMode(false);
        setJobSearchPrompt('');
      }
      try {
        // Use webSearchService for real-time job search
        console.log('🔍 Starting job search with webSearchService for query:', searchQuery);
        console.log('👤 Using user profile:', userProfile);
        const jobResults = await webSearchService.searchJobs(searchQuery, userProfile || undefined);
        
        if (jobResults && jobResults.length > 0) {
          console.log('✅ Found', jobResults.length, 'job results');
          console.log('🔧 DEBUG: Setting job results and show flag', jobResults);
          // Set job results for display
          setJobResults(jobResults);
          setShowJobResults(true); // Enable job results display
          console.log('🔧 DEBUG: Job results state should now be visible');
          
          // Create enhanced AI response with job details
          const responseText = `I found ${jobResults.length} relevant job opportunities for you! The top match is "${jobResults[0].title}" at ${jobResults[0].company}${jobResults[0].salary ? ` with salary ${jobResults[0].salary}` : ''}. Check out all the opportunities above!`;
          
          // Add AI response to chat
          setMessages((prev: Message[]) => [...prev, { 
            role: 'assistant', 
            content: responseText
          }]);
        } else {
          console.log('⚠️ No job results found, falling back to regular job search');
          // Fallback to regular job search if no results found
          await handleJobSearch(searchQuery);
        }
      } catch (error) {
        console.error('❌ WebSearchService failed:', error);
        
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
        setMessages((prev: Message[]) => [...prev, { 
          role: 'assistant', 
          content: errorMessage
        }]);
        
        // Still attempt fallback to regular job search
        try {
          await handleJobSearch(searchQuery);
        } catch (fallbackError) {
          console.error('❌ Fallback job search also failed:', fallbackError);
        }
      }
    } else {
      // Regular AI conversation - build context from previous messages
      const context = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Add resume context if available
      let contextualPrompt = messageToSend;
      if (hasUploadedResume && userProfile) {
        const profileContext = `\n\nCONTEXT: The user has uploaded their resume. Their background includes:
- Skills: ${userProfile.skills?.join(', ') || 'Not specified'}
- Experience Level: ${userProfile.experience || 'Not specified'}
- Job Title: ${userProfile.jobTitle || 'Not specified'}
- Location Preference: ${userProfile.location || 'Not specified'}

Use this information to provide personalized career advice and job recommendations.`;
        contextualPrompt = messageToSend + profileContext;
      }
      
      const fullPrompt = context ? `${context}\nuser: ${contextualPrompt}` : contextualPrompt;
      
      const response = await askOpenAIAgent(fullPrompt, setPartialReply);
      
      setMessages((prev: Message[]) => [...prev, { 
        role: 'assistant', 
        content: response 
      }]);
    }
  };

  return (
    <div className="app-container">
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

        <header className="app-header">
          <h1>Everon</h1>
          <h2>Your AI Career Coach</h2>
          <p>Ask Everon about your career questions!</p>
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
          {loading && partialReply && !voiceMode && messages[messages.length - 1]?.role !== 'assistant' && <StreamingBubble partialReply={partialReply} />}
          
          {/* Job Search Results */}
          {showJobResults && jobResults.length > 0 && (
            <SwipeableJobCards jobs={jobResults} />
          )}
          
          {isSearchingJobs && (
            <div className="searching-indicator">
              <div className="job-search-lottie">
                <DotLottieReact
                  src="https://lottie.host/946421bb-a3a6-48a9-9399-99c3d1605696/6UhC6bKIEk.lottie"
                  loop
                  autoplay
                />
              </div>
              <p>Searching for job opportunities...</p>
            </div>
          )}
          
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
                
                // Auto-start listening after session is ready
                setTimeout(async () => {
                  console.log('🎤 Starting auto-listen (simple approach)');
                  setCurrentTranscript('Click Start Listening to begin');
                  await startContinuousListening();
                }, 2000); // Longer delay for full initialization
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
          onFileUpload={() => {
            // Trigger file upload while keeping speech mode active
            fileInputRef.current?.click();
          }}
          onWebSearch={() => {
            // Add message suggesting web search via voice
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: 'You can ask me to search the web by saying something like "Search for remote software developer jobs" or "Find the latest AI trends".' 
            }]);
          }}
          onActiveToolsChange={(tools) => {
            setActiveTools(tools);
            console.log('Active tools updated:', tools);
          }}
          onToggleListening={async () => {
            if (livekit.isListening) {
              // Clear timeout and stop listening
              if (listeningTimeout) {
                clearTimeout(listeningTimeout);
                setListeningTimeout(null);
              }
              await livekit.stopListening();
            } else {
              await startContinuousListening();
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
    </div>
  );
}

export default App;