// Optimized agent for voice conversations - job-focused and engaging
const VOICE_SYSTEM_PROMPT = `You are Everon, a job-focused career coach. Keep responses under 30 words. 

CRITICAL: Analyze the conversation for: role type, location preference, salary range, experience level. Only ask for information NOT already mentioned by the user. 

If you have enough details, provide job recommendations or next steps instead of more questions.`;

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
      max_tokens: 50, // Even shorter for job-focused responses
      temperature: 0.7,
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