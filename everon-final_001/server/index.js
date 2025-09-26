const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Perplexity API Key from environment variable
const PPLX_API_KEY = process.env.PPLX_API_KEY;

if (!PPLX_API_KEY) {
  console.error('Error: PPLX_API_KEY environment variable is required');
  process.exit(1);
}

// Job search endpoint using Perplexity API
app.post('/api/search-jobs', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const prompt = `Find 5 recent ${query} jobs from Indeed, Glassdoor, LinkedIn, and other major job boards. Include job titles, companies, locations, and links.`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PPLX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'pplx-70b-online',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    const jobResults = data.choices?.[0]?.message?.content || 'No results found.';
    
    res.json({ results: jobResults });
  } catch (error) {
    console.error('Job search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
