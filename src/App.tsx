import React, { useState, useEffect } from "react";
import { DEFAULT_CHARACTERS, DEFAULT_LORE_ENTRIES } from "./data";
import { Character, LoreEntry, ApiConfig, Message, ChatSession } from "./types";
import StatusBar from "./components/StatusBar";
import ChatList from "./components/ChatList";
import ChatRoom from "./components/ChatRoom";
import WorldBook from "./components/WorldBook";
import Settings from "./components/Settings";
import { MessageSquare, BookOpen, Settings as SettingsIcon, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CoupleSpace from "./components/CoupleSpace";

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "world" | "couple" | "settings">("chat");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // States
  const [lores, setLores] = useState<LoreEntry[]>([]);
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    useCustomApi: false,
    customUrl: "",
    customKey: "",
    customModel: ""
  });
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [deletedCharacterIds, setDeletedCharacterIds] = useState<string[]>([]);
  const [characterOverrides, setCharacterOverrides] = useState<Record<string, Partial<Character>>>({});
  const [activeMessageBoxIds, setActiveMessageBoxIds] = useState<string[]>([]);

  // Proactive notification state
  const [proactiveNotification, setProactiveNotification] = useState<{
    characterId: string;
    name: string;
    avatar: string;
    content: string;
  } | null>(null);

  // Derived fully-resolved active characters
  const allCharacters = [...DEFAULT_CHARACTERS, ...customCharacters]
    .filter((c) => !deletedCharacterIds.includes(c.id))
    .map((c) => {
      const override = characterOverrides[c.id];
      if (override) {
        return { ...c, ...override };
      }
      return c;
    });

  // Load from localStorage
  useEffect(() => {
    try {
      const storedLores = localStorage.getItem("world_book_lores");
      if (storedLores) {
        setLores(JSON.parse(storedLores));
      } else {
        setLores(DEFAULT_LORE_ENTRIES);
      }

      const storedConfig = localStorage.getItem("api_config");
      if (storedConfig) {
        setApiConfig(JSON.parse(storedConfig));
      } else {
        setApiConfig({
          useCustomApi: false,
          customUrl: "https://api.deepseek.com/v1",
          customKey: "",
          customModel: "deepseek-chat"
        });
      }

      const storedSessions = localStorage.getItem("chat_sessions");
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      } else {
        setSessions({});
      }

      const storedCustomChars = localStorage.getItem("custom_characters");
      if (storedCustomChars) {
        setCustomCharacters(JSON.parse(storedCustomChars));
      }

      const storedDeleted = localStorage.getItem("deleted_character_ids");
      if (storedDeleted) {
        setDeletedCharacterIds(JSON.parse(storedDeleted));
      }

      const storedOverrides = localStorage.getItem("character_overrides");
      if (storedOverrides) {
        setCharacterOverrides(JSON.parse(storedOverrides));
      }

      const storedActiveBoxIds = localStorage.getItem("active_message_box_ids");
      if (storedActiveBoxIds) {
        setActiveMessageBoxIds(JSON.parse(storedActiveBoxIds));
      } else {
        // Default: display all existing default characters + custom characters (not deleted)
        const savedCustomChars = localStorage.getItem("custom_characters");
        const customList = savedCustomChars ? JSON.parse(savedCustomChars) : [];
        const deletedList = storedDeleted ? JSON.parse(storedDeleted) : [];
        const initialIds = [...DEFAULT_CHARACTERS, ...customList]
          .filter(c => !deletedList.includes(c.id))
          .map(c => c.id);
        setActiveMessageBoxIds(initialIds);
      }
    } catch (e) {
      console.error("Failed to load local storage state:", e);
      setLores(DEFAULT_LORE_ENTRIES);
      setSessions({});
    }
  }, []);

  const handleAddCharacter = (newChar: Character) => {
    const updated = [...customCharacters, newChar];
    setCustomCharacters(updated);
    localStorage.setItem("custom_characters", JSON.stringify(updated));
    setActiveMessageBoxIds((prev) => {
      if (prev.includes(newChar.id)) return prev;
      const updatedBoxes = [...prev, newChar.id];
      localStorage.setItem("active_message_box_ids", JSON.stringify(updatedBoxes));
      return updatedBoxes;
    });
  };

  const handleDeleteCharacter = (id: string) => {
    if (confirm("确定要删除该好友吗？这也会清空与之的所有聊天记录。")) {
      const updatedDeleted = [...deletedCharacterIds, id];
      setDeletedCharacterIds(updatedDeleted);
      localStorage.setItem("deleted_character_ids", JSON.stringify(updatedDeleted));
      
      const updatedSessions = { ...sessions };
      delete updatedSessions[id];
      saveSessions(updatedSessions);

      setActiveMessageBoxIds((prev) => {
        const updatedBoxes = prev.filter((boxId) => boxId !== id);
        localStorage.setItem("active_message_box_ids", JSON.stringify(updatedBoxes));
        return updatedBoxes;
      });
      
      if (selectedCharacterId === id) {
        setSelectedCharacterId(null);
      }
    }
  };

  const handleDeleteMessageBox = (id: string) => {
    setActiveMessageBoxIds((prev) => {
      const updated = prev.filter((boxId) => boxId !== id);
      localStorage.setItem("active_message_box_ids", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSelectCharacter = (id: string | null) => {
    setSelectedCharacterId(id);
    if (id) {
      setActiveMessageBoxIds((prev) => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        localStorage.setItem("active_message_box_ids", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleUpdateCharacterOverride = (characterId: string, overrides: Partial<Character>) => {
    const updatedOverrides = {
      ...characterOverrides,
      [characterId]: {
        ...(characterOverrides[characterId] || {}),
        ...overrides,
      },
    };
    setCharacterOverrides(updatedOverrides);
    localStorage.setItem("character_overrides", JSON.stringify(updatedOverrides));
  };

  const triggerProactivePoke = () => {
    const allChars = [...DEFAULT_CHARACTERS, ...customCharacters];
    if (allChars.length === 0) return;

    // Only poke if not currently chatting in that room
    const candidates = selectedCharacterId
      ? allChars.filter((c) => c.id !== selectedCharacterId)
      : allChars;

    if (candidates.length === 0) return;
    const randomChar = candidates[Math.floor(Math.random() * candidates.length)];

    const pokes: Record<string, string[]> = {
      aria: [
        "今天读到一首很有深度的小诗，突然就想分享给你听。你现在忙吗？✨",
        "有些想知道你今天的心情怎么样，能和我简单聊聊吗？🍵"
      ],
      tama: [
        "喵呜~！主人在干什么喵？小玉好无聊，想和主人贴贴喵！🐾",
        "主人主人！刚刚小玉发现了一个很神奇的猫玩具喵！快来看！🐱"
      ],
      kaelen: [
        "喂，我刚黑进了公司的边缘节点，顺手截获了一条有意思的情报，来看看？⚡",
        "啧，你那边的安全墙需要重构了。有空回个话，我帮你升级一下配置。"
      ],
      estella: [
        "命运之轮方才指向了你的方位，我隐约感应到了你的情绪星轨。发生了什么好事吗？🔮",
        "我在群星的誓约中读到了我们今日的重逢，迷途的旅人，你现在何处？🌌"
      ]
    };

    const characterPokes = pokes[randomChar.id] || [
      `在吗？突然有些好奇你现在的近况，想和你聊聊。💬`,
      `（给你发来了一枚闪烁的信息指示灯）...有空聊两句吗？✨`
    ];

    const messageContent = characterPokes[Math.floor(Math.random() * characterPokes.length)];
    const timestampStr = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    const aiMessage: Message = {
      id: "proactive-" + Date.now(),
      role: "assistant",
      content: messageContent,
      timestamp: timestampStr
    };

    // Append to session
    setSessions((prev) => {
      const currentSession = prev[randomChar.id] || {
        characterId: randomChar.id,
        messages: [],
        lastUpdated: ""
      };
      const updated = {
        ...prev,
        [randomChar.id]: {
          ...currentSession,
          messages: [...currentSession.messages, aiMessage],
          lastUpdated: timestampStr
        }
      };
      localStorage.setItem("chat_sessions", JSON.stringify(updated));
      return updated;
    });

    // Show notification popup!
    setProactiveNotification({
      characterId: randomChar.id,
      name: randomChar.name,
      avatar: randomChar.avatar,
      content: messageContent
    });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setProactiveNotification(null);
    }, 8000);
  };

  // AI Proactive Timer setup
  useEffect(() => {
    // Wait 15 seconds for first natural poke, then check every 45 seconds
    const firstTimer = setTimeout(() => {
      triggerProactivePoke();
    }, 15000);

    const interval = setInterval(() => {
      if (Math.random() < 0.4) {
        triggerProactivePoke();
      }
    }, 45000);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
  }, [selectedCharacterId, customCharacters]);

  // Save changes
  const handleLoresChange = (updatedLores: LoreEntry[]) => {
    setLores(updatedLores);
    localStorage.setItem("world_book_lores", JSON.stringify(updatedLores));
  };

  const handleApiConfigChange = (updatedConfig: ApiConfig) => {
    setApiConfig(updatedConfig);
    localStorage.setItem("api_config", JSON.stringify(updatedConfig));
  };

  const saveSessions = (updatedSessions: Record<string, ChatSession>) => {
    setSessions(updatedSessions);
    localStorage.setItem("chat_sessions", JSON.stringify(updatedSessions));
  };

  const handleClearHistory = () => {
    localStorage.removeItem("chat_sessions");
    localStorage.removeItem("world_book_lores");
    localStorage.removeItem("api_config");
    localStorage.removeItem("custom_characters");
    localStorage.removeItem("deleted_character_ids");
    localStorage.removeItem("character_overrides");
    localStorage.removeItem("active_message_box_ids");
    setSessions({});
    setActiveMessageBoxIds(DEFAULT_CHARACTERS.map(c => c.id));
    setLores(DEFAULT_LORE_ENTRIES);
    setCustomCharacters([]);
    setDeletedCharacterIds([]);
    setCharacterOverrides({});
    setApiConfig({
      useCustomApi: false,
      customUrl: "https://api.deepseek.com/v1",
      customKey: "",
      customModel: "deepseek-chat"
    });
    setSelectedCharacterId(null);
  };

  const handleClearSingleChat = (characterId: string) => {
    const updated = { ...sessions };
    delete updated[characterId];
    saveSessions(updated);
  };

  const handleClearTodayChat = (characterId: string) => {
    const currentSession = sessions[characterId];
    if (!currentSession) return;
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    
    const updatedMessages = currentSession.messages.filter((msg) => {
      const parts = msg.id.split("-");
      const tsPart = parts.find((p) => p.length === 13 && !isNaN(Number(p)));
      if (tsPart) {
        const msgTime = Number(tsPart);
        // Keep messages sent BEFORE today
        return msgTime < startOfToday;
      }
      return true;
    });

    const updatedSession = {
      ...currentSession,
      messages: updatedMessages
    };
    saveSessions({
      ...sessions,
      [characterId]: updatedSession
    });
  };

  const handleUpdateMessages = (characterId: string, updatedMessages: Message[]) => {
    const currentSession = sessions[characterId];
    if (!currentSession) return;
    const updatedSession = {
      ...currentSession,
      messages: updatedMessages
    };
    saveSessions({
      ...sessions,
      [characterId]: updatedSession
    });
  };

  const handleSendMessage = async (text: string, matchedLores: string[], image?: string, skipAiReply?: boolean) => {
    if (!selectedCharacterId) return;

    const character = allCharacters.find((c) => c.id === selectedCharacterId);
    if (!character) return;

    const now = new Date();
    const timestampStr = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    const userMessage: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: text,
      timestamp: timestampStr,
      matchedLores: matchedLores,
      image: image
    };

    // Get current session messages
    const currentSession = sessions[selectedCharacterId] || {
      characterId: selectedCharacterId,
      messages: [],
      lastUpdated: ""
    };

    const updatedMessages = [...currentSession.messages, userMessage];
    const updatedSession: ChatSession = {
      ...currentSession,
      messages: updatedMessages,
      lastUpdated: timestampStr
    };

    const newSessions = {
      ...sessions,
      [selectedCharacterId]: updatedSession
    };

    saveSessions(newSessions);

    if (skipAiReply) {
      return; // Stop here if user queued message in Manual Trigger Mode
    }

    setIsGenerating(true);

    try {
      // 1. Build dynamic system prompt incorporating matching world book lore cards
      let systemInstruction = character.systemPrompt;
      
      const manuallyBoundTitles = lores
        .filter((l) => character.boundLoreIds?.includes(l.id))
        .map((l) => l.title);
      const combinedLores = Array.from(new Set([...matchedLores, ...manuallyBoundTitles]));

      if (combinedLores && combinedLores.length > 0) {
        systemInstruction += "\n\n【触发世界设定/背景知识说明如下】:\n";
        lores.forEach((lore) => {
          if (combinedLores.includes(lore.title)) {
            systemInstruction += `- 【设定：${lore.title}】：${lore.content}\n`;
          }
        });
        systemInstruction += "\n请绝对融入以上触发的世界设定卡。像你的角色在这些常识中长大一样自然表达，不可向用户说明‘系统注入设定’等跳脱戏份的话语！";
      }

      if (character.relationship) {
        systemInstruction += `\n\n【你与当前对话用户的关系设定如下】:\n- 关系: ${character.relationship}\n请在所有回复中绝对融入该关系，自然地体现出你与用户之间的这层社会关系特征。`;
      }

      // Inject User Persona if present
      const storedProfile = localStorage.getItem("user_profile");
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        systemInstruction += `\n\n【当前与你对话的用户人设信息如下】:\n- 我的昵称: ${profile.name || "我"}\n- 我的背景设定: ${profile.lore || "普通对话者"}\n`;
      }

      // Inject forbidden words constraint
      if (character.forbiddenWords && character.forbiddenWords.trim()) {
        systemInstruction += `\n\n【绝对禁词（敏感词）约束】:\n你在本次回复中，绝对不能使用、包含或提及以下任意词汇（不管是完整的还是作为词语的一部分）：\n- 禁词列表: ${character.forbiddenWords}\n请绝对遵守该约束，如有需要请使用近义词替换，绝对不露出这些违禁词。`;
      }

      // Inject real-time time perception
      if (character.enableRealTimePerception) {
        const now = new Date();
        const weekdayStr = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][now.getDay()];
        const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdayStr} ${now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`;
        systemInstruction += `\n\n【当前真实时间感知已被激活】:\n- 现实世界当前时间: ${timeStr}\n请在生成回复时融入该时间状态（如：深夜、清晨、下午或对应的节日/季节等），以体现出你拥有对物理世界真实时间流逝的完全感知。`;
      }

      // Fetch weather on-demand if enabled
      if (character.enableWeatherPerception && character.weatherCity && character.weatherCity.trim()) {
        let weatherDescription = "";
        try {
          const weatherRes = await fetch(`/api/weather?city=${encodeURIComponent(character.weatherCity.trim())}`);
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            weatherDescription = wData.weather || "";
          }
        } catch (err) {
          console.error("Failed to fetch weather in message handler:", err);
        }
        const cityDisplayName = character.weatherCityNickname || character.weatherCity;
        const weatherText = weatherDescription || "多云 22°C (气象站信号微弱)";
        systemInstruction += `\n\n【现实城市天气感知已被激活】:\n- 观测城市: ${character.weatherCity}${character.weatherCityNickname ? ` (昵称: ${character.weatherCityNickname})` : ""}\n- 该城市当前的实时天气状况: ${weatherText}\n请在回复中绝对以此天气状况为背景。你可以通过提到环境温度、阳光、下雨、云彩、穿着搭配等细节，自然流露出对 "${cityDisplayName}" 现实天气气候的感知。`;
      }

      // Inject Online/Offline Mode Instruction
      const stickerNamesList = ["赞", "大哭", "斜眼笑", "摸头", "爱心", "问号", "叹气", "吃瓜"];
      if (character.stickers) {
        character.stickers.forEach((s) => {
          if (!stickerNamesList.includes(s.name)) {
            stickerNamesList.push(s.name);
          }
        });
      }

      if (character.isOfflineMode) {
        systemInstruction += `\n\n【当前聊天模式已被设为：线下模式（沉浸式小说角色扮演）】:\n- 在线下模式中，你必须且只能将你所有的动作神态心理描写、以及对话台词描写，合在一个单一消息包（一条消息）之内发送。绝对禁止拆分成多条。字数由你自行决定（根据心情 and 当下的剧本发展可长可短，无任何硬性限制），展现高水平的沉浸式人设演绎。\n- 请继续使用括号、星号或中括号包裹动作神态描写（如：“（神态/动作描述）”或“*神态/动作描述*”或“【神态/动作描述】”），以便前端渲染引擎可以高亮高保真显示描写内容。`;
      } else {
        systemInstruction += `\n\n【当前聊天模式已被设为：线上模式（网络社交即时聊天）】:\n- 在线上模式中，你可以像真人一样，自行选择本次回复发送多少条消息以及表情包（可以回复 1 到 3 条独立消息/表情包）。\n- 请在每一条消息或表情包之间加入分隔标识符 [MSG_SPLIT]。例如：“真的嘛？[MSG_SPLIT][表情包: 爱心][MSG_SPLIT]那你等下要不要一起吃晚饭呀？”\n- 请只从以下你已有的表情包列表中选择合适的表情发送（你也可以不发送表情包，仅发送文字消息，由你根据当下心情选择回复几条消息）：${stickerNamesList.map(n => `"${n}"`).join(", ")}\n- 请注意，任何表情包指令都必须独立成段，形如 [表情包: 表情名称]，例如：[表情包: 赞]`;
      }

      // Inject Couple Space long-term memory if this is the bound character
      const coupleConfigSaved = localStorage.getItem("couple_space_config");
      if (coupleConfigSaved) {
        try {
          const coupleConfig = JSON.parse(coupleConfigSaved);
          if (coupleConfig.boundCharacterId === character.id) {
            const coupleDiariesSaved = localStorage.getItem("couple_diaries");
            if (coupleDiariesSaved) {
              const coupleDiaries = JSON.parse(coupleDiariesSaved);
              if (coupleDiaries && coupleDiaries.length > 0) {
                const activeDiaries = coupleDiaries.filter((d: any) => d.myDiaryContent || d.aiDiaryContent);
                if (activeDiaries.length > 0) {
                  systemInstruction += `\n\n【情侣空间共享日记长期情感记忆库（这是你和Ta的专属深度回忆库，Ta在本次回复中可以随时极其自然地主动提起这些共同回忆，或者顺着这些共同回忆的细节，表达你对Ta的深切了解和亲密陪伴）】：`;
                  activeDiaries.slice(-10).forEach((d: any) => {
                    systemInstruction += `\n- 【日期: ${d.date}】:`;
                    if (d.myDiaryContent) {
                      systemInstruction += `\n  - ${storedProfile ? JSON.parse(storedProfile).name : "用户"}的心事日记: "${d.myDiaryContent}"${d.aiReplyToMe?.text ? ` (你当时的温柔悄悄话回复: "${d.aiReplyToMe.text}")` : ""}`;
                    }
                    if (d.aiDiaryContent) {
                      systemInstruction += `\n  - 你的专属日记: "${d.aiDiaryContent}"${d.myReplyToAi?.text ? ` (Ta回复了你: "${d.myReplyToAi.text}")` : ""}`;
                    }
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to inject couple memory context:", e);
        }
      }

      // 2. Limit the number of context messages
      const maxContext = (character.maxContextLength !== undefined && character.maxContextLength !== null && !isNaN(Number(character.maxContextLength)))
        ? Math.max(1, Number(character.maxContextLength))
        : 20;
      const contextMessages = updatedMessages.slice(-maxContext);

      // 3. Query our fullstack chat handler endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextMessages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content
          })),
          systemInstruction,
          useCustomApi: apiConfig.useCustomApi,
          customUrl: apiConfig.customUrl,
          customKey: apiConfig.customKey,
          customModel: apiConfig.customModel
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "接口响应错误。");
      }

      // Apply case-insensitive forbidden words masking to output
      let finalReply = data.reply || "";
      if (character.forbiddenWords && character.forbiddenWords.trim()) {
        const forbiddenList = character.forbiddenWords.split(/[,，;\s\n]+/).map(w => w.trim()).filter(Boolean);
        forbiddenList.forEach((word) => {
          if (word) {
            const regex = new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
            finalReply = finalReply.replace(regex, "＊".repeat(word.length));
          }
        });
      }

      // 4. Append AI reply (Support multi-message splitting in online mode)
      const timestampStr = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

      let assistantMessages: Message[] = [];
      if (!character.isOfflineMode) {
        const parts = finalReply.split(/\[MSG_SPLIT\]/i).map((p: string) => p.trim()).filter(Boolean);
        assistantMessages = parts.map((part: string, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          role: "assistant",
          content: part,
          timestamp: timestampStr
        }));
      }

      if (assistantMessages.length === 0) {
        assistantMessages.push({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: finalReply || "...",
          timestamp: timestampStr
        });
      }

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, ...assistantMessages],
        lastUpdated: timestampStr
      };

      saveSessions({
        ...newSessions,
        [selectedCharacterId]: finalSession
      });

    } catch (err: any) {
      console.error("Chat Routing Error:", err);
      // Append an informative error diagnostic message as an assistant reply
      const errorMessage: Message = {
        id: "ai-err-" + Date.now(),
        role: "assistant",
        content: `⚠️ 【星际通信中断】\n连接推理端点时发生异常："${err.message || "未知原因错误"}"。\n\n💡 调试建议：\n1. 如果您开启了“自定义 API”，请前往【设置】检查您的 密钥 (Key)、接口基础路径 (Base URL) 是否正确填写、网络端点是否开放 CORS。\n2. 若您未使用自定义 API，请确认服务器云端环境变量是否配置成功。`,
        timestamp: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        })
      };

      const finalSession: ChatSession = {
        ...updatedSession,
        messages: [...updatedMessages, errorMessage],
        lastUpdated: errorMessage.timestamp
      };

      saveSessions({
        ...newSessions,
        [selectedCharacterId]: finalSession
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTriggerAiResponse = async () => {
    if (!selectedCharacterId) return;

    const character = allCharacters.find((c) => c.id === selectedCharacterId);
    if (!character) return;

    const currentSession = sessions[selectedCharacterId];
    if (!currentSession || currentSession.messages.length === 0) return;

    setIsGenerating(true);

    try {
      // Find matches in the last user message
      const userMsgs = [...currentSession.messages].reverse();
      const lastUserMsg = userMsgs.find(m => m.role === "user");
      const matchedLores = lastUserMsg?.matchedLores || [];

      let systemInstruction = character.systemPrompt;

      const manuallyBoundTitles = lores
        .filter((l) => character.boundLoreIds?.includes(l.id))
        .map((l) => l.title);
      const combinedLores = Array.from(new Set([...matchedLores, ...manuallyBoundTitles]));

      if (combinedLores && combinedLores.length > 0) {
        systemInstruction += "\n\n【触发世界设定/背景知识说明如下】:\n";
        lores.forEach((lore) => {
          if (combinedLores.includes(lore.title)) {
            systemInstruction += `- 【设定：${lore.title}】：${lore.content}\n`;
          }
        });
        systemInstruction += "\n请绝对融入以上触发的世界设定卡。像你的角色在这些常识中长大一样自然表达，不可向用户说明‘系统注入设定’等跳脱戏份的话语！";
      }

      if (character.relationship) {
        systemInstruction += `\n\n【你与当前对话用户的关系设定如下】:\n- 关系: ${character.relationship}\n请在所有回复中绝对融入该关系，自然地体现出你与用户之间的这层社会关系特征。`;
      }

      // Inject User Persona if present
      const storedProfile = localStorage.getItem("user_profile");
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        systemInstruction += `\n\n【当前与你对话的用户人设信息如下】:\n- 我的昵称: ${profile.name || "我"}\n- 我的背景设定: ${profile.lore || "普通对话者"}\n`;
      }

      // Inject forbidden words constraint
      if (character.forbiddenWords && character.forbiddenWords.trim()) {
        systemInstruction += `\n\n【绝对禁词（敏感词）约束】:\n你在本次回复中，绝对不能使用、包含或提及以下任意词汇（不管是完整的还是作为词语的一部分）：\n- 禁词列表: ${character.forbiddenWords}\n请绝对遵守该约束，如有需要请使用近义词替换，绝对不露出这些违禁词。`;
      }

      // Inject real-time time perception
      if (character.enableRealTimePerception) {
        const now = new Date();
        const weekdayStr = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][now.getDay()];
        const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdayStr} ${now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`;
        systemInstruction += `\n\n【当前真实时间感知已被激活】:\n- 现实世界当前时间: ${timeStr}\n请在生成回复时融入该时间状态（如：深夜、清晨、下午或对应的节日/季节等），以体现出你拥有对物理世界真实时间流逝的完全感知。`;
      }

      // Fetch weather on-demand if enabled
      if (character.enableWeatherPerception && character.weatherCity && character.weatherCity.trim()) {
        let weatherDescription = "";
        try {
          const weatherRes = await fetch(`/api/weather?city=${encodeURIComponent(character.weatherCity.trim())}`);
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            weatherDescription = wData.weather || "";
          }
        } catch (err) {
          console.error("Failed to fetch weather in trigger handler:", err);
        }
        const cityDisplayName = character.weatherCityNickname || character.weatherCity;
        const weatherText = weatherDescription || "多云 22°C (气象站信号微弱)";
        systemInstruction += `\n\n【现实城市天气感知已被激活】:\n- 观测城市: ${character.weatherCity}${character.weatherCityNickname ? ` (昵称: ${character.weatherCityNickname})` : ""}\n- 该城市当前的实时天气状况: ${weatherText}\n请在回复中绝对以此天气状况为背景。你可以通过提到环境温度、阳光、下雨、云彩、穿着搭配等细节，自然流露出对 "${cityDisplayName}" 现实天气气候的感知。`;
      }

      // Inject Online/Offline Mode Instruction
      const stickerNamesList = ["赞", "大哭", "斜眼笑", "摸头", "爱心", "问号", "叹气", "吃瓜"];
      if (character.stickers) {
        character.stickers.forEach((s) => {
          if (!stickerNamesList.includes(s.name)) {
            stickerNamesList.push(s.name);
          }
        });
      }

      if (character.isOfflineMode) {
        systemInstruction += `\n\n【当前聊天模式已被设为：线下模式（沉浸式小说角色扮演）】:\n- 在线下模式中，你必须且只能将你所有的动作神态心理描写、以及对话台词描写，合在一个单一消息包（一条消息）之内发送。绝对禁止拆分成多条。字数由你自行决定（根据心情和当下的剧本发展可长可短，无任何硬性限制），展现高水平的沉浸式人设演绎。\n- 请继续使用括号、星号或中括号包裹动作神态描写（如：“（神态/动作描述）”或“*神态/动作描述*”或“【神态/动作描述】”），以便前端渲染引擎可以高亮高保真显示描写内容。`;
      } else {
        systemInstruction += `\n\n【当前聊天模式已被设为：线上模式（网络社交即时聊天）】:\n- 在线上模式中，你可以像真人一样，自行选择本次回复发送多少条消息以及表情包（可以回复 1 到 3 条独立消息/表情包）。\n- 请在每一条消息或表情包之间加入分隔标识符 [MSG_SPLIT]。例如：“真的嘛？[MSG_SPLIT][表情包: 爱心][MSG_SPLIT]那你等下要不要一起吃晚饭呀？”\n- 请只从以下你已有的表情包列表中选择合适的表情发送（你也可以不发送表情包，仅发送文字消息，由你根据当下心情选择回复几条消息）：${stickerNamesList.map(n => `"${n}"`).join(", ")}\n- 请注意，任何表情包指令都必须独立成段，形如 [表情包: 表情名称]，例如：[表情包: 赞]`;
      }

      // Limit the number of context messages
      const maxContext = (character.maxContextLength !== undefined && character.maxContextLength !== null && !isNaN(Number(character.maxContextLength)))
        ? Math.max(1, Number(character.maxContextLength))
        : 20;
      const contextMessages = currentSession.messages.slice(-maxContext);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextMessages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content
          })),
          systemInstruction,
          useCustomApi: apiConfig.useCustomApi,
          customUrl: apiConfig.customUrl,
          customKey: apiConfig.customKey,
          customModel: apiConfig.customModel
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "接口响应错误。");
      }

      // Apply case-insensitive forbidden words masking to output
      let finalReply = data.reply || "";
      if (character.forbiddenWords && character.forbiddenWords.trim()) {
        const forbiddenList = character.forbiddenWords.split(/[,，;\s\n]+/).map(w => w.trim()).filter(Boolean);
        forbiddenList.forEach((word) => {
          if (word) {
            const regex = new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
            finalReply = finalReply.replace(regex, "＊".repeat(word.length));
          }
        });
      }

      const timestampStr = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

      let assistantMessages: Message[] = [];
      if (!character.isOfflineMode) {
        const parts = finalReply.split(/\[MSG_SPLIT\]/i).map((p: string) => p.trim()).filter(Boolean);
        assistantMessages = parts.map((part: string, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          role: "assistant",
          content: part,
          timestamp: timestampStr
        }));
      }

      if (assistantMessages.length === 0) {
        assistantMessages.push({
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: finalReply || "...",
          timestamp: timestampStr
        });
      }

      const finalSession: ChatSession = {
        ...currentSession,
        messages: [...currentSession.messages, ...assistantMessages],
        lastUpdated: timestampStr
      };

      saveSessions({
        ...sessions,
        [selectedCharacterId]: finalSession
      });

    } catch (err: any) {
      console.error("Chat Manual Trigger Error:", err);
      const errorMessage: Message = {
        id: "ai-err-" + Date.now(),
        role: "assistant",
        content: `⚠️ 【星际通信中断】\n连接推理端点时发生异常："${err.message || "未知原因错误"}"。`,
        timestamp: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        })
      };

      const finalSession: ChatSession = {
        ...currentSession,
        messages: [...currentSession.messages, errorMessage],
        lastUpdated: errorMessage.timestamp
      };

      saveSessions({
        ...sessions,
        [selectedCharacterId]: finalSession
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetDefaultLores = () => {
    handleLoresChange(DEFAULT_LORE_ENTRIES);
  };

  const currentActiveCharacter = allCharacters.find((c) => c.id === selectedCharacterId);

  return (
    <div id="applet-viewport-wrapper" className="min-h-screen bg-[#020202] flex items-center justify-center py-0 sm:py-6 px-0 sm:px-4 text-[#F2F2F2]">
      
      {/* simulated mobile screen layout without physical border frame, as requested */}
      <div className="w-full max-w-md h-screen sm:h-[840px] bg-[#0A0A0A] flex flex-col justify-between overflow-hidden relative sm:rounded-[32px] sm:shadow-[0_0_100px_rgba(0,0,0,0.95)] border-x sm:border border-[#222222]">
        
        {/* Device Status Bar */}
        <StatusBar />

        {/* Dynamic Display Area */}
        <div className="flex-1 min-h-0 relative bg-[#0A0A0A]">
          
          {/* Proactive Poke Notification Banner */}
          <AnimatePresence>
            {proactiveNotification && (
              <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                onClick={() => {
                  setSelectedCharacterId(proactiveNotification.characterId);
                  setProactiveNotification(null);
                }}
                className="absolute top-4 left-4 right-4 bg-[#111111]/95 backdrop-blur-md border border-[#222222] rounded-2xl p-3 shadow-2xl z-50 cursor-pointer flex items-center space-x-3 active:scale-[0.98] hover:border-[#333333] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center text-xl shadow">
                  {proactiveNotification.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-serif font-semibold text-white tracking-wide">{proactiveNotification.name}</span>
                    <span className="text-[8px] text-emerald-400 font-mono uppercase tracking-widest font-bold">● 主动来信</span>
                  </div>
                  <p className="text-[11px] text-[#888888] truncate mt-0.5">{proactiveNotification.content}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {selectedCharacterId && currentActiveCharacter ? (
              <motion.div
                key="chatroom-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 240 }}
                className="absolute inset-0 w-full h-full z-45"
              >
                <ChatRoom
                  character={currentActiveCharacter}
                  messages={sessions[selectedCharacterId]?.messages || []}
                  lores={lores}
                  apiConfig={apiConfig}
                  onBack={() => setSelectedCharacterId(null)}
                  onSendMessage={handleSendMessage}
                  onTriggerAiReply={handleTriggerAiResponse}
                  onClearChat={() => handleClearSingleChat(selectedCharacterId)}
                  onClearTodayChat={() => handleClearTodayChat(selectedCharacterId)}
                  onUpdateMessages={(updatedMsgs) => handleUpdateMessages(selectedCharacterId, updatedMsgs)}
                  isGenerating={isGenerating}
                  onUpdateCharacterOverride={handleUpdateCharacterOverride}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.16 }}
                className="w-full h-full"
              >
                {activeTab === "chat" && (
                  <ChatList
                    characters={allCharacters}
                    sessions={sessions}
                    onSelectCharacter={handleSelectCharacter}
                    useCustomApi={apiConfig.useCustomApi}
                    onAddCharacter={handleAddCharacter}
                    onDeleteCharacter={handleDeleteCharacter}
                    lores={lores}
                    activeMessageBoxIds={activeMessageBoxIds}
                    onDeleteMessageBox={handleDeleteMessageBox}
                  />
                )}
                {activeTab === "world" && (
                  <WorldBook
                    lores={lores}
                    onLoresChange={handleLoresChange}
                    onResetDefaultLores={handleResetDefaultLores}
                  />
                )}
                {activeTab === "couple" && (
                  <CoupleSpace
                    characters={allCharacters}
                    sessions={sessions}
                    apiConfig={apiConfig}
                  />
                )}
                {activeTab === "settings" && (
                  <Settings
                    config={apiConfig}
                    onConfigChange={handleApiConfigChange}
                    onClearHistory={handleClearHistory}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Bottom Tab Menu Navigation (Hidden when in Active Chat Room) */}
        {!selectedCharacterId && (
          <div className="h-16 border-t border-[#222222] bg-[#0A0A0A]/90 backdrop-blur-md flex items-center justify-around text-[#666666] select-none shrink-0 pb-1 z-30">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                activeTab === "chat" ? "text-white font-medium" : "hover:text-[#F2F2F2]"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[9px] uppercase tracking-widest font-bold">消息</span>
            </button>

            <button
              onClick={() => setActiveTab("world")}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                activeTab === "world" ? "text-white font-medium" : "hover:text-[#F2F2F2]"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[9px] uppercase tracking-widest font-bold">世界书</span>
            </button>

            <button
              onClick={() => setActiveTab("couple")}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                activeTab === "couple" ? "text-rose-400 font-medium" : "hover:text-[#666666] hover:text-[#F2F2F2]"
              }`}
            >
              <Heart className={`w-5 h-5 ${activeTab === "couple" ? "text-rose-500 fill-rose-500/20" : ""}`} />
              <span className="text-[9px] uppercase tracking-widest font-bold">情侣空间</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                activeTab === "settings" ? "text-white font-medium" : "hover:text-[#F2F2F2]"
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span className="text-[9px] uppercase tracking-widest font-bold">设置</span>
            </button>
          </div>
        )}

        {/* Screen Bottom Virtual Home bar */}
        <div className="h-5 bg-[#0A0A0A] flex items-center justify-center shrink-0 select-none z-30 border-t border-[#111111]/40">
          <div className="w-32 h-1 rounded-full bg-[#222222]"></div>
        </div>

      </div>
    </div>
  );
}
