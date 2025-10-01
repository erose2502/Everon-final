// Active Job Recruiter Voice Agent
import { getSystemPrompt } from './utils/languageUtils';

export async function askOpenAIVoiceAgent(
  prompt: string,
  conversationHistory?: Array<{role: string, content: string}>,
  onStream?: (partial: string) => void,
  language: string = 'english'
): Promise<string> {
  const messages = [
    { role: "system", content: getSystemPrompt(language, true) },
    ...(conversationHistory?.slice(-6) || []), // Include last 6 messages for context
    { role: "user", content: prompt }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_OPENAI_API_KEY : ''}`,
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