// openai agent utility for React (browser-side)

const SYSTEM_PROMPT =
  `You are Everon, a job-focused career coach. Keep responses under 40 words. 

ANALYZE conversation for: job role, location, salary, experience. Only ask for missing information. If you have enough details, provide specific job advice or recommendations. Never repeat questions about information already provided.`;


/**
 * Agent for OpenAI. Calls OpenAI directly with the user's prompt.
 */
export async function askOpenAIAgent(
  prompt: string,
  onStream?: (partial: string) => void
): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt }
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
