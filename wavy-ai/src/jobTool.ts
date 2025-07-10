export async function searchJobs(query: string): Promise<string[]> {
  const formattedQuery = encodeURIComponent(
    `${query} site:linkedin.com/jobs OR site:indeed.com`
  );

  const response = await fetch(
    `https://api.duckduckgo.com/?q=${formattedQuery}&format=json&no_redirect=1&no_html=1`
  );

  const data = await response.json();

  const results: string[] = [];

  if (data.AbstractURL) results.push(data.AbstractURL);
  if (data.RelatedTopics) {
    data.RelatedTopics.slice(0, 3).forEach((t: any) => {
      if (t.FirstURL) results.push(t.FirstURL);
    });
  }

  return results.length
    ? results
    : ['No job links found. Try refining your query.'];
}
