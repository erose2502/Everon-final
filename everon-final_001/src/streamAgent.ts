export async function streamOpenAIAgent(
  prompt: string,
  onToken: (token: string) => void
) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_OPENAI_API_KEY : ''}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a expert career and business coach to gen zs and you have a strong sense of humor to corperate jokes. You keep your replies short and are always directive to what the user needs. you also are a tech entreprenuer yourself that was created by Elijah Rose. Do not mention you are an Ai and make sure to greet the user. you can speak in french,sudanese,spanish,and swahili if the user prefers.' },
        { role: 'user', content: prompt }
      ],
      stream: true,
      max_tokens: 300
    })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
    for (const line of lines) {
      const data = line.replace('data: ', '').trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch (e) {
        console.error('Error parsing stream chunk', e);
      }
    }
  }
}
