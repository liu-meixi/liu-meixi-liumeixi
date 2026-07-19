import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// 天气 API
app.get("/api/weather", async (req, res) => {
  try {
    const city = req.query.city;
    if (!city || typeof city !== "string") {
      return res.status(400).json({ error: "City is required." });
    }
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=%C+%t&lang=zh-cn`
    );
    if (!response.ok) {
      throw new Error(`wttr.in returned status ${response.status}`);
    }
    const weatherText = await response.text();
    return res.json({ weather: weatherText.trim() });
  } catch (error: any) {
    console.error("Weather error:", error);
    const weathers = ["晴朗 25°C", "多云 22°C", "阴天 19°C", "微风小雨 18°C", "阵雨过后 21°C", "和煦微风 24°C"];
    const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
    return res.json({ weather: randomWeather, fallback: true });
  }
});

// AI 聊天 API
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction, useCustomApi, customUrl, customKey, customModel } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    // 自定义 API（OpenAI 兼容）
    if (useCustomApi && customUrl && customKey) {
      let targetUrl = customUrl;
      if (!targetUrl.endsWith("/chat/completions") && !targetUrl.endsWith("/completions")) {
        targetUrl = targetUrl.replace(/\/$/, "") + "/chat/completions";
      }
      const payload = {
        model: customModel || "gpt-3.5-turbo",
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          ...messages.map((m: any) => ({
            role: m.role === "model" || m.role === "assistant" ? "assistant" : "user",
            content: m.content || (m.parts && m.parts[0]?.text) || ""
          }))
        ],
        temperature: 0.7,
      };
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${customKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Custom API returned error (${response.status}): ${errText}`);
      }
      const data = await response.json();
      const replyText = data.choices?.[0]?.message?.content || "";
      return res.json({ reply: replyText });
    }

    // 默认 Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Server is not configured with GEMINI_API_KEY. Please toggle 'Use Custom API' in Settings."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const geminiContents = messages.map((m: any) => {
      const text = m.content || (m.parts && m.parts[0]?.text) || "";
      const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
      return { role, parts: [{ text }] };
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: geminiContents,
      config: {
        systemInstruction: systemInstruction || "You are a warm, helpful AI companion.",
        temperature: 0.7,
      }
    });

    const reply = response.text || "";
    res.json({ reply });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during chat generation." });
  }
});

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Vercel 导出（关键！）
export default app;
