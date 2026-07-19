import React, { useState, useEffect, useRef } from "react";
import { Character, Message, LoreEntry, ApiConfig } from "../types";
import { ArrowLeft, Send, Sparkles, Zap, BookOpen, Info, Image, Smile, Moon, Eye, Plus, Trash2, X, Edit2, RotateCcw } from "lucide-react";

interface ChatRoomProps {
  character: Character;
  messages: Message[];
  lores: LoreEntry[];
  apiConfig: ApiConfig;
  onBack: () => void;
  onSendMessage: (text: string, matchedLores: string[], image?: string, skipAiReply?: boolean) => void;
  onTriggerAiReply: () => void;
  onClearChat: () => void;
  onClearTodayChat?: () => void;
  onUpdateMessages: (updatedMessages: Message[]) => void;
  isGenerating: boolean;
  onUpdateCharacterOverride?: (characterId: string, overrides: Partial<Character>) => void;
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

interface StickerItem {
  name: string;
  emoji: string;
  isCustom?: boolean;
  image?: string; // Base64 data
}

export default function ChatRoom({
  character,
  messages,
  lores,
  apiConfig,
  onBack,
  onSendMessage,
  onTriggerAiReply,
  onClearChat,
  onClearTodayChat,
  onUpdateMessages,
  isGenerating,
  onUpdateCharacterOverride
}: ChatRoomProps) {
  const [inputText, setInputText] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Advanced toggles for chat room state
  const isRoleplayMode = !!character.isOfflineMode;
  const [isStickerPanelOpen, setIsStickerPanelOpen] = useState(false);
  const [stickerToDelete, setStickerToDelete] = useState<{ name: string; isExclusive: boolean } | null>(null);

  // Stickers state (supports persistent custom uploads and deletions)
  const [stickers, setStickers] = useState<StickerItem[]>(() => {
    try {
      const saved = localStorage.getItem("custom_stickers");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load stickers", e);
    }
    return PRESET_STICKERS;
  });

  // Long-press or click message menu state
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  
  // Timer ref for long press detection
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timer ref for sticker long press detection
  const stickerPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStickerLongPressedRef = useRef<boolean>(false);

  // Sync stickers to localStorage
  const saveStickers = (updated: StickerItem[]) => {
    setStickers(updated);
    localStorage.setItem("custom_stickers", JSON.stringify(updated));
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return;

    // Scan for matched world book entries based on user text
    const matched = lores
      .filter((l) => l.isActive)
      .filter((l) => l.keywords.some((keyword) => inputText.toLowerCase().includes(keyword.toLowerCase())))
      .map((l) => l.title);

    // 点击小飞机，AI不自动回复，只发送信息 (skipAiReply = true)
    onSendMessage(inputText.trim(), matched, undefined, true);
    setInputText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Image Upload handler (convert image to Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      onSendMessage(`[发送图片: ${file.name}]`, [], base64Data, true);
    };
    reader.readAsDataURL(file);
  };

  const handleSendSticker = (sticker: any) => {
    onSendMessage(`[表情包: ${sticker.name}]`, [], undefined, true);
    setIsStickerPanelOpen(false);
  };

  // Add custom sticker (Batch upload)
  const handleCustomStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loaded = 0;
    const newStickersList: StickerItem[] = [];

    fileList.forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const originalName = file.name.split(".")[0] || "自定义";
        newStickersList.push({
          name: originalName,
          emoji: "🖼️",
          isCustom: true,
          image: base64Data
        });
        loaded++;
        if (loaded === fileList.length) {
          saveStickers([...stickers, ...newStickersList]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Delete custom or exclusive sticker
  const handleDeleteSticker = (nameToDelete: string, isExclusive?: boolean) => {
    if (confirm(`确认要删除表情包 "${nameToDelete}" 吗？`)) {
      if (isExclusive && character) {
        const updated = (character.stickers || []).filter((s) => s.name !== nameToDelete);
        onUpdateCharacterOverride?.(character.id, { stickers: updated });
      } else {
        const updated = stickers.filter((s) => s.name !== nameToDelete);
        saveStickers(updated);
      }
    }
  };

  // Message recall/withdraw handler
  const handleRecallMessage = (msgId: string) => {
    const updated = messages.filter((m) => m.id !== msgId);
    onUpdateMessages(updated);
    setActiveMenuMsgId(null);
  };

  // Message edit edit state initiation
  const handleStartEditMessage = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditingText(msg.content);
    setActiveMenuMsgId(null);
  };

  // Save modified message
  const handleSaveEditedMessage = (msgId: string) => {
    if (!editingText.trim()) return;
    const updated = messages.map((m) => {
      if (m.id === msgId) {
        return { ...m, content: editingText.trim() };
      }
      return m;
    });
    onUpdateMessages(updated);
    setEditingMsgId(null);
    setEditingText("");
  };

  // Long press timer starts
  const handlePressStart = (msgId: string) => {
    pressTimerRef.current = setTimeout(() => {
      setActiveMenuMsgId(msgId);
    }, 600); // 600ms holds triggers menu
  };

  // Long press timer cancels
  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  // Preset quick phrases have been removed.

  // Parsers to format text with purple scenic actions & pink dialogue in Roleplay mode
  const renderMessageContent = (msg: Message) => {
    const content = msg.content;

    // Check if it's a sticker message
    const isStickerMsg = content.startsWith("[表情包: ") && content.endsWith("]");
    if (isStickerMsg) {
      const stickerName = content.replace("[表情包: ", "").replace("]", "");
      const foundSticker = stickers.find((s) => s.name === stickerName);
      return (
        <div className="flex flex-col items-center p-2.5 bg-[#111111]/80 border border-[#222222] rounded-2xl max-w-[120px] shadow-md select-none">
          {foundSticker && foundSticker.image ? (
            <img src={foundSticker.image} alt={stickerName} className="w-16 h-16 object-contain rounded-lg" />
          ) : (
            <span className="text-4xl filter drop-shadow-sm animate-bounce-slow">
              {foundSticker ? foundSticker.emoji : "✨"}
            </span>
          )}
          <span className="text-[9px] uppercase tracking-widest text-[#888888] font-mono mt-1.5 font-bold bg-[#1C1C1C] border border-[#262626] px-1.5 py-0.5 rounded truncate max-w-full">
            {stickerName}
          </span>
        </div>
      );
    }

    // Normal Text or Roleplay Text Mode
    if (isRoleplayMode) {
      // Splits by brackets or asterisks
      const regex = /(\*[^*]+\*|\([^)]+\)|（[^）]+）|【[^】]+】|\[[^\]]+\])/g;
      const parts = content.split(regex);
      return (
        <p className="leading-relaxed whitespace-pre-wrap">
          {parts.map((part, index) => {
            if (!part) return null;
            const isAction =
              (part.startsWith("*") && part.endsWith("*")) ||
              (part.startsWith("(") && part.endsWith(")")) ||
              (part.startsWith("（") && part.endsWith("）")) ||
              (part.startsWith("【") && part.endsWith("】")) ||
              (part.startsWith("[") && part.endsWith("]"));

            if (isAction) {
              return (
                <span key={index} className="text-purple-400 font-serif italic font-medium">
                  {part}
                </span>
              );
            } else {
              return (
                <span key={index} className="text-pink-400 font-sans font-semibold tracking-wide">
                  {part}
                </span>
              );
            }
          })}
        </p>
      );
    }

    return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div id="chat-room-container" className="flex flex-col h-full bg-[#0A0A0A] text-[#F2F2F2] relative overflow-hidden font-sans">
      
      {/* Chat Room Header */}
      <div className="h-16 px-6 border-b border-[#222222] bg-[#0A0A0A] flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1 rounded-lg hover:bg-[#111111] text-[#888888] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar and Name */}
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${character.color} flex items-center justify-center text-lg shadow-inner overflow-hidden`}>
              {character.avatar.startsWith("data:image/") || character.avatar.startsWith("http") ? (
                <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                character.avatar
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">{character.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-[#666666]">{character.category}</p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-2">
          {/* Roleplay Mode Toggle */}
          <button
            onClick={() => onUpdateCharacterOverride?.(character.id, { isOfflineMode: !isRoleplayMode })}
            title="线下模式（神态紫色，对话粉色）"
            className={`p-2 rounded-xl transition-all ${
              isRoleplayMode ? "text-pink-400 bg-purple-950/40 border border-purple-900/50" : "text-[#444444] hover:text-[#888888]"
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowProfile(!showProfile)}
            title="查看设定详情"
            className={`p-2 rounded-xl hover:bg-[#111111] transition-all ${
              showProfile ? "text-white bg-[#111111]" : "text-[#444444] hover:text-white"
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Board Layout (With sliding character settings panel) */}
      <div className="flex-1 relative flex min-h-0">
        
        {/* Profile Details Sidebar Panel (Right absolute slide-in) */}
        {showProfile && (
          <div className="absolute top-0 right-0 w-[270px] h-full bg-[#0A0A0A] border-l border-[#222222] shadow-2xl z-30 p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-250 no-scrollbar">
            <div className="flex justify-between items-center pb-3 border-b border-[#222222]">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white">人设档案</span>
              <button
                onClick={() => setShowProfile(false)}
                className="text-[10px] text-[#666666] hover:text-white transition-colors"
              >
                关闭 ✕
              </button>
            </div>

            {/* Character info */}
            <div className="text-center py-2 space-y-3">
              <div className="relative group/avatar w-16 h-16 mx-auto">
                <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${character.color} flex items-center justify-center text-3xl shadow-lg overflow-hidden`}>
                  {character.avatar.startsWith("data:image/") || character.avatar.startsWith("http") ? (
                    <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    character.avatar
                  )}
                </div>
                {/* Edit avatar overlay */}
                <input
                  type="file"
                  accept="image/*"
                  id="profile-avatar-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        onUpdateCharacterOverride?.(character.id, { avatar: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="profile-avatar-upload"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white text-[9px] uppercase font-bold tracking-wider rounded-3xl cursor-pointer transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5 mb-0.5" />
                  修改头像
                </label>
              </div>

              {/* Helpful descriptive tip to guide the user */}
              <span className="text-[8px] text-[#555555] block hover:text-[#888888] transition-colors cursor-pointer" onClick={() => document.getElementById("profile-avatar-upload")?.click()}>
                点击上方头像更换本地照片
              </span>

              {/* Name field */}
              <div className="space-y-1 text-left">
                <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold block">角色名称</span>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => onUpdateCharacterOverride?.(character.id, { name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#222222] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#444444] text-center font-serif"
                />
              </div>

              <div className="flex justify-center">
                <span className="text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#111111] text-[#888888] border border-[#222222]">
                  {character.category}
                </span>
              </div>
            </div>

            {/* slogan */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">自我介绍</span>
              <input
                type="text"
                value={character.slogan}
                onChange={(e) => onUpdateCharacterOverride?.(character.id, { slogan: e.target.value })}
                className="w-full bg-[#111111] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444]"
              />
            </div>

            {/* Base instruction prompt */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500/80" />
                对方人设
              </span>
              <textarea
                rows={4}
                value={character.systemPrompt}
                onChange={(e) => onUpdateCharacterOverride?.(character.id, { systemPrompt: e.target.value })}
                className="w-full bg-[#111111] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444] resize-none font-sans"
              />
            </div>

            {/* Character Exclusive Stickers (专属表情) */}
            <div className="space-y-3 p-4 bg-[#111111] border border-[#222222] rounded-2xl">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-white flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-pink-400" />
                    角色专属表情
                  </span>
                  <p className="text-[8px] text-[#666666]">读取文件名作为AI识别指令</p>
                </div>
                
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="profile-stickers-upload"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      const fileList = Array.from(files);
                      let loaded = 0;
                      const newStickers: { name: string; image: string }[] = [];
                      
                      fileList.forEach((file: any) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = reader.result as string;
                          const name = file.name.split(".")[0] || "表情";
                          newStickers.push({ name, image: base64 });
                          loaded++;
                          if (loaded === fileList.length) {
                            const current = character.stickers || [];
                            onUpdateCharacterOverride?.(character.id, {
                              stickers: [...current, ...newStickers]
                            });
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                  <label
                    htmlFor="profile-stickers-upload"
                    className="cursor-pointer text-[9px] uppercase tracking-widest px-2 py-1 rounded-full border border-neutral-700 bg-neutral-900 text-white font-bold hover:bg-white hover:text-black hover:border-transparent transition-all flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" /> 批量添加
                  </label>
                </div>
              </div>

              {character.stickers && character.stickers.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
                    {character.stickers.map((st, idx) => (
                      <div
                        key={`${st.name}-${idx}`}
                        className="relative group/profile-sticker bg-[#0A0A0A] border border-[#222222] p-1 rounded-xl flex flex-col items-center justify-center text-center min-h-[50px]"
                      >
                        <img src={st.image} alt={st.name} className="w-8 h-8 object-contain rounded" />
                        <span className="text-[7px] text-[#666666] truncate max-w-full block mt-0.5">{st.name}</span>
                        
                        <button
                          onClick={() => {
                            if (confirm(`确认删除该专属表情 "${st.name}" 吗？`)) {
                              const updated = (character.stickers || []).filter((_, sIdx) => sIdx !== idx);
                              onUpdateCharacterOverride?.(character.id, { stickers: updated });
                            }
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center"
                          title="删除"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("确认要删除该角色所有的专属表情吗？")) {
                        onUpdateCharacterOverride?.(character.id, { stickers: [] });
                      }
                    }}
                    className="w-full text-center text-[9px] py-1 border border-rose-900/30 bg-rose-950/10 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-lg transition-colors font-bold uppercase tracking-wider"
                  >
                    批量清空专属表情
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-center text-[#444444] py-3 border border-dashed border-[#222222] rounded-xl font-mono uppercase tracking-wider">
                  暂无专属表情
                </div>
              )}
            </div>

            {/* World Book correlation info */}
            <div className="p-4 rounded-2xl bg-[#111111] border border-[#222222] space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest font-bold text-white flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-white" />
                世界书设定关联
              </span>
              <p className="text-[10px] text-[#888888] leading-relaxed">
                当输入内容匹配特定词条时，对应的设定将自动激活并载入AI的记忆上下文。
              </p>
            </div>

            {/* Relationship field */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">与我的关系</span>
              <input
                type="text"
                placeholder="例如：青梅竹马、挚友、严厉导师"
                value={character.relationship || ""}
                onChange={(e) => onUpdateCharacterOverride?.(character.id, { relationship: e.target.value })}
                className="w-full bg-[#111111] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444]"
              />
            </div>

            {/* Auto reply interval */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">自动回复间隔时间</span>
              <select
                value={character.autoReplyInterval || ""}
                onChange={(e) => onUpdateCharacterOverride?.(character.id, { autoReplyInterval: e.target.value })}
                className="w-full bg-[#111111] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">不自动回复 (手动)</option>
                <option value="1h">1小时</option>
                <option value="3h">3小时</option>
                <option value="6h">6小时</option>
              </select>
            </div>

            {/* Forbidden Words (禁词约束) */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">禁词约束 (以逗号或空格隔开)</span>
              <textarea
                rows={2}
                placeholder="例如：笨蛋, 讨厌, 魔法 (AI回复中将绝对不出现这些词)"
                value={character.forbiddenWords || ""}
                onChange={(e) => onUpdateCharacterOverride?.(character.id, { forbiddenWords: e.target.value })}
                className="w-full bg-[#111111] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444] resize-none font-sans"
              />
            </div>

            {/* Max Context Messages (上下文记忆条数) */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">上下文记忆条数</span>
              <input
                type="number"
                min={1}
                max={100}
                placeholder="默认20条"
                value={character.maxContextLength !== undefined && character.maxContextLength !== null ? character.maxContextLength : ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                  onUpdateCharacterOverride?.(character.id, { maxContextLength: isNaN(Number(val)) ? undefined : val });
                }}
                className="w-full bg-[#111111] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444] font-mono"
              />
            </div>

            {/* Real-Time Time Perception (是否开启真实时间感知) */}
            <div className="flex items-center justify-between p-3 bg-[#111111] border border-[#222222] rounded-2xl">
              <div className="space-y-0.5 pr-2">
                <span className="text-[11px] font-bold text-white">开启真实时间感知</span>
                <p className="text-[9px] text-[#666666]">AI将动态获知当下的物理时间流逝并融入作息</p>
              </div>
              <input
                type="checkbox"
                checked={character.enableRealTimePerception || false}
                onChange={(e) => onUpdateCharacterOverride?.(character.id, { enableRealTimePerception: e.target.checked })}
                className="w-4 h-4 accent-white rounded border-[#222222] bg-[#111111] focus:ring-0 cursor-pointer"
              />
            </div>

            {/* City Weather Perception (现实城市天气感知) */}
            <div className="space-y-3 p-3 bg-[#111111] border border-[#222222] rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-white">城市天气感知</span>
                  <p className="text-[9px] text-[#666666]">AI将融入指定城市的真实天气和温度</p>
                </div>
                <input
                  type="checkbox"
                  checked={character.enableWeatherPerception || false}
                  onChange={(e) => onUpdateCharacterOverride?.(character.id, { enableWeatherPerception: e.target.checked })}
                  className="w-4 h-4 accent-white rounded border-[#222222] bg-[#111111] focus:ring-0 cursor-pointer"
                />
              </div>

              {character.enableWeatherPerception && (
                <div className="space-y-2 pt-2 border-t border-neutral-800/60 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-[#555555] font-bold block">感知城市</label>
                    <input
                      type="text"
                      placeholder="例如：Beijing, 上海, London"
                      value={character.weatherCity || ""}
                      onChange={(e) => onUpdateCharacterOverride?.(character.id, { weatherCity: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#444444]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-[#555555] font-bold block">城市别名 / 昵称</label>
                    <input
                      type="text"
                      placeholder="例如：帝都、魔都、圣彼得、新伦敦"
                      value={character.weatherCityNickname || ""}
                      onChange={(e) => onUpdateCharacterOverride?.(character.id, { weatherCityNickname: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#444444]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bound world books list */}
            <div className="space-y-2 pb-4">
              <span className="text-[9px] uppercase tracking-widest text-[#666666] font-bold flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-[#666666]" />
                手动绑定世界书
              </span>
              {lores.length === 0 ? (
                <p className="text-[10px] text-[#444444] italic">当前世界书没有条目，可在世界书选项中添加</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 no-scrollbar">
                  {lores.map((lore) => {
                    const isBound = character.boundLoreIds?.includes(lore.id) || false;
                    return (
                      <button
                        key={lore.id}
                        type="button"
                        onClick={() => {
                          const currentBound = character.boundLoreIds || [];
                          const updatedBound = isBound
                            ? currentBound.filter((id) => id !== lore.id)
                            : [...currentBound, lore.id];
                          onUpdateCharacterOverride?.(character.id, { boundLoreIds: updatedBound });
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-[11px] flex justify-between items-center transition-all ${
                          isBound
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                            : "bg-[#111111] border-[#222222] text-[#888888] hover:border-[#333333] hover:text-[#aaaaaa]"
                        }`}
                      >
                        <span className="font-medium truncate max-w-[140px]">{lore.title}</span>
                        <span className="text-[9px] opacity-80 shrink-0">{isBound ? "已绑定" : "未绑定"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delete Chat Options at the very bottom */}
            <div className="pt-4 border-t border-[#222222] space-y-3 pb-6">
              <span className="text-[9px] uppercase tracking-widest text-rose-500 font-bold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                聊天内容管理
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    if (confirm(`确定要清空与 ${character.name} 的“今天”所有聊天记录吗？此操作无法撤销。`)) {
                      onClearTodayChat?.();
                    }
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-rose-950/40 bg-rose-950/10 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 transition-all text-[11px] font-bold uppercase tracking-wider flex items-center justify-between"
                >
                  <span>删除当天所有聊天内容</span>
                  <span className="text-[9px] opacity-80">当天</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`确定要清空与 ${character.name} 的“所有”聊天记录吗？此操作无法撤销。`)) {
                      onClearChat?.();
                    }
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-red-950/50 bg-red-950/20 hover:bg-red-950/30 text-red-400 hover:text-red-300 transition-all text-[11px] font-bold uppercase tracking-wider flex items-center justify-between"
                >
                  <span>删除所有聊天内容</span>
                  <span className="text-[9px] opacity-80">全部</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message View Panel */}
        <div className="flex-1 flex flex-col justify-between min-h-0 bg-[#0A0A0A]">
          
          {/* Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
            {messages.length === 0 ? (
              <div className="py-12 px-4 text-center max-w-sm mx-auto space-y-4">
                <div className={`w-14 h-14 mx-auto rounded-3xl bg-gradient-to-br ${character.color} flex items-center justify-center text-3xl shadow-md overflow-hidden`}>
                  {character.avatar.startsWith("data:image/") || character.avatar.startsWith("http") ? (
                    <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    character.avatar
                  )}
                </div>
                <div className="space-y-2 bg-[#111111] p-5 rounded-3xl border border-[#222222]">
                  <p className="text-[10px] text-white font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    已建立加密会话连接
                  </p>
                  <p className="text-[11px] text-[#666666] leading-relaxed">
                    正在与 <strong>{character.name}</strong> 连线。讨论相关事件或词汇时，将动态唤醒世界书对应的背景设定。
                  </p>
                </div>
                <div className="text-left p-4 rounded-2xl bg-[#111111]/40 border border-[#222222] text-xs text-[#888888] italic leading-relaxed relative">
                  <span className="absolute -top-1.5 left-4 bg-[#0A0A0A] px-1.5 text-[9px] text-[#444444] font-bold uppercase tracking-wider not-italic">开场白</span>
                  “{character.introMessage}”
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "user";
                const isEditingThis = editingMsgId === msg.id;

                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1 relative`}>
                    
                    {/* Time or custom info */}
                    <span className="text-[9px] text-[#444444] px-2 font-mono uppercase">{msg.timestamp}</span>

                    {/* Chat bubble body */}
                    <div className="flex items-start gap-2.5 max-w-[85%] relative group">
                      {!isUser && (
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${character.color} flex items-center justify-center text-sm shadow shrink-0 mt-0.5 overflow-hidden`}>
                          {character.avatar.startsWith("data:image/") || character.avatar.startsWith("http") ? (
                            <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                          ) : (
                            character.avatar
                          )}
                        </div>
                      )}

                      <div className="flex flex-col space-y-1.5 relative">
                        {/* Interactive Message Bubble with hold listener */}
                        <div
                          onMouseDown={() => handlePressStart(msg.id)}
                          onMouseUp={handlePressEnd}
                          onMouseLeave={handlePressEnd}
                          onTouchStart={() => handlePressStart(msg.id)}
                          onTouchEnd={handlePressEnd}
                          className={`px-4 py-2.5 rounded-3xl text-xs leading-relaxed break-words whitespace-pre-wrap flex flex-col select-none relative cursor-pointer active:scale-[0.99] transition-transform ${
                            isUser
                              ? "bg-white text-black rounded-tr-none font-medium"
                              : "bg-[#111111] text-[#F2F2F2] border border-[#222222] rounded-tl-none"
                          }`}
                        >
                          {/* Render Image attachment if present */}
                          {msg.image && (
                            <div className="mb-2 max-w-[200px] rounded-xl overflow-hidden border border-[#222222]">
                              <img src={msg.image} alt="Attachment" className="w-full object-cover rounded-xl" />
                            </div>
                          )}

                          {isEditingThis ? (
                            <div className="space-y-2 p-1 min-w-[200px]">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full bg-[#1A1A1A] text-white border border-[#333333] rounded-lg p-2 text-xs focus:outline-none focus:border-[#555555] resize-none"
                                rows={2}
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingMsgId(null)}
                                  className="px-2 py-1 bg-neutral-800 text-gray-400 rounded text-[10px]"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => handleSaveEditedMessage(msg.id)}
                                  className="px-2 py-1 bg-white text-black rounded text-[10px] font-bold"
                                >
                                  保存
                                </button>
                              </div>
                            </div>
                          ) : (
                            renderMessageContent(msg)
                          )}
                        </div>

                        {/* Fast click helper for recall/edit options menu */}
                        <button
                          onClick={() => setActiveMenuMsgId(activeMenuMsgId === msg.id ? null : msg.id)}
                          className="absolute -right-2 top-0 translate-x-full opacity-0 group-hover:opacity-100 p-1 bg-[#1A1A1A] hover:bg-neutral-800 border border-[#222222] rounded-full text-[#666666] hover:text-white transition-opacity hidden md:block"
                          title="管理信息"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>

                        {/* Interactive Menu Dialog */}
                        {activeMenuMsgId === msg.id && (
                          <div className={`absolute bottom-full mb-1 z-50 bg-[#161616] border border-[#222222] p-1.5 rounded-2xl shadow-xl flex items-center space-x-1 animate-in fade-in zoom-in-95 duration-150 ${
                            isUser ? "right-0" : "left-0"
                          }`}>
                            <button
                              onClick={() => handleStartEditMessage(msg)}
                              className="px-2.5 py-1.5 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-3 h-3 text-emerald-400" />
                              修改
                            </button>
                            <div className="w-[1px] h-3.5 bg-neutral-800"></div>
                            <button
                              onClick={() => handleRecallMessage(msg.id)}
                              className="px-2.5 py-1.5 hover:bg-neutral-800 text-rose-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-400" />
                              撤回
                            </button>
                            <div className="w-[1px] h-3.5 bg-neutral-800"></div>
                            <button
                              onClick={() => setActiveMenuMsgId(null)}
                              className="p-1 hover:bg-neutral-800 text-gray-500 hover:text-white rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Triggered world book indicators under bubble */}
                        {msg.matchedLores && msg.matchedLores.length > 0 && (
                          <div className={`flex flex-wrap gap-1 ${isUser ? "justify-end" : "justify-start"}`}>
                            {msg.matchedLores.map((loreName, idx) => (
                              <div
                                key={idx}
                                className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#111111] text-[#888888] border border-[#222222] flex items-center gap-1 font-semibold cursor-help"
                                title="该设定已作为上下文同步至AI记忆"
                              >
                                <BookOpen className="w-2.5 h-2.5" />
                                已唤醒设定：{loreName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Generating Response State */}
            {isGenerating && (
              <div className="flex items-start gap-2.5 max-w-[80%] animate-pulse">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${character.color} flex items-center justify-center text-sm shadow shrink-0 mt-0.5 overflow-hidden`}>
                  {character.avatar.startsWith("data:image/") || character.avatar.startsWith("http") ? (
                    <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    character.avatar
                  )}
                </div>
                <div className="flex flex-col space-y-1.5">
                  <span className="text-[9px] text-[#444444] px-2 font-mono uppercase">正在检索设定与上下文...</span>
                  <div className="px-4 py-2.5 rounded-3xl bg-[#111111] border border-[#222222] rounded-tl-none text-xs text-[#888888] flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    <span className="text-[10px] text-[#666666] ml-1 font-mono uppercase tracking-widest">AI 正在思考中...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt banner to tell user how to long press */}
          <div className="px-6 py-1 bg-[#111111]/30 text-center select-none shrink-0 text-[9px] text-[#444444] font-mono tracking-widest uppercase">
            💡 提示：按住或点击气泡可以「撤回」或「修改」发送的内容
          </div>

          {/* Bottom input section with quick-reply suggestions */}
          <div className="border-t border-[#222222] bg-[#0A0A0A] p-4 space-y-4 shrink-0 relative">
            
            {/* Sticker selector drawer */}
            {isStickerPanelOpen && (
              <div className="absolute bottom-full left-0 right-0 p-4 bg-[#111111]/95 backdrop-blur-md border-t border-[#222222] rounded-t-3xl z-40 animate-in slide-in-from-bottom duration-200 max-h-[300px] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-white">表情包 (Stickers)</span>
                    <span className="text-[7px] text-[#555555]">💡 长按任意表情可以弹出删除确认框</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="custom-sticker-upload-input"
                      multiple
                      className="hidden"
                      onChange={handleCustomStickerUpload}
                    />
                    <label
                      htmlFor="custom-sticker-upload-input"
                      className="cursor-pointer text-[8px] uppercase tracking-widest px-2 py-1 rounded-full border border-neutral-700 bg-neutral-900 text-white font-bold hover:bg-white hover:text-black hover:border-transparent transition-all flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" /> 批量上传
                    </label>

                    <button
                      onClick={() => setIsStickerPanelOpen(false)}
                      className="text-[9px] uppercase text-[#666666] hover:text-white"
                    >
                      关闭 ✕
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {(() => {
                    const combined = [
                      ...stickers.map((s) => ({ ...s, isExclusive: false })),
                      ...(character?.stickers || []).map((s) => ({
                        name: s.name,
                        emoji: "🌸",
                        isCustom: true,
                        image: s.image,
                        isExclusive: true
                      }))
                    ];

                    return combined.map((st, idx) => {
                      const onStart = () => {
                        isStickerLongPressedRef.current = false;
                        stickerPressTimerRef.current = setTimeout(() => {
                          isStickerLongPressedRef.current = true;
                          setStickerToDelete({ name: st.name, isExclusive: !!st.isExclusive });
                        }, 800);
                      };

                      const onEnd = () => {
                        if (stickerPressTimerRef.current) {
                          clearTimeout(stickerPressTimerRef.current);
                          stickerPressTimerRef.current = null;
                        }
                      };

                      const onClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (isStickerLongPressedRef.current) {
                          isStickerLongPressedRef.current = false;
                          return;
                        }
                        handleSendSticker(st);
                      };

                      return (
                        <div
                          key={`${st.name}-${idx}`}
                          className="relative group/sticker"
                        >
                          <button
                            onMouseDown={onStart}
                            onMouseUp={onEnd}
                            onMouseLeave={onEnd}
                            onTouchStart={onStart}
                            onTouchEnd={onEnd}
                            onClick={onClick}
                            className="w-full p-2.5 rounded-2xl bg-[#0A0A0A] hover:bg-[#161616] border border-[#222222] hover:border-[#333333] transition-all flex flex-col items-center gap-1 active:scale-95 text-center justify-center min-h-[72px] relative select-none cursor-pointer"
                          >
                            {st.image ? (
                              <img src={st.image} alt={st.name} className="w-10 h-10 object-contain rounded-lg pointer-events-none" />
                            ) : (
                              <span className="text-2xl pointer-events-none">{st.emoji}</span>
                            )}
                            <span className="text-[8px] text-[#888888] font-medium truncate max-w-full pointer-events-none">{st.name}</span>
                            
                            {st.isExclusive && (
                              <span className="absolute top-1 left-1 text-[6px] px-1 py-0.2 rounded bg-pink-500/20 text-pink-400 border border-pink-500/30 scale-90 origin-top-left">
                                专属
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Text input row */}
            <div className="flex items-center space-x-2">
              {/* Image Upload Input (Hidden) */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                id="photo-attachment-input"
                className="hidden"
                disabled={isGenerating}
              />
              <label
                htmlFor="photo-attachment-input"
                className="w-10 h-10 rounded-2xl bg-[#111111] hover:bg-[#161616] text-[#888888] hover:text-white transition-all flex items-center justify-center border border-[#222222] cursor-pointer shrink-0 active:scale-95"
                title="发送图片"
              >
                <Image className="w-4 h-4" />
              </label>

              {/* Sticker Toggle Button */}
              <button
                onClick={() => setIsStickerPanelOpen(!isStickerPanelOpen)}
                disabled={isGenerating}
                className={`w-10 h-10 rounded-2xl bg-[#111111] hover:bg-[#161616] transition-all flex items-center justify-center border border-[#222222] shrink-0 active:scale-95 ${
                  isStickerPanelOpen ? "text-white bg-neutral-800" : "text-[#888888] hover:text-white"
                }`}
                title="发送表情包"
              >
                <Smile className="w-4 h-4" />
              </button>

              <div className="relative flex-1">
                <textarea
                  placeholder={
                    isGenerating
                      ? "AI 正在分析设定中..."
                      : `跟 ${character.name} 聊点什么吧...`
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isGenerating}
                  rows={1}
                  className="w-full pl-4 pr-12 py-3 rounded-2xl bg-[#0A0A0A] border border-[#222222] text-xs font-sans text-white placeholder-[#444444] focus:outline-none focus:border-[#444444] resize-none max-h-16 leading-relaxed disabled:opacity-50"
                />
                
                {/* Embedded Matching Indicator icon */}
                {inputText.trim() && (
                  <div className="absolute right-4 bottom-3">
                    {lores
                      .filter((l) => l.isActive)
                      .some((l) => l.keywords.some((kw) => inputText.toLowerCase().includes(kw.toLowerCase()))) ? (
                      <BookOpen className="w-3.5 h-3.5 text-amber-500 animate-pulse" title="World book terms matched" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* 5. Eye Response Trigger (小眼睛) placed exactly between input text box and send plane button! */}
              <button
                onClick={onTriggerAiReply}
                disabled={isGenerating || messages.length === 0}
                className="w-10 h-10 rounded-2xl bg-[#111111] hover:bg-[#161616] border border-[#222222] text-emerald-400 hover:text-emerald-300 disabled:text-[#444444] transition-all flex items-center justify-center shrink-0 active:scale-95 relative"
                title="按一下AI就会回复 (Click to trigger AI response)"
              >
                <Eye className="w-4 h-4 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500"></span>
              </button>

              {/* Send plane button */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isGenerating}
                className="w-10 h-10 rounded-2xl bg-white hover:bg-[#F2F2F2] disabled:bg-[#111111] disabled:text-[#444444] text-black transition-colors flex items-center justify-center shrink-0 border border-[#222222]"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Sticker deletion confirmation dialog */}
      {stickerToDelete && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#111111] border border-[#222222] rounded-3xl p-5 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <p className="text-xs text-white font-medium leading-relaxed">
              是否删除表情包 “{stickerToDelete.name}” ？
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setStickerToDelete(null)}
                className="px-4 py-1.5 rounded-xl bg-neutral-900 border border-[#222222] text-[#888888] hover:text-white text-[10px] uppercase tracking-wider font-bold transition-all"
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleDeleteSticker(stickerToDelete.name, stickerToDelete.isExclusive);
                  setStickerToDelete(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white text-[10px] uppercase tracking-wider font-bold transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
