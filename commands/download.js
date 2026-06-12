const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

function detectPlatform(url) {
    if (/youtube\.com|youtu\.be/.test(url)) return 'YouTube';
    if (/tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/.test(url)) return 'TikTok';
    if (/instagram\.com/.test(url)) return 'Instagram';
    if (/twitter\.com|x\.com/.test(url)) return 'Twitter/X';
    if (/facebook\.com|fb\.watch/.test(url)) return 'Facebook';
    return 'Video';
}

const validPlatforms = /youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|vt\.tiktok\.com|vm\.tiktok\.com/i;

async function downloadTikTok(url) {
    const apis = [
        async () => {
            const res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, { timeout: 15000 });
            if (res.data?.code === 0) return res.data.data?.hdplay || res.data.data?.play;
        },
        async () => {
            const res = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`, { timeout: 15000 });
            if (res.data?.video?.noWatermark) return res.data.video.noWatermark;
        },
        async () => {
            const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: 15000 });
            if (res.data?.code === 0) return res.data.data?.play;
        }
    ];

    for (const apiFn of apis) {
        try {
            const videoUrl = await apiFn();
            if (videoUrl) return videoUrl;
        } catch (e) {
            console.log('TikTok API fallback failed:', e.message);
        }
    }
    return null;
}

async function downloadVideo({ sock, msg, from, url, pushName }) {
    if (!validPlatforms.test(url)) {
        await sock.sendMessage(from, { text: '❌ Unsupported platform!\nSupported: YouTube, TikTok, Instagram, Twitter, Facebook' }, { quoted: msg });
        return;
    }

    const platform = detectPlatform(url);

    await sock.sendMessage(from, {
        text: `⬇️ *Downloading ${platform} video...*\n\n🔗 ${url}\n\n_Please wait..._`
    }, { quoted: msg });

    if (platform === 'TikTok') {
        try {
            const videoUrl = await downloadTikTok(url);
            if (!videoUrl) {
                await sock.sendMessage(from, { text: '❌ Could not get TikTok video. Try another link.' }, { quoted: msg });
                return;
            }
            const response = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 30000 });
            const buffer = Buffer.from(response.data);
            const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

            if (buffer.length > 64 * 1024 * 1024) {
                await sock.sendMessage(from, { text: `⚠️ File is ${sizeMB}MB — too large for WhatsApp (64MB limit).` }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, {
                video: buffer,
                caption: `✅ *TikTok*\n📁 ${sizeMB} MB`,
                mimetype: 'video/mp4',
            }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ TikTok error: ${e.message}` }, { quoted: msg });
        }
        return;
    }

    const outputDir = path.resolve('./downloads');
    const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');
    const before = new Set(fs.readdirSync(outputDir));
    const cmd = `yt-dlp "${url}" -o "${outputTemplate}" --format "best[filesize<50M]/best" --merge-output-format mp4 --no-playlist --socket-timeout 30 --impersonate "chrome"`;

    return new Promise((resolve) => {
        exec(cmd, { timeout: 120000 }, async (err, stdout, stderr) => {
            if (err) {
                const msg2 = stderr.includes('unavailable') ? '❌ Video is unavailable or private.'
                    : stderr.includes('Unsupported') ? '❌ Unsupported URL.'
                    : `❌ Download failed:\n${stderr.slice(0, 200)}`;
                await sock.sendMessage(from, { text: msg2 }, { quoted: msg });
                resolve();
                return;
            }

            const after = fs.readdirSync(outputDir);
            const newFiles = after.filter(f => !before.has(f));

            if (!newFiles.length) {
                await sock.sendMessage(from, { text: '❌ No file downloaded. Link may be private.' }, { quoted: msg });
                resolve();
                return;
            }

            const filePath = path.join(outputDir, newFiles[0]);
            const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);

            if (fs.statSync(filePath).size > 64 * 1024 * 1024) {
                await sock.sendMessage(from, { text: `⚠️ File is ${sizeMB}MB — too large for WhatsApp (64MB limit).` }, { quoted: msg });
                fs.unlinkSync(filePath);
                resolve();
                return;
            }

            try {
                await sock.sendMessage(from, {
                    video: fs.readFileSync(filePath),
                    caption: `✅ *${platform}*\n📁 ${sizeMB} MB`,
                    mimetype: 'video/mp4',
                }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Couldn't send: ${e.message}` }, { quoted: msg });
            }

            try { fs.unlinkSync(filePath); } catch (_) {}
            resolve();
        });
    });
}

module.exports = { downloadVideo };
