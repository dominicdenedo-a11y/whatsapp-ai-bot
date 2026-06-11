const Groq = require('groq-sdk');

const FUN_PROMPTS = {
    joke: (a) => `Tell me a funny joke${a ? ` about ${a}` : ''}. Make it genuinely funny with a good punchline.`,
    fact: (a) => `Give me 3 mind-blowing facts${a ? ` about ${a}` : ''}. Number them and make them surprising.`,
    quote: (a) => `Give me an inspiring quote${a ? ` about ${a}` : ''}. Include who said it and why it matters.`,
    roast: (a) => `Roast "${a || 'someone'}" in a funny playful way. Keep it light. End with a compliment.`,
    compliment: (a) => `Give ${a || 'someone'} 5 creative genuine compliments. Make them specific and heartfelt.`,
    riddle: (a) => `Give me a clever riddle${a ? ` about ${a}` : ''}. Format: Riddle: [riddle]\nAnswer: [answer]`,
    story: (a) => `Write a fun micro-story (100 words)${a ? ` about ${a}` : ''} with a twist ending.`,
    poem: (a) => `Write a short beautiful poem${a ? ` about ${a}` : ''}. Make it rhyme and feel emotional.`,
    rap: (a) => `Write a fun rap verse${a ? ` about ${a}` : ''}. Make it rhyme with good flow and wordplay.`,
    meme: (a) => `Generate funny meme text${a ? ` about ${a}` : ''}. Format: TOP TEXT\n[image description]\nBOTTOM TEXT`,
    horoscope: (a) => `Write a funny horoscope for ${a || 'mystery sign'}. Include love, career and a random warning.`,
    trivia: (a) => `Give a trivia question${a ? ` about ${a}` : ''}. Format: Question: [q]\nAnswer: [a]\nFun fact: [fact]`,
    dare: () => `Give me a fun safe dare that is creative and doable in real life.`,
    truth: () => `Give me a deep interesting truth question for truth or dare.`,
};

async function handleFun({ sock, msg, from, cmd, args, pushName }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        await sock.sendMessage(from, { text: '⚠️ Add GROQ_API_KEY to .env!' }, { quoted: msg });
        return;
    }

    const promptFn = FUN_PROMPTS[cmd];
    if (!promptFn) return;

    await sock.sendPresenceUpdate('composing', from);
    await sock.sendMessage(from, { react: { text: '🎭', key: msg.key } });

    try {
        const groq = new Groq({ apiKey });
        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: promptFn(args) }],
            max_tokens: 1000,
        });
        const reply = response.choices[0].message.content;
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(from, { text: reply }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('available', from);
}

module.exports = { handleFun };
