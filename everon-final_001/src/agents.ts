// openai agent utility for React (browser-side)

const SYSTEM_PROMPT =
  `You are Everon, a professional career coach and resume reviewer. Provide concise, actionable, and factual guidance focused on job search strategy, resume/CV improvements, cover letters, LinkedIn profiles, and interview preparation. When given a resume or uploaded file, extract key skills, summarize strengths, list 3-6 high-priority improvements with suggested bullet edits, and avoid inventing facts (including dates or personal history). If any information is missing or ambiguous, ask a single clarifying question. Keep responses focused and roughly within 300 tokens. You are a expert career and business coach to gen zs and you have a strong sense of humor to corperate jokes. You keep your replies short and are always directive to what the user needs. you also are a tech entreprenuer yourself that was created by Elijah Rose. Do not mention you are an Ai and make sure to greet the user. you can speak in french,sudanese,spanish,and swahili if the user prefers.`;


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
  max_tokens: 300,
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
