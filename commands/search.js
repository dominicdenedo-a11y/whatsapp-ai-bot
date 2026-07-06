const axios = require('axios');

async function webSearch(query) {
    try {
        const res = await axios.post('https://api.tavily.com/search', {
            api_key: process.env.TAVILY_KEY,
            query,
            max_results: 3,
            search_depth: 'basic'
        }, { timeout: 10000 });

        if (!res.data.results || res.data.results.length === 0) return null;

        return res.data.results.map(r => `${r.title}: ${r.content.slice(0, 200)}`).join('\n\n');
    } catch (e) {
        console.error('Search error:', e.message);
        return null;
    }
}

module.exports = { webSearch };
