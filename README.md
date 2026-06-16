# 🤖 Mia Bot - WhatsApp AI Bot by El-espirito

A powerful WhatsApp bot powered by Groq AI with voice, image analysis, video downloads and group management.

## ✨ Features
- 🧠 AI Chat in any language (Mia)
- 🎙️ Voice message transcription and reply
- 🖼️ Image analysis
- 📥 Video download (YouTube, TikTok, Instagram, Twitter)
- 📦 Premium APK links
- 👥 Group management
- 🎉 Fun commands

## 📱 Requirements
- Android phone with Termux from F-Droid
- A WhatsApp number
- Free Groq API key from https://console.groq.com

## 🚀 Installation

Step 1 - Install Termux from F-Droid

Step 2 - Run in Termux:
pkg update -y && pkg install git nodejs python ffmpeg -y && pip install yt-dlp --break-system-packages

Step 3 - Clone and install:
git clone
```https://github.com/dominicdenedo-a11y/whatsapp-ai-bot.git
cd whatsapp-ai-bot
npm install'''

Step 4 - Add Groq API key:
echo "GROQ_API_KEY=your_key_here" > .env

Step 5 - Run:
node index.js

Step 6 - Keep running 24/7:
npm install -g pm2
pm2 start index.js --name whatsapp-bot
pm2 save

## 📞 Contact
Created by El-espirito
Email: dominicdenedo@gmail.com
