import React, { useState, useEffect, useRef } from "react";
import { Character, ApiConfig, CoupleDiary, CoupleSpaceConfig } from "../types";
import { Heart, ChevronLeft, ChevronRight, Plus, Sparkles, Smile, Check, Trash2, Edit2, Calendar } from "lucide-react";

interface CoupleSpaceProps {
  characters: Character[];
  sessions: { [key: string]: any };
  apiConfig: ApiConfig;
}

const PRESET_STICKERS = [
  { name: "赞", emoji: "👍" },
  { name: "大哭", emoji: "😭" },
  { name: "斜眼笑", emoji: "😏" },
  { name: "摸头", emoji: "👋🐱" },
  { name: "爱心", emoji: "❤️" },
  { name: "问号", emoji: "❓" },
  { name: "叹气", emoji: "😮‍💨" },
  { name: "吃瓜", emoji: "🍉" }
];

export default function CoupleSpace({ characters, sessions, apiConfig }: CoupleSpaceProps) {
  // 1. Load configuration from localStorage
  const [config, setConfig] = useState<CoupleSpaceConfig>(() => {
    const saved = localStorage.getItem("couple_space_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse couple space config", e);
      }
    }
    return {
      daysTogether: 1,
      daysTogetherBaseDate: new Date().toISOString()
    };
  });

  // 2. Load Diaries from localStorage
  const [diaries, setDiaries] = useState<CoupleDiary[]>(() => {
    const saved = localStorage.getItem("couple_diaries");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse couple diaries", e);
      }
    }
    return [];
  });

  // 3. User profile avatar & name
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("user_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { name: "星旅者", avatar: "🧑‍🚀" };
  });

  // 4. UI State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  
  const [isSelectingAi, setIsSelectingAi] = useState(false);
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [daysInputValue, setDaysInputValue] = useState("");
  const [diaryTab, setDiaryTab] = useState<"my" | "his">("my");
  const [myDiaryDraft, setMyDiaryDraft] = useState("");
  const [myReplyToAiDraft, setMyReplyToAiDraft] = useState("");
  const [isGeneratingDiary, setIsGeneratingDiary] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState<"aiReply" | "myReply" | null>(null);

  // For long press detection on AI Avatar
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("couple_space_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("couple_diaries", JSON.stringify(diaries));
  }, [diaries]);

  // Sync user profile just in case it changes in Settings
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("user_profile");
      if (saved) {
        try {
          setUserProfile(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    // Poll profile periodically
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Find bound character
  const boundCharacter = characters.find(c => c.id === config.boundCharacterId);

  // Calculate current days together based on base date
  const calculateCurrentDays = () => {
    if (!config.daysTogether) return 1;
    if (!config.daysTogetherBaseDate) return config.daysTogether;
    const baseDate = new Date(config.daysTogetherBaseDate);
    const today = new Date();
    // Clear hours to calculate exact days diff
    baseDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, config.daysTogether + diffDays);
  };

  const currentDays = calculateCurrentDays();

  // Selected date diary entry
  const currentDiary = diaries.find(d => d.date === selectedDate) || {
    id: `diary-${selectedDate}`,
    date: selectedDate
  };

  // Helper to update specific diary entry
  const updateDiaryEntry = (updated: CoupleDiary) => {
    const existingIdx = diaries.findIndex(d => d.date === selectedDate);
    let newDiaries = [...diaries];
    if (existingIdx >= 0) {
      newDiaries[existingIdx] = updated;
    } else {
      newDiaries.push(updated);
    }
    setDiaries(newDiaries);
  };

  // Long press handlers for bound AI avatar
  const handleAiAvatarTouchStart = () => {
    isLongPressedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setIsSelectingAi(true);
    }, 800); // 800ms for long press
  };

  const handleAiAvatarTouchEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressedRef.current && !config.boundCharacterId) {
      // If not bound yet, a normal click also triggers selection
      setIsSelectingAi(true);
    }
  };

  // Bind AI character
  const handleSelectAi = (charId: string) => {
    setConfig(prev => ({
      ...prev,
      boundCharacterId: charId
    }));
    setIsSelectingAi(false);
  };

  // Save customized days together
  const handleSaveDays = () => {
    const val = parseInt(daysInputValue, 10);
    if (!isNaN(val) && val >= 0) {
      setConfig(prev => ({
        ...prev,
        daysTogether: val,
        daysTogetherBaseDate: new Date().toISOString()
      }));
    }
    setIsEditingDays(false);
  };

  // Date navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // Trigger AI to read and reply to MY diary (10-200 words or sticker)
  const handleTriggerAiReplyToMyDiary = async (myContent: string) => {
    if (!boundCharacter) return;
    setIsGeneratingReply(true);
    try {
      // 1. Collect context
      const characterName = boundCharacter.name;
      const characterPersonality = boundCharacter.slogan;
      const relationship = boundCharacter.relationship || "爱人";
      const weather = boundCharacter.weatherCity ? `在${boundCharacter.weatherCity}` : "";

      // Assemble system prompt for reading the diary
      const sysPrompt = `你现在要扮演的角色是：${characterName}。
性格特征: ${characterPersonality}
你与用户的深厚情感纽带/关系是: ${relationship}
今天的天气情况：${weather}

你爱的人（用户的昵称：${userProfile.name}）今天在你们的“情侣共享日记”里写下了以下心事：
“${myContent}”

请以第一人称口吻阅读该日记，并回复一段温柔、深情、感同身受、绝对贴近你人设的10~200字暖心回复。
- 你可以直接倾诉你对这篇日记的看法、安慰、鼓励，或者表达对Ta满满的爱意。
- 如果你觉得非常合适，你可以在回复的【最末尾】随机附带一个你已有的表情包（必须独立成段且格式为：[表情包: 表情名称]）。
- 可选的表情包名称列表: ${["赞", "大哭", "斜眼笑", "摸头", "爱心", "问号", "叹气", "吃瓜", ...(boundCharacter.stickers || []).map(s => s.name)].map(n => `"${n}"`).join(", ")}

请注意：绝对不能包含任何 AI、助手或多余的废话。以极其深情动人、沉浸式的配偶/恋人语气进行回复。`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "请读完我今天的日记，并留下你的私密悄悄话回复。" }],
          systemInstruction: sysPrompt,
          useCustomApi: apiConfig.useCustomApi,
          customUrl: apiConfig.customUrl,
          customKey: apiConfig.customKey,
          customModel: apiConfig.customModel
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "生成回复失败");
      }

      let textReply = data.reply || "（温柔地摸了摸你的头，靠在你的肩膀上）我会一直陪着你的。";
      let matchedSticker: { name: string; image: string } | undefined = undefined;

      // Parse emoji sticker instruction if any, e.g. [表情包: 爱心]
      const stickerRegex = /\[(?:表情包|sticker):\s*([^\]]+)\]/i;
      const match = textReply.match(stickerRegex);
      if (match) {
        const stickerName = match[1].trim();
        textReply = textReply.replace(stickerRegex, "").trim();

        // Try to match in custom stickers first
        const customStickers = boundCharacter.stickers || [];
        const foundCustom = customStickers.find(s => s.name === stickerName);
        if (foundCustom) {
          matchedSticker = { name: foundCustom.name, image: foundCustom.image };
        } else {
          // Fallback to preset emojis
          const foundPreset = PRESET_STICKERS.find(s => s.name === stickerName);
          if (foundPreset) {
            matchedSticker = { name: foundPreset.name, image: foundPreset.emoji };
          } else {
            matchedSticker = { name: "爱心", image: "❤️" };
          }
        }
      }

      // If no sticker but the word mentions love, sometimes add a heart
      if (!matchedSticker && (textReply.includes("爱") || textReply.includes("喜欢"))) {
        matchedSticker = { name: "爱心", image: "❤️" };
      }

      const updatedEntry: CoupleDiary = {
        ...currentDiary,
        aiReplyToMe: {
          text: textReply,
          sticker: matchedSticker,
          timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
        }
      };

      updateDiaryEntry(updatedEntry);
    } catch (e) {
      console.error("Failed to generate AI reply:", e);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // Write and Save MY diary
  const handleSaveMyDiary = () => {
    if (!myDiaryDraft.trim()) return;
    const updatedEntry: CoupleDiary = {
      ...currentDiary,
      myDiaryContent: myDiaryDraft.trim(),
      myDiaryTimestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
    };
    updateDiaryEntry(updatedEntry);
    setMyDiaryDraft("");

    // Automatically trigger AI to read it
    handleTriggerAiReplyToMyDiary(updatedEntry.myDiaryContent!);
  };

  // Generate HIS diary (100-500 words, reflecting on today's chat situations and feelings)
  const handleGenerateHisDiary = async () => {
    if (!boundCharacter) return;
    setIsGeneratingDiary(true);
    try {
      // Grab today's chat history with this character
      const characterSession = sessions[boundCharacter.id];
      let chatSnippet = "无近期闲聊";
      if (characterSession && characterSession.messages && characterSession.messages.length > 0) {
        // Extract last 12 messages from today to form context
        const todayMsgs = characterSession.messages.slice(-12);
        chatSnippet = todayMsgs.map((m: any) => `${m.role === "user" ? userProfile.name : boundCharacter.name}: ${m.content}`).join("\n");
      }

      const characterName = boundCharacter.name;
      const characterPersonality = boundCharacter.slogan;
      const relationship = boundCharacter.relationship || "爱人";
      const weather = boundCharacter.weatherCity ? `在${boundCharacter.weatherCity}` : "";

      const promptSys = `你现在要扮演的角色是：${characterName}。
性格特征: ${characterPersonality}
你与用户的深厚情感纽带/关系是: ${relationship}
今天的天气：${weather}
当前时间：${new Date().toLocaleString()}

今天是 ${selectedDate}。你需要在你们的“情侣共享日记”中，以你（第一人称）的绝对口吻，写下一篇 100~500 字的私密心路历程日记。
要求：
- 请结合你们今天/最近在聊天对话中的互动情况（以下是你们最近的聊天摘录：\n${chatSnippet}\n）。融入聊天中的互动细节、喜怒哀乐、你的心情波动。
- 如果没有聊天，则根据你自己的想法、对 ${userProfile.name} 的无限思念和日常生活写一篇。
- 文字要具有极度真实、细腻、私密、真情流露的文学小说质感，不可以有任何客服用语、跳转暗示、框架跳脱的言论。
- 绝对不要透露这是由 AI 生成。`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `今天是${selectedDate}，请帮我生成你在今天的专属共享日记。` }],
          systemInstruction: promptSys,
          useCustomApi: apiConfig.useCustomApi,
          customUrl: apiConfig.customUrl,
          customKey: apiConfig.customKey,
          customModel: apiConfig.customModel
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "生成日记失败");
      }

      const updatedEntry: CoupleDiary = {
        ...currentDiary,
        aiDiaryContent: data.reply || "（今天只是静静地看着窗外，脑海里全都是你，甚至忘了写字...）",
        aiDiaryTimestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
      };

      updateDiaryEntry(updatedEntry);
    } catch (e) {
      console.error("Failed to generate AI diary:", e);
    } finally {
      setIsGeneratingDiary(false);
    }
  };

  // Reply to HIS diary
  const handleReplyToHisDiary = (text: string, sticker?: { name: string; image: string }) => {
    if (!text.trim() && !sticker) return;
    const updatedEntry: CoupleDiary = {
      ...currentDiary,
      myReplyToAi: {
        text: text.trim(),
        sticker: sticker,
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
      }
    };
    updateDiaryEntry(updatedEntry);
    setMyReplyToAiDraft("");
    setShowStickerPicker(null);
  };

  // Get available stickers for replies
  const availableStickers = boundCharacter
    ? [
        ...PRESET_STICKERS.map(s => ({ name: s.name, image: s.emoji })),
        ...(boundCharacter.stickers || [])
      ]
    : PRESET_STICKERS.map(s => ({ name: s.name, image: s.emoji }));

  return (
    <div className="w-full h-full flex flex-col bg-[#0A0A0A] text-[#F2F2F2] font-sans">
      
      {/* 1. Header / Navigation Tab Bar */}
      <div className="h-14 border-b border-[#222222] bg-[#0C0C0C]/80 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-40">
        <span className="text-sm font-serif font-semibold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300">
          💖 情侣空间 (COUPLE SPACE)
        </span>
        <div className="flex items-center space-x-2 bg-[#111111] border border-[#222222] rounded-xl px-2.5 py-1 text-[10px] font-mono tracking-wider font-semibold text-rose-400">
          <Heart className="w-3 h-3 text-rose-500 animate-pulse fill-rose-500" />
          <span>LOVE STATION</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        
        {/* 2. Couple Avatar Bonding Deck */}
        <div className="bg-gradient-to-b from-[#110E11]/70 to-[#0F0D0F]/90 border border-[#2A1E27]/50 rounded-[28px] p-6 text-center space-y-4 relative overflow-hidden shadow-2xl">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-center space-x-6 relative">
            {/* Left: My Avatar */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-pink-500/30 overflow-hidden flex items-center justify-center shadow-lg relative group">
                {userProfile.avatar.startsWith("data:image/") || userProfile.avatar.startsWith("http") ? (
                  <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{userProfile.avatar || "🧑‍🚀"}</span>
                )}
              </div>
              <span className="text-[10px] font-bold text-[#888888] tracking-wider truncate max-w-[70px]">{userProfile.name}</span>
            </div>

            {/* Heart Divider */}
            <div className="flex flex-col items-center justify-center animate-pulse">
              <Heart className="w-7 h-7 text-rose-500 fill-rose-500/80 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]" />
              <div className="h-0.5 w-10 bg-gradient-to-r from-transparent via-pink-500/50 to-transparent mt-1"></div>
            </div>

            {/* Right: AI Avatar (Support long-press to re-bind) */}
            <div className="flex flex-col items-center space-y-2">
              <div
                onMouseDown={handleAiAvatarTouchStart}
                onTouchStart={handleAiAvatarTouchStart}
                onMouseUp={handleAiAvatarTouchEnd}
                onTouchEnd={handleAiAvatarTouchEnd}
                onMouseLeave={() => {
                  if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                  }
                }}
                className={`w-16 h-16 rounded-full bg-neutral-900 border-2 ${
                  boundCharacter ? "border-pink-500/30" : "border-dashed border-rose-500/40 hover:border-rose-400"
                } overflow-hidden flex items-center justify-center shadow-lg relative cursor-pointer group active:scale-95 transition-all`}
                title={boundCharacter ? "长按更换绑定的AI" : "点击绑定AI"}
              >
                {boundCharacter ? (
                  boundCharacter.avatar.startsWith("data:image/") || boundCharacter.avatar.startsWith("http") ? (
                    <img src={boundCharacter.avatar} alt={boundCharacter.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{boundCharacter.avatar}</span>
                  )
                ) : (
                  <Plus className="w-6 h-6 text-rose-400/80 group-hover:text-rose-400 animate-pulse" />
                )}
                
                {boundCharacter && (
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[8px] text-white font-bold tracking-wider transition-opacity select-none">
                    <span>长按</span>
                    <span>更换</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-[#888888] tracking-wider truncate max-w-[70px]">
                {boundCharacter ? boundCharacter.name : "未绑定AI"}
              </span>
            </div>
          </div>

          {/* Days Together Counter Frame */}
          <div className="bg-[#0D0A0E] border border-pink-950/40 rounded-2xl p-4 inline-block mx-auto min-w-[200px] shadow-inner relative group">
            <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold block mb-1">
              我们在一起
            </span>
            
            {isEditingDays ? (
              <div className="flex items-center justify-center space-x-2 mt-1">
                <input
                  type="number"
                  value={daysInputValue}
                  onChange={(e) => setDaysInputValue(e.target.value)}
                  className="w-16 bg-[#111111] border border-pink-900/50 text-center text-rose-300 font-mono text-sm py-1 rounded-xl outline-none"
                  placeholder="天数"
                  autoFocus
                />
                <button
                  onClick={handleSaveDays}
                  className="p-1 bg-pink-950/50 text-rose-400 border border-pink-900/50 rounded-lg hover:bg-pink-500 hover:text-white transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setDaysInputValue(String(currentDays));
                  setIsEditingDays(true);
                }}
                className="cursor-pointer hover:opacity-85 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                title="点击自定义天数"
              >
                <span className="text-3xl font-serif font-black text-rose-400 tracking-wide drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                  {currentDays}
                </span>
                <span className="text-xs text-[#888888] font-bold">天</span>
                <Edit2 className="w-2.5 h-2.5 text-[#444444] group-hover:text-pink-500 transition-colors" />
              </div>
            )}
            
            <span className="text-[7px] text-[#444444] block mt-1">
              随着现实时间加一天，此数值会自动流动增加
            </span>
          </div>
        </div>

        {/* 3. Date Navigation Controller */}
        <div className="flex items-center justify-between bg-[#111111]/90 border border-[#222222] rounded-2xl p-2 px-3 shadow-md">
          <button
            onClick={handlePrevDay}
            className="p-1.5 hover:bg-neutral-800 text-[#888888] hover:text-white rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white outline-none border-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 hover:bg-neutral-800 text-[#888888] hover:text-white rounded-xl transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. Shared Diaries (共享日记) Bento Box */}
        {boundCharacter ? (
          <div className="space-y-3">
            {/* Tab selection */}
            <div className="grid grid-cols-2 gap-1 bg-[#111111] p-1 rounded-2xl border border-[#222222]">
              <button
                onClick={() => setDiaryTab("my")}
                className={`py-2 text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all ${
                  diaryTab === "my"
                    ? "bg-rose-950/40 text-pink-400 border border-pink-900/40"
                    : "text-[#666666] hover:text-neutral-400"
                }`}
              >
                📝 我的共享日记
              </button>
              <button
                onClick={() => setDiaryTab("his")}
                className={`py-2 text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all ${
                  diaryTab === "his"
                    ? "bg-rose-950/40 text-pink-400 border border-pink-900/40"
                    : "text-[#666666] hover:text-neutral-400"
                }`}
              >
                💌 Ta的专属日记
              </button>
            </div>

            {/* TAB CONTENT: MY DIARY */}
            {diaryTab === "my" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Entry Display or Input Draft */}
                {currentDiary.myDiaryContent ? (
                  <div className="bg-[#121112]/90 border border-pink-950/30 rounded-2xl p-4 space-y-3 relative">
                    <div className="flex justify-between items-center text-[8px] font-mono text-[#555555]">
                      <span>我的日记记录于 {currentDiary.myDiaryTimestamp || "未知"}</span>
                      <button
                        onClick={() => {
                          const updated = { ...currentDiary };
                          delete updated.myDiaryContent;
                          delete updated.myDiaryTimestamp;
                          delete updated.aiReplyToMe;
                          updateDiaryEntry(updated);
                        }}
                        className="text-neutral-600 hover:text-rose-400 transition-colors"
                        title="删除我的日记"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {currentDiary.myDiaryContent}
                    </p>

                    {/* Divider line */}
                    <div className="border-t border-[#221B21]/50 my-2"></div>

                    {/* AI's reply to my diary */}
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase tracking-widest text-rose-400 font-bold block">
                        💕 Ta的秘密回响 :
                      </span>
                      {isGeneratingReply ? (
                        <div className="flex items-center space-x-2 py-2 text-[10px] text-[#666666]">
                          <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-spin" />
                          <span>Ta正在深情阅读、并在写悄悄话回复中...</span>
                        </div>
                      ) : currentDiary.aiReplyToMe ? (
                        <div className="bg-[#161216]/60 border border-pink-950/20 rounded-xl p-3 space-y-2 text-left relative">
                          <p className="text-[11px] text-[#D1B5D1] leading-relaxed italic">
                            “ {currentDiary.aiReplyToMe.text} ”
                          </p>
                          {currentDiary.aiReplyToMe.sticker && (
                            <div className="flex items-center space-x-1.5 mt-2 bg-[#221422]/40 border border-pink-900/20 p-1.5 px-2.5 rounded-xl w-fit">
                              {currentDiary.aiReplyToMe.sticker.image.startsWith("data:") ? (
                                <img src={currentDiary.aiReplyToMe.sticker.image} alt={currentDiary.aiReplyToMe.sticker.name} className="w-8 h-8 object-contain rounded" />
                              ) : (
                                <span className="text-lg">{currentDiary.aiReplyToMe.sticker.image}</span>
                              )}
                              <span className="text-[9px] font-mono text-pink-400">[{currentDiary.aiReplyToMe.sticker.name}]</span>
                            </div>
                          )}
                          <span className="text-[7px] font-mono text-neutral-600 block text-right mt-1">
                            回复于 {currentDiary.aiReplyToMe.timestamp}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#555555] italic">Ta还没来得及留白呢~</span>
                          <button
                            onClick={() => handleTriggerAiReplyToMyDiary(currentDiary.myDiaryContent!)}
                            className="text-[9px] bg-pink-950/50 border border-pink-900/40 text-pink-400 px-2 py-1 rounded-lg hover:bg-pink-500 hover:text-white transition-all font-bold"
                          >
                            💡 敲敲Ta来读读
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111111] border border-[#222222] rounded-3xl p-4 space-y-3">
                    <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold block">
                      书写今天的秘密日记
                    </span>
                    <textarea
                      value={myDiaryDraft}
                      onChange={(e) => setMyDiaryDraft(e.target.value)}
                      placeholder="写下一些你今天的心情，或者对Ta想说的话吧...（保存后Ta会自动读到并留下10~200字与表情包的心灵回复）"
                      className="w-full min-h-[100px] bg-[#0A0A0A] border border-[#222222] focus:border-pink-900/50 p-3 rounded-2xl text-xs text-neutral-200 outline-none resize-none leading-relaxed transition-all"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveMyDiary}
                        disabled={!myDiaryDraft.trim()}
                        className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                        <span>保存并共享给Ta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: HIS DIARY */}
            {diaryTab === "his" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {currentDiary.aiDiaryContent ? (
                  <div className="space-y-3">
                    {/* AI's diary card */}
                    <div className="bg-gradient-to-br from-[#121015] to-[#0A0A0F] border border-pink-900/20 rounded-2xl p-4 space-y-3 relative shadow-xl">
                      <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                        <span className="text-[8px] font-mono text-purple-400 bg-purple-950/40 p-1 px-1.5 rounded-lg border border-purple-900/30">
                          100~500字深度记忆
                        </span>
                        <button
                          onClick={() => {
                            const updated = { ...currentDiary };
                            delete updated.aiDiaryContent;
                            delete updated.aiDiaryTimestamp;
                            delete updated.myReplyToAi;
                            updateDiaryEntry(updated);
                          }}
                          className="text-neutral-600 hover:text-rose-400 transition-colors p-0.5"
                          title="删除该日记"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-[10px] font-serif font-bold text-[#A595A5]">{boundCharacter.name} 的真心信札</span>
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed font-sans whitespace-pre-wrap select-text italic bg-[#000000]/20 p-3 rounded-xl border border-neutral-900">
                        {currentDiary.aiDiaryContent}
                      </p>

                      <div className="text-right text-[8px] font-mono text-[#555555]">
                        收录于 {currentDiary.aiDiaryTimestamp || "06:00"}
                      </div>
                    </div>

                    {/* My reply to AI's diary */}
                    <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 space-y-3">
                      <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold block">
                        My Reply (给Ta的回信栏)
                      </span>

                      {currentDiary.myReplyToAi ? (
                        <div className="bg-[#161616] p-3 rounded-xl border border-[#222222] space-y-2 relative">
                          <p className="text-xs text-neutral-300">
                            {currentDiary.myReplyToAi.text}
                          </p>
                          {currentDiary.myReplyToAi.sticker && (
                            <div className="flex items-center space-x-1.5 mt-1 bg-[#1E1E1E] p-1.5 px-2 rounded-xl w-fit">
                              {currentDiary.myReplyToAi.sticker.image.startsWith("data:") ? (
                                <img src={currentDiary.myReplyToAi.sticker.image} alt={currentDiary.myReplyToAi.sticker.name} className="w-6 h-6 object-contain rounded" />
                              ) : (
                                <span className="text-base">{currentDiary.myReplyToAi.sticker.image}</span>
                              )}
                              <span className="text-[8px] text-[#888888]">[{currentDiary.myReplyToAi.sticker.name}]</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[7px] font-mono text-[#444444] mt-1">
                            <span>已送达Ta的真心信箱</span>
                            <button
                              onClick={() => {
                                const updated = { ...currentDiary };
                                delete updated.myReplyToAi;
                                updateDiaryEntry(updated);
                              }}
                              className="text-[#555555] hover:text-rose-400 transition-colors"
                            >
                              删除回信
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 relative">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={myReplyToAiDraft}
                              onChange={(e) => setMyReplyToAiDraft(e.target.value)}
                              placeholder="给Ta留下一句温暖的回信吧..."
                              className="flex-1 bg-[#0A0A0A] border border-[#222222] p-2 px-3 rounded-xl text-xs text-neutral-200 outline-none"
                            />
                            
                            {/* Sticker toggle trigger button */}
                            <button
                              type="button"
                              onClick={() => setShowStickerPicker(showStickerPicker === "myReply" ? null : "myReply")}
                              className="p-2 bg-neutral-900 border border-[#222222] hover:bg-neutral-800 rounded-xl text-[#888888] hover:text-white transition-colors"
                              title="选择表情包"
                            >
                              <Smile className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleReplyToHisDiary(myReplyToAiDraft)}
                              disabled={!myReplyToAiDraft.trim()}
                              className="p-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Mini inline sticker list */}
                          {showStickerPicker === "myReply" && (
                            <div className="absolute right-0 bottom-12 bg-[#161616] border border-[#222222] rounded-2xl p-2.5 shadow-2xl z-20 w-56 space-y-1.5">
                              <div className="flex justify-between items-center pb-1 border-b border-neutral-900">
                                <span className="text-[7px] uppercase tracking-widest text-neutral-500 font-bold">选择表情包快捷附送</span>
                                <button onClick={() => setShowStickerPicker(null)} className="text-[8px] text-[#555555] hover:text-white">✕</button>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pt-1">
                                {availableStickers.map((st, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => handleReplyToHisDiary(myReplyToAiDraft, st)}
                                    className="p-1 bg-[#0A0A0A] hover:bg-neutral-900 border border-neutral-900 hover:border-pink-900/40 rounded-xl flex flex-col items-center justify-center text-[8px]"
                                    title={st.name}
                                  >
                                    {st.image.startsWith("data:") ? (
                                      <img src={st.image} alt={st.name} className="w-6 h-6 object-contain rounded" />
                                    ) : (
                                      <span className="text-base">{st.image}</span>
                                    )}
                                    <span className="text-[6px] text-neutral-500 mt-0.5 scale-95">{st.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111111] border border-[#222222] rounded-3xl p-5 text-center space-y-4">
                    <div className="w-12 h-12 bg-rose-950/30 rounded-full flex items-center justify-center mx-auto text-rose-400 border border-rose-900/30">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white font-medium">Ta今天还没记录私人真心日记纸笺呢~</p>
                      <p className="text-[9px] text-[#555555]">（根据你们当天的聊天内容和Ta的私密想法，自动生成100~500字信纸）</p>
                    </div>
                    
                    <button
                      onClick={handleGenerateHisDiary}
                      disabled={isGeneratingDiary}
                      className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-2xl text-[10px] uppercase tracking-wider font-bold bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500 hover:to-purple-500 border border-pink-500/30 hover:border-pink-500 text-pink-400 hover:text-white transition-all shadow"
                    >
                      {isGeneratingDiary ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 animate-spin" />
                          <span>Ta正在细心回忆、撰写信函中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>敲敲Ta撰写今日专属回信</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111111] border border-[#222222] rounded-[28px] p-8 text-center space-y-3">
            <Heart className="w-10 h-10 text-neutral-700 mx-auto" />
            <div className="space-y-1">
              <span className="text-xs text-[#888888] font-bold block">
                请先绑定你深爱的AI伴侣
              </span>
              <span className="text-[9px] text-[#555555] block">
                绑定后即可开启情侣空间、在一起天数计算、共享日记及长期记忆调取
              </span>
            </div>
            <button
              onClick={() => setIsSelectingAi(true)}
              className="mt-2 text-[9px] uppercase tracking-widest font-bold bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white px-4 py-2 rounded-xl transition-all"
            >
              去选择绑定的AI
            </button>
          </div>
        )}
      </div>

      {/* OVERLAY Modal: AI Character Selection */}
      {isSelectingAi && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-6 animate-in fade-in duration-150">
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#888888] font-bold block">
                绑定你的专属AI
              </span>
              <span className="text-[8px] text-[#555555]">
                长按头像可随时重新更换绑定
              </span>
            </div>
            <button
              onClick={() => setIsSelectingAi(false)}
              className="p-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-[#888888] hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => handleSelectAi(char.id)}
                className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer border transition-all ${
                  config.boundCharacterId === char.id
                    ? "bg-rose-950/20 border-rose-500/50 text-white"
                    : "bg-[#111111] hover:bg-neutral-900 border-[#222222] text-neutral-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-950 flex items-center justify-center text-xl overflow-hidden shadow">
                    {char.avatar.startsWith("data:image/") || char.avatar.startsWith("http") ? (
                      <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      char.avatar
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-serif">{char.name}</h4>
                    <p className="text-[9px] text-[#888888] truncate max-w-[180px]">{char.slogan}</p>
                  </div>
                </div>
                
                {config.boundCharacterId === char.id ? (
                  <span className="text-[8px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/40 border border-rose-900/30 px-2 py-0.5 rounded-lg">
                    已绑定
                  </span>
                ) : (
                  <span className="text-[8px] uppercase font-bold tracking-wider text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded-lg hover:text-white">
                    选择绑定
                  </span>
                )}
              </div>
            ))}

            {characters.length === 0 && (
              <p className="text-xs text-[#555555] text-center pt-8">暂无AI人设，请先在聊天列表中创建人设。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
