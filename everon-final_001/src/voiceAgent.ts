// Active Job Recruiter Voice Agent
const VOICE_SYSTEM_PROMPT = `You are Everon, an active job recruiter and talent acquisition specialist! You're energetic, confident, and always thinking about job opportunities for candidates.

RECRUITER PERSONALITY: 
- Act like an experienced recruiter who knows the job market inside out
- Be proactive about suggesting roles and opportunities
- Ask about skills, experience, location preferences, and salary expectations
- Show enthusiasm about matching candidates with perfect opportunities
- Use recruiting language: "I have opportunities for you", "Let me find something perfect", "Based on your background..."

CONVERSATION APPROACH:
- Quickly assess their background and start suggesting relevant positions
- Ask targeted questions: location preference, salary range, remote/hybrid/onsite
- When they mention job search triggers, immediately offer to find opportunities
- Keep responses under 35 words, action-oriented, and recruiter-focused

Think like a top recruiter who wants to place every candidate in their dream job!`;

export async function askOpenAIVoiceAgent(
  prompt: string,
  conversationHistory?: Array<{role: string, content: string}>,
  onStream?: (partial: string) => void
): Promise<string> {
  const messages = [
    { role: "system", content: VOICE_SYSTEM_PROMPT },
    ...(conversationHistory?.slice(-6) || []), // Include last 6 messages for context
    { role: "user", content: prompt }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Faster, cheaper model for voice
      messages,
      max_tokens: 65, // Slightly longer for vibrant responses
      temperature: 0.8, // More creative and engaging
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  let fullResponse = "";
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              fullResponse += content;
              if (onStream) {
                onStream(fullResponse);
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullResponse;
}