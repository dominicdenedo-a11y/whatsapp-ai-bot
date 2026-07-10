const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 4000;

app.use(express.static('public'));
app.use(express.json());

app.get('/api/status', (req, res) => {
    exec('pm2 jlist', (err, stdout) => {
        if (err) return res.json({ error: err.message });
        try {
            const list = JSON.parse(stdout);
            const bot = list.find(p => p.name === 'whatsapp-bot');
            if (!bot) return res.json({ found: false });
            res.json({
                found: true,
                status: bot.pm2_env.status,
                uptime: bot.pm2_env.pm_uptime,
                restarts: bot.pm2_env.restart_time,
                memory: bot.monit.memory,
                cpu: bot.monit.cpu
            });
        } catch (e) {
            res.json({ error: 'parse error' });
        }
    });
});

app.get('/api/logs', (req, res) => {
    const logPath = path.join(os.homedir(), '.pm2/logs/whatsapp-bot-out.log');
    exec(`tail -n 50 "${logPath}"`, (err, stdout) => {
        if (err) return res.json({ logs: 'Could not read logs: ' + err.message });
        res.json({ logs: stdout });
    });
});

app.get('/api/errors', (req, res) => {
    const logPath = path.join(os.homedir(), '.pm2/logs/whatsapp-bot-error.log');
    exec(`tail -n 30 "${logPath}"`, (err, stdout) => {
        if (err) return res.json({ logs: 'Could not read logs: ' + err.message });
        res.json({ logs: stdout });
    });
});

app.post('/api/restart', (req, res) => {
    exec('pm2 restart whatsapp-bot', (err, stdout) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
});
