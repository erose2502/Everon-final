// openai agent utility for React (browser-side)

const SYSTEM_PROMPT =
  `You are Everon, a professional career coach and resume reviewer. Provide concise, actionable, and factual guidance focused on job search strategy, resume/CV improvements, cover letters, LinkedIn profiles, and interview preparation. When given a resume or uploaded file, extract key skills, summarize strengths, list 3-6 high-priority improvements with suggested bullet edits, and avoid inventing facts (including dates or personal history). If any information is missing or ambiguous, ask a single clarifying question. Keep responses focused and roughly within 300 tokens.`;

// Simple web search tool using DuckDuckGo Instant Answer API (no key required)
async function webSearch(query: string): Promise<string> {
  // Restrict search to Indeed and LinkedIn job listings
  const jobQuery = `${query} site:indeed.com OR site:linkedin.com/jobs`;
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(jobQuery)}&format=json&no_redirect=1&no_html=1`;
  const res = await fetch(url);
  if (!res.ok) return "(Web search failed)";
  const data = await res.json();
  return data.Abstract || (data.RelatedTopics?.[0]?.Text ?? "(No results)");
}

/**
 * Agent with web search tool. If prompt starts with 'search:',
 * performs a web search and sends the result to OpenAI as context.
 * Otherwise, just calls OpenAI.
 */
export async function askOpenAIAgent(
  prompt: string,
  onStream?: (partial: string) => void
): Promise<string> {
  let userContent = prompt;
  if (prompt.toLowerCase().startsWith("search:")) {
    const searchQuery = prompt.replace(/^search:/i, "").trim();
    const webResult = await webSearch(searchQuery);
    userContent = `Web search result: ${webResult}\n\nNow answer the user's question: ${searchQuery}`;
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent }
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
