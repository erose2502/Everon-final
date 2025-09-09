// Example Node.js Express backend route for Glassdoor job search
// You need to register for Glassdoor API access and get your partnerId and key
// Docs: https://www.glassdoor.com/developer/index.htm

const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const GLASSDOOR_PARTNER_ID = 'YOUR_PARTNER_ID';
const GLASSDOOR_KEY = 'YOUR_API_KEY';

app.post('/api/jobs', async (req, res) => {
  const { query, location } = req.body;
  const url = `http://api.glassdoor.com/api/api.htm?t.p=${GLASSDOOR_PARTNER_ID}&t.k=${GLASSDOOR_KEY}&userip=0.0.0.0&useragent=Mozilla/%2F4.0&format=json&v=1&action=jobs&q=${encodeURIComponent(query)}&l=${encodeURIComponent(location || '')}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    // Map results to JobResult format for frontend
    const jobs = (data.response && data.response.jobs) ? data.response.jobs.map(job => ({
      title: job.title,
      company: job.employer,
      location: job.location,
      url: job.jobViewUrl,
      description: job.descriptionSnippet || '',
      source: 'Glassdoor',
      fitScore: Math.floor(Math.random() * 40) + 60 // Placeholder fit score
    })) : [];
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs from Glassdoor.' });
  }
});

app.listen(8080, () => {
  console.log('Glassdoor API proxy running on port 8080');
});
