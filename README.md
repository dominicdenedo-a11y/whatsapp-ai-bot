# 🤖 Mia Bot - WhatsApp AI Bot by El-espirito

A powerful WhatsApp bot powered by Groq AI.

---

## ✨ Features
- 🧠 AI Chat in any language
- 🎙️ Voice message transcription and reply
- 🖼️ Image analysis
- 📥 Video download (YouTube, TikTok, Instagram, Twitter)
- 📦 Premium APK links
- 👥 Group management
- 🎉 Fun commands

---

## 🚀 Installation

### 1️⃣ Install Termux
Download from F-Droid: https://f-droid.org/packages/com.termux/

### 2️⃣ Install Requirements

```bash
pkg update -y && pkg install git nodejs python ffmpeg -y
```

```bash
pip install yt-dlp --break-system-packages
```

### 3️⃣ Clone the Bot

```bash
git clone https://github.com/dominicdenedo-a11y/whatsapp-ai-bot.git
cd whatsapp-ai-bot
npm install
```

### 4️⃣ Get Free Groq API Key
- Go to https://console.groq.com
- Sign up and create API key
- Copy the key

### 5️⃣ Add Your API Key

```bash
echo GROQ_API_KEY=paste_your_key_here > .env
```

### 6️⃣ Run the Bot

```bash
node index.js
```

Enter your number with country code (e.g. 255773189300), get pairing code, open WhatsApp → 3 dots → Linked Devices → Link with phone number → Enter code immediately

### 7️⃣ Keep Running 24/7

```bash
npm install -g pm2
pm2 start index.js --name whatsapp-bot
pm2 save
```

### 8️⃣ Battery Settings
Settings → Apps → Termux → Battery → Unrestricted

---

## 📋 Commands
All commands start with !

| Command | Description |
|---------|-------------|

---

## 📞 Contact
Created by **El-espirito**
📧 dominicdenedo@gmail.com

---

## ⚠️ Disclaimer
This bot is for educational purposes only.
