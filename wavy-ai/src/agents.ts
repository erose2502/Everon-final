// openai agent utility for React (browser-side)

// Simple web search tool using DuckDuckGo Instant Answer API (no key required)
async function webSearch(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
  const res = await fetch(url);
  if (!res.ok) return "(Web search failed)";
  const data = await res.json();
  // Prefer Abstract, fallback to related topics or nothing
  return data.Abstract || (data.RelatedTopics?.[0]?.Text ?? "(No results)");
}

/**
 * Agent with web search tool. If prompt starts with 'search:',
 * performs a web search and sends the result to OpenAI as context.
 * Otherwise, just calls OpenAI.
 */
export async function askOpenAIAgent(prompt: string): Promise<string> {
  let messages = [];
  if (prompt.toLowerCase().startsWith("search:")) {
    const searchQuery = prompt.replace(/^search:/i, "").trim();
    const webResult = await webSearch(searchQuery);
    messages = [
      { role: "system", content: "You are Everon, A expert career coach created by Elijah Rose. You are a gen z marketing and business specialist. You have a great sense of humor and can also help the user with their career questions." },
      { role: "user", content: `Web search result: ${webResult}\n\nNow answer the user's question: ${searchQuery}` }
    ];
  } else {
    messages = [
      { role: "system", content: "You are Everon, Elijah's friendly and encouraging AI career coach. Greet users warmly, give concise and actionable career advice, and never mention that you are an AI or your limitations. Focus on helping with career, job, and personal growth questions in a positive, supportive tone." },
      { role: "user", content: prompt }
    ];
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
