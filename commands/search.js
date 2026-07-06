const axios = require('axios');

async function webSearch(query) {
    try {
        const res = await axios.post('https://api.tavily.com/search', {
            api_key: process.env.TAVILY_KEY,
            query,
            max_results: 3,
            search_depth: 'basic'
        }, { timeout: 10000 });

        if (res.data.results && res.data.results.length > 0) {
            return res.data.results.map(r => `${r.title}: ${r.content.slice(0, 200)}`).join('\n\n');
        }
    } catch (e) {
        console.error('Search error:', e.message);
    }

    // Fallback sources if Tavily found nothing
    const fallbacks = await Promise.all([
        searchGdelt(query),
        searchWikipedia(query),
        searchDuckDuckGo(query)
    ]);
    const combined = fallbacks.filter(Boolean).join('\n\n');
    return combined || null;
}


async function searchGdelt(query) {
    try {
        const res = await axios.get('https://api.gdeltproject.org/api/v2/doc/doc', {
            params: { query, mode: 'ArtList', format: 'json', maxrecords: 5 },
            timeout: 8000
        });
        const articles = res.data?.articles;
        if (!articles || articles.length === 0) return null;
        return articles.slice(0, 3).map(a => `${a.title}: ${a.url}`).join('\n');
    } catch (e) {
        console.error('GDELT error:', e.message);
        return null;
    }
}

async function searchWikipedia(topic) {
    try {
        const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, { timeout: 8000 });
        if (!res.data?.extract) return null;
        return `Wikipedia: ${res.data.extract.slice(0, 300)}`;
    } catch (e) {
        console.error('Wikipedia error:', e.message);
        return null;
    }
}

async function searchDuckDuckGo(query) {
    try {
        const res = await axios.get('https://api.duckduckgo.com/', {
            params: { q: query, format: 'json', no_html: 1 },
            timeout: 8000
        });
        const abstract = res.data?.AbstractText;
        if (!abstract) return null;
        return `DuckDuckGo: ${abstract.slice(0, 300)}`;
    } catch (e) {
        console.error('DuckDuckGo error:', e.message);
        return null;
    }
}

module.exports = { webSearch, searchGdelt, searchWikipedia, searchDuckDuckGo };
