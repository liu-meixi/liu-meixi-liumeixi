var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/weather", async (req, res) => {
    try {
      const city = req.query.city;
      if (!city || typeof city !== "string") {
        return res.status(400).json({ error: "City is required." });
      }
      const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t&lang=zh-cn`);
      if (!response.ok) {
        throw new Error(`wttr.in returned status ${response.status}`);
      }
      const weatherText = await response.text();
      return res.json({ weather: weatherText.trim() });
    } catch (error) {
      console.error("Weather error:", error);
      const weathers = ["\u6674\u6717 25\xB0C", "\u591A\u4E91 22\xB0C", "\u9634\u5929 19\xB0C", "\u5FAE\u98CE\u5C0F\u96E8 18\xB0C", "\u9635\u96E8\u8FC7\u540E 21\xB0C", "\u548C\u7166\u5FAE\u98CE 24\xB0C"];
      const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
      return res.json({ weather: randomWeather, fallback: true });
    }
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const {
        messages,
        systemInstruction,
        useCustomApi,
        customUrl,
        customKey,
        customModel
      } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }
      if (useCustomApi && customUrl && customKey) {
        let targetUrl = customUrl;
        if (!targetUrl.endsWith("/chat/completions") && !targetUrl.endsWith("/completions")) {
          targetUrl = targetUrl.replace(/\/$/, "") + "/chat/completions";
        }
        const payload = {
          model: customModel || "gpt-3.5-turbo",
          messages: [
            ...systemInstruction ? [{ role: "system", content: systemInstruction }] : [],
            ...messages.map((m) => ({
              role: m.role === "model" || m.role === "assistant" ? "assistant" : "user",
              content: m.content || m.parts && m.parts[0]?.text || ""
            }))
          ],
          temperature: 0.7
        };
        const response2 = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${customKey}`
          },
          body: JSON.stringify(payload)
        });
        if (!response2.ok) {
          const errText = await response2.text();
          throw new Error(`Custom API returned error (${response2.status}): ${errText}`);
        }
        const data = await response2.json();
        const replyText = data.choices?.[0]?.message?.content || "";
        return res.json({ reply: replyText });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Server is not configured with a default GEMINI_API_KEY. Please toggle 'Use Custom API' in the Settings tab, and fill in your custom API Key and Endpoint URL."
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const geminiContents = messages.map((m) => {
        const text = m.content || m.parts && m.parts[0]?.text || "";
        const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
        return {
          role,
          parts: [{ text }]
        };
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: geminiContents,
        config: {
          systemInstruction: systemInstruction || "You are a warm, helpful AI companion.",
          temperature: 0.7
        }
      });
      const reply = response.text || "";
      res.json({ reply });
    } catch (error) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during chat generation." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
