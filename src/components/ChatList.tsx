import React, { useState } from "react";
import { Character, ChatSession, LoreEntry } from "../types";
import { Search, MessageSquare, Compass, Plus, X, Trash2 } from "lucide-react";
import { motion } from "motion/react";

interface ChatListProps {
  characters: Character[];
  sessions: Record<string, ChatSession>;
  onSelectCharacter: (id: string) => void;
  useCustomApi: boolean;
  onAddCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  lores: LoreEntry[];
  activeMessageBoxIds: string[];
  onDeleteMessageBox: (id: string) => void;
}

export default function ChatList({
  characters,
  sessions,
  onSelectCharacter,
  useCustomApi,
  onAddCharacter,
  onDeleteCharacter,
  lores,
  activeMessageBoxIds,
  onDeleteMessageBox
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "friends">("all");
  const [swipedCharId, setSwipedCharId] = useState<string | null>(null);

  // Custom Character creation states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [newCharAvatar, setNewCharAvatar] = useState("🦊");
  const [newCharSlogan, setNewCharSlogan] = useState("");
  const [newCharPrompt, setNewCharPrompt] = useState("");
  const [newCharCategory, setNewCharCategory] = useState("自定义");
  const [newCharIntro, setNewCharIntro] = useState("");
  const [newCharAutoReply, setNewCharAutoReply] = useState("");
  const [newCharRelationship, setNewCharRelationship] = useState("");
  const [newCharBoundLoreIds, setNewCharBoundLoreIds] = useState<string[]>([]);
  const [newCharForbiddenWords, setNewCharForbiddenWords] = useState("");
  const [newCharMaxContext, setNewCharMaxContext] = useState<number | "">("");
  const [newCharEnableTimePerception, setNewCharEnableTimePerception] = useState(false);
  const [newCharEnableWeatherPerception, setNewCharEnableWeatherPerception] = useState(false);
  const [newCharWeatherCity, setNewCharWeatherCity] = useState("");
  const [newCharWeatherCityNickname, setNewCharWeatherCityNickname] = useState("");

  const filteredCharacters = characters.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slogan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "all") {
      // In the "消息" tab, only show characters that have active message boxes
      return activeMessageBoxIds.includes(c.id);
    }
    // "好友列表" tab shows all characters
    return true;
  });

  const handleSaveCharacter = () => {
    if (!newCharName.trim() || !newCharPrompt.trim()) {
      alert("请输入角色名称和核心系统指令！");
      return;
    }

    const colors = [
      "from-pink-500 to-rose-600",
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-purple-500 to-fuchsia-600",
      "from-amber-500 to-orange-600",
      "from-cyan-500 to-blue-600"
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newChar: Character = {
      id: "custom-" + Date.now(),
      name: newCharName.trim(),
      avatar: newCharAvatar,
      slogan: newCharSlogan.trim() || "神秘的自定义AI伙伴",
      systemPrompt: newCharPrompt.trim(),
      introMessage: newCharIntro.trim() || `你好！我是 ${newCharName.trim()}。很高兴今天能和你建立神经连接。`,
      category: newCharCategory,
      color: randomColor,
      autoReplyInterval: newCharAutoReply || undefined,
      relationship: newCharRelationship.trim() || undefined,
      boundLoreIds: newCharBoundLoreIds.length > 0 ? newCharBoundLoreIds : undefined,
      forbiddenWords: newCharForbiddenWords.trim() || undefined,
      maxContextLength: typeof newCharMaxContext === "number" ? newCharMaxContext : undefined,
      enableRealTimePerception: newCharEnableTimePerception,
      enableWeatherPerception: newCharEnableWeatherPerception,
      weatherCity: newCharWeatherCity || undefined,
      weatherCityNickname: newCharWeatherCityNickname.trim() || undefined
    };

    onAddCharacter(newChar);
    setIsAddModalOpen(false);

    // Reset Form
    setNewCharName("");
    setNewCharAvatar("🦊");
    setNewCharSlogan("");
    setNewCharPrompt("");
    setNewCharCategory("自定义");
    setNewCharIntro("");
    setNewCharAutoReply("");
    setNewCharRelationship("");
    setNewCharBoundLoreIds([]);
    setNewCharForbiddenWords("");
    setNewCharMaxContext("");
    setNewCharEnableTimePerception(false);
    setNewCharEnableWeatherPerception(false);
    setNewCharWeatherCity("");
    setNewCharWeatherCityNickname("");
  };

  return (
    <div id="chat-list-view" className="flex flex-col h-full bg-[#0A0A0A] text-[#F2F2F2] overflow-hidden font-sans relative">
      {/* Editorial Header */}
      <header className="px-8 pt-6 pb-4 shrink-0 bg-[#0A0A0A]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-serif font-light tracking-tighter leading-none italic text-white">
              Neuralis
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-[#888888] mt-1.5 font-medium">
              智慧伙伴 / 神经通路 / 心灵空间
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Friend Trigger Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-neutral-700 font-bold flex items-center gap-1 bg-[#161616] text-[#E5E5E5] hover:bg-white hover:text-black hover:border-transparent transition-all"
              title="手动创建一个新的自定义AI好友"
            >
              <Plus className="w-2.5 h-2.5" /> 添加AI好友
            </button>

            <span
              className={`text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 bg-[#161616] border-[#222222] text-[#888888]`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
              {useCustomApi ? "自定义 API" : "Gemini 官方"}
            </span>
          </div>
        </div>

        {/* Tab Selection (Removed "全能助手" tab, changed "虚拟人设" to "好友列表") */}
        <div className="flex space-x-1.5 mt-5 p-1 rounded-xl bg-[#111111] border border-[#222222]">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all ${
              activeTab === "all" ? "bg-[#1A1A1A] text-white border border-[#333333]" : "text-[#666666] hover:text-[#aaaaaa]"
            }`}
          >
            消息
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all ${
              activeTab === "friends" ? "bg-[#1A1A1A] text-white border border-[#333333]" : "text-[#666666] hover:text-[#aaaaaa]"
            }`}
          >
            好友列表
          </button>
        </div>
      </header>

      {/* Search Input in Editorial Style */}
      <div className="px-8 py-2 shrink-0 bg-[#0A0A0A]">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-[#555555]" />
          <input
            type="text"
            placeholder="搜索在线的AI伙伴..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111111] border border-[#222222] text-xs text-[#F2F2F2] placeholder-[#555555] focus:outline-none focus:border-[#444444] transition-colors font-mono"
          />
        </div>
      </div>

      {/* Section Header with Line Divider */}
      <div className="px-8 pt-4 pb-2 shrink-0 bg-[#0A0A0A]">
        <div className="flex justify-between items-end">
          <h2 className="text-[10px] uppercase tracking-widest font-bold text-[#888888]">
            {activeTab === "friends" ? "全部好友列表" : "消息列表"}
          </h2>
          <div className="h-[1px] flex-1 bg-[#222222] ml-4 mb-1"></div>
        </div>
      </div>

      {/* Characters List Container with Swipe-to-Delete Support */}
      <div className="flex-1 overflow-y-auto px-8 pb-24 space-y-3 bg-[#0A0A0A] no-scrollbar">
        {filteredCharacters.length === 0 ? (
          <div className="py-16 text-center bg-[#111111] rounded-3xl border border-[#222222] flex flex-col items-center justify-center space-y-2">
            <Compass className="w-6 h-6 text-[#444444]" />
            <p className="text-xs text-[#666666] font-medium tracking-wide">没有找到符合搜索条件的AI伙伴</p>
          </div>
        ) : (
          filteredCharacters.map((char) => {
            const session = sessions[char.id];
            const hasMessages = session && session.messages.length > 0;
            const lastMsg = hasMessages ? session.messages[session.messages.length - 1] : null;

            return (
              <div key={char.id} className="relative overflow-hidden rounded-3xl bg-neutral-900/40 select-none">
                
                {/* Swipe Right Background Red Delete Panel */}
                <div className="absolute inset-y-0 left-0 w-32 bg-rose-600 rounded-3xl flex items-center justify-start pl-6 z-0">
                  {activeTab === "all" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMessageBox(char.id);
                        setSwipedCharId(null);
                      }}
                      className="flex items-center gap-1.5 text-white text-[10px] font-bold font-sans uppercase tracking-widest active:scale-95"
                    >
                      <X className="w-4 h-4" />
                      删除消息框
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCharacter(char.id);
                        setSwipedCharId(null);
                      }}
                      className="flex items-center gap-1.5 text-white text-[10px] font-bold font-sans uppercase tracking-widest active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除好友
                    </button>
                  )}
                </div>

                {/* Tactile Draggable Card Component */}
                <motion.div
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 115 }}
                  dragElastic={{ left: 0.05, right: 0.15 }}
                  animate={{ x: swipedCharId === char.id ? 115 : 0 }}
                  onDragEnd={(e, info) => {
                    if (info.offset.x > 45 || info.velocity.x > 250) {
                      setSwipedCharId(char.id);
                    } else {
                      setSwipedCharId(null);
                    }
                  }}
                  className="relative z-10 bg-[#111111] border border-[#222222] rounded-3xl p-4 cursor-grab active:cursor-grabbing hover:border-[#333333] hover:bg-[#161616] flex items-center justify-between transition-colors duration-250"
                  onClick={(e) => {
                    if (swipedCharId === char.id) {
                      setSwipedCharId(null);
                      e.stopPropagation();
                      return;
                    }
                    onSelectCharacter(char.id);
                  }}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    {/* Left Avatar circle with gradient overlay */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${char.color} flex items-center justify-center text-xl shadow-md transition-transform duration-350 overflow-hidden`}>
                        {char.avatar.startsWith("data:image/") || char.avatar.startsWith("http") ? (
                          <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="filter drop-shadow-sm">{char.avatar}</span>
                        )}
                      </div>
                      {/* Small Active Dot indicator */}
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      </span>
                    </div>

                    {/* Middle Info in Elegant Layout */}
                    <div className="ml-4 flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-sm font-serif font-semibold text-[#F2F2F2] tracking-wide truncate">
                          {char.name}
                        </h3>
                        <span className="text-[9px] text-[#555555] font-mono tracking-tighter uppercase">
                          {lastMsg ? lastMsg.timestamp : "在线"}
                        </span>
                      </div>

                      <p className="text-xs text-[#888888] font-light truncate">
                        {lastMsg ? lastMsg.content : char.slogan}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.2 rounded bg-[#1C1C1C] text-[#888888] border border-[#262626]">
                          {char.category}
                        </span>
                        {char.relationship && (
                          <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.2 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                            关系: {char.relationship}
                          </span>
                        )}
                        {char.autoReplyInterval && (
                          <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            频率: {char.autoReplyInterval === "1h" ? "1小时" : char.autoReplyInterval === "3h" ? "3小时" : "6小时"}
                          </span>
                        )}
                        {hasMessages && (
                          <span className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.2 rounded bg-[#1C1C1C]/40 text-[#666666] border border-[#262626]/40 flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {session.messages.length} 轮
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Minimalistic Editorial arrow accent */}
                  <div className="ml-2 w-5 h-5 rounded-full bg-[#1A1A1A] border border-[#222222] flex items-center justify-center text-[#555555] group-hover:text-white group-hover:border-[#333333] transition-colors shrink-0">
                    <span className="text-[9px] font-mono">→</span>
                  </div>
                </motion.div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Creation Modal */}
      {isAddModalOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111111] border border-[#222222] rounded-3xl p-6 space-y-4 max-h-[90%] overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-[#222222]">
              <span className="text-xs uppercase tracking-widest font-bold text-white">创建专属AI伙伴</span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Name & Avatar selectors */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">Name (人设昵称)</label>
                  <input
                    type="text"
                    placeholder="e.g. 影之魔女"
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444]"
                  />
                </div>
                <div className="space-y-1 w-28">
                  <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold block">Avatar (头像)</label>
                  <div className="flex items-center gap-1">
                    {newCharAvatar.startsWith("data:image/") || newCharAvatar.startsWith("http") ? (
                      <img src={newCharAvatar} className="w-8 h-8 rounded-full object-cover border border-[#222222]" />
                    ) : (
                      <span className="text-xl w-8 h-8 flex items-center justify-center bg-[#0A0A0A] rounded-xl border border-[#222222]">{newCharAvatar}</span>
                    )}
                    <select
                      value={newCharAvatar.startsWith("data:image/") ? "custom" : newCharAvatar}
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          setNewCharAvatar(e.target.value);
                        }
                      }}
                      className="bg-[#0A0A0A] border border-[#222222] rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none flex-1 max-w-[64px]"
                    >
                      <option value="🦊">🦊 狐</option>
                      <option value="🦁">🦁 狮</option>
                      <option value="🐱">🐱 猫</option>
                      <option value="🐺">🐺 狼</option>
                      <option value="🐉">🐉 龙</option>
                      <option value="🤖">🤖 机</option>
                      <option value="🔮">🔮 卜</option>
                      <option value="🌸">🌸 樱</option>
                      <option value="🍷">🍷 雅</option>
                      <option value="🕶️">🕶️ 酷</option>
                      {newCharAvatar.startsWith("data:image/") && <option value="custom">🖼️ 图</option>}
                    </select>
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="new-char-avatar-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNewCharAvatar(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="new-char-avatar-upload"
                    className="cursor-pointer text-[10px] uppercase tracking-wider px-2 py-2 bg-[#1C1C1C] hover:bg-neutral-850 border border-[#222222] rounded-xl text-white inline-block h-8 font-bold text-center leading-none flex items-center justify-center"
                  >
                    相册
                  </label>
                </div>
              </div>

              {/* Relationship Field */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">与我的关系 (Relationship)</label>
                <input
                  type="text"
                  placeholder="e.g. 青梅竹马、挚友、严厉导师"
                  value={newCharRelationship}
                  onChange={(e) => setNewCharRelationship(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444]"
                />
              </div>

              {/* Auto Reply Interval Selector */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">自动回复间隔时间 (Poke Interval)</label>
                <select
                  value={newCharAutoReply}
                  onChange={(e) => setNewCharAutoReply(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">不自动回复 (手动)</option>
                  <option value="1h">1小时</option>
                  <option value="3h">3小时</option>
                  <option value="6h">6小时</option>
                </select>
              </div>

              {/* Forbidden Words (禁词约束) */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">禁词约束 (Forbidden Words - 以逗号隔开)</label>
                <input
                  type="text"
                  placeholder="e.g. 笨蛋, 讨厌 (回复中绝对不露出这些词)"
                  value={newCharForbiddenWords}
                  onChange={(e) => setNewCharForbiddenWords(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444]"
                />
              </div>

              {/* Context Limit (记忆条数) */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">上下文记忆条数 (Memory Count)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="手动填入数字，默认20条"
                  value={newCharMaxContext}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                    setNewCharMaxContext(val);
                  }}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444] font-mono"
                />
              </div>

              {/* Real-time Time perception */}
              <div className="flex items-center justify-between p-3 bg-[#0A0A0A] border border-[#222222] rounded-2xl">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-white">开启真实时间感知</span>
                  <p className="text-[9px] text-[#555555]">AI将获知现实钟表时间并作息</p>
                </div>
                <input
                  type="checkbox"
                  checked={newCharEnableTimePerception}
                  onChange={(e) => setNewCharEnableTimePerception(e.target.checked)}
                  className="w-4 h-4 accent-white rounded border-[#222222] bg-[#0A0A0A] cursor-pointer"
                />
              </div>

              {/* Weather Perception */}
              <div className="space-y-3 p-3 bg-[#0A0A0A] border border-[#222222] rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white">城市天气感知</span>
                    <p className="text-[9px] text-[#555555]">AI将融入指定城市的真实天气气候</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={newCharEnableWeatherPerception}
                    onChange={(e) => setNewCharEnableWeatherPerception(e.target.checked)}
                    className="w-4 h-4 accent-white rounded border-[#222222] bg-[#0A0A0A] cursor-pointer"
                  />
                </div>

                {newCharEnableWeatherPerception && (
                  <div className="space-y-2 pt-2 border-t border-neutral-900/60 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-[#555555] font-bold block">感知城市</label>
                      <input
                        type="text"
                        placeholder="例如：Beijing, 上海, London"
                        value={newCharWeatherCity}
                        onChange={(e) => setNewCharWeatherCity(e.target.value)}
                        className="w-full bg-[#111111] border border-[#222222] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#444444]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-widest text-[#555555] font-bold block">城市别名 / 昵称</label>
                      <input
                        type="text"
                        placeholder="例如：帝都、魔都、新伦敦"
                        value={newCharWeatherCityNickname}
                        onChange={(e) => setNewCharWeatherCityNickname(e.target.value)}
                        className="w-full bg-[#111111] border border-[#222222] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#444444]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Manual World Book bindings select */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">手动关联现有世界书</label>
                {lores.length === 0 ? (
                  <p className="text-[10px] text-[#444444] italic">当前世界书没有条目，可在世界书选项中添加</p>
                ) : (
                  <div className="flex flex-wrap gap-1 bg-[#0A0A0A] p-2 rounded-xl border border-[#222222] max-h-24 overflow-y-auto no-scrollbar">
                    {lores.map((lore) => {
                      const isSelected = newCharBoundLoreIds.includes(lore.id);
                      return (
                        <button
                          key={lore.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNewCharBoundLoreIds(newCharBoundLoreIds.filter((id) => id !== lore.id));
                            } else {
                              setNewCharBoundLoreIds([...newCharBoundLoreIds, lore.id]);
                            }
                          }}
                          className={`text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold transition-all ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                              : "bg-[#111111] border-[#222222] text-[#666666] hover:text-[#aaaaaa]"
                          }`}
                        >
                          {lore.title}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">Category (分类标签)</label>
                <select
                  value={newCharCategory}
                  onChange={(e) => setNewCharCategory(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="自定义">自定义</option>
                  <option value="全能助手">全能助手</option>
                  <option value="动漫角色">动漫角色</option>
                  <option value="赛博朋克">赛博朋克</option>
                  <option value="奇幻冒险">奇幻冒险</option>
                </select>
              </div>

              {/* Slogan input */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">Slogan (一句话标语)</label>
                <input
                  type="text"
                  placeholder="e.g. 操控暗影魔法的傲娇少女"
                  value={newCharSlogan}
                  onChange={(e) => setNewCharSlogan(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444]"
                />
              </div>

              {/* First greeting intro message */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">Intro Message (首次见面词)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 哼，是谁竟敢打扰本魔女的研究？不过既然你来了..."
                  value={newCharIntro}
                  onChange={(e) => setNewCharIntro(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444] resize-none"
                />
              </div>

              {/* System Instructions core prompt */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#666666] font-bold">对方人设 (System Prompt)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 你叫雷恩，是一个脾气傲娇、嘴硬心软的魔法学者。说话常带‘哼’、‘笨蛋’，内心温柔..."
                  value={newCharPrompt}
                  onChange={(e) => setNewCharPrompt(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#444444] resize-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl border border-[#222222] text-[#888888] hover:bg-neutral-800 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCharacter}
                  className="flex-1 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl bg-white text-black hover:bg-[#F2F2F2] transition-colors"
                >
                  确认创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
