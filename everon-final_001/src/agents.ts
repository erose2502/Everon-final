// openai agent utility for React (browser-side)
import { getSystemPrompt } from './utils/languageUtils';

/**
 * Agent for OpenAI. Calls OpenAI directly with the user's prompt.
 */
export async function askOpenAIAgent(
  prompt: string,
  onStream?: (partial: string) => void,
  language: string = 'english',
  userName?: string
): Promise<string> {
  const messages = [
    { role: "system", content: getSystemPrompt(language, false, userName) },
    { role: "user", content: prompt }
  ];

  const response = await fetch("/api/chat-completion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      max_tokens: 60,
      stream: true
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  // Stream response handling with callback
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
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            result += content;
            if (onStream) onStream(result);
          }
        } catch {}
      }
    }
  }
  return result;
}
