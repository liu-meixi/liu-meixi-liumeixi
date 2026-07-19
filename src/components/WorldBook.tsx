import React, { useState } from "react";
import { LoreEntry } from "../types";
import { BookOpen, Search, Plus, Trash2, Edit3, Check, X, Sparkles, AlertCircle, Layers } from "lucide-react";

interface WorldBookProps {
  lores: LoreEntry[];
  onLoresChange: (lores: LoreEntry[]) => void;
  onResetDefaultLores: () => void;
}

export default function WorldBook({ lores, onLoresChange, onResetDefaultLores }: WorldBookProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit/Add Form states
  const [formTitle, setFormTitle] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formContent, setFormContent] = useState("");

  // Test Trigger Playground state
  const [testSentence, setTestSentence] = useState("");

  const handleToggleActive = (id: string) => {
    const updated = lores.map((l) => (l.id === id ? { ...l, isActive: !l.isActive } : l));
    onLoresChange(updated);
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm("确定要删除这条世界设定吗？")) {
      onLoresChange(lores.filter((l) => l.id !== id));
    }
  };

  const startEdit = (lore: LoreEntry) => {
    setEditingId(lore.id);
    setFormTitle(lore.title);
    setFormKeywords(lore.keywords.join(", "));
    setFormContent(lore.content);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormTitle("");
    setFormKeywords("");
    setFormContent("");
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const saveForm = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert("设定标题和描述内容不能为空哦！");
      return;
    }

    // Split and clean keywords
    const keywordsArray = formKeywords
      .split(/[,，]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywordsArray.length === 0) {
      alert("请至少填写一个触发词，便于系统扫描匹配！");
      return;
    }

    if (isAdding) {
      const newEntry: LoreEntry = {
        id: "custom-" + Date.now(),
        title: formTitle.trim(),
        keywords: keywordsArray,
        content: formContent.trim(),
        isActive: true
      };
      onLoresChange([newEntry, ...lores]);
      setIsAdding(false);
    } else if (editingId) {
      const updated = lores.map((l) =>
        l.id === editingId
          ? {
              ...l,
              title: formTitle.trim(),
              keywords: keywordsArray,
              content: formContent.trim()
            }
          : l
      );
      onLoresChange(updated);
      setEditingId(null);
    }
  };

  const addPresetPackage = (pack: "magic" | "sci_fi") => {
    let presets: LoreEntry[] = [];
    if (pack === "magic") {
      presets = [
        {
          id: "preset-m1",
          title: "星尘结晶",
          keywords: ["结晶", "水晶", "星尘"],
          content: "星尘结晶是在彗星掠过阿尔卡迪亚上空时落下的稀有矿石。研磨成粉后加入魔药中，可以发出微弱的星光，并使魔药的效力翻倍，但散发着一种淡淡的草莓糖果香气。",
          isActive: true
        },
        {
          id: "preset-m2",
          title: "占星誓约",
          keywords: ["占星", "誓约", "仪式", "命运"],
          content: "皇家占星师之间古老的誓约仪式。通过在纯净的水晶球前点燃星辰草，能够让两个人的命运轨迹暂时产生强烈的引力共鸣，让其中一方能够梦见另一方的未来碎片。",
          isActive: true
        }
      ];
    } else {
      presets = [
        {
          id: "preset-s1",
          title: "深网骇客特工",
          keywords: ["特工", "极客", "深网", "骇客"],
          content: "深网中的神秘AI组织‘九头蛇’。他们负责在底层网络中巡逻，清除那些违规觉醒自我意识的AI程序，手持电磁脉冲武器，行事利落，说话带着固定的机器音。",
          isActive: true
        },
        {
          id: "preset-s2",
          title: "超梦脑机芯片",
          keywords: ["超梦", "芯片", "脑机"],
          content: "超梦脑机芯片（BD-99）可以通过额头皮下接口读取他人的真实情感与视觉记录。由于容易产生强烈成瘾性并在黑市流行，大公司表面上严加禁止，暗中却赚取暴利。",
          isActive: true
        }
      ];
    }

    // Filter duplicates
    const filteredPresets = presets.filter(p => !lores.some(existing => existing.title === p.title));
    if (filteredPresets.length === 0) {
      alert("这套预设设定已经全部存在了喵！");
      return;
    }

    onLoresChange([...lores, ...filteredPresets]);
  };

  // Scan matching lore cards for trigger playground
  const testTriggeredLores = lores.filter((lore) => {
    if (!lore.isActive || !testSentence.trim()) return false;
    return lore.keywords.some((keyword) =>
      testSentence.toLowerCase().includes(keyword.toLowerCase())
    );
  });

  const filteredLores = lores.filter((lore) =>
    lore.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lore.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="world-book-view" className="flex flex-col h-full bg-[#0A0A0A] text-[#F2F2F2] overflow-hidden font-sans">
      {/* World Book Editorial Header */}
      <div className="px-8 pt-6 pb-4 bg-[#0A0A0A] flex justify-between items-start shrink-0">
        <div>
          <h1 className="text-4xl font-serif font-light tracking-tighter leading-none italic text-white flex items-center gap-2">
            世界设定书
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-[#888888] mt-1.5 font-medium">
            世界观 / 动态记忆 / 上下文设定
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={startAdd}
            className="px-3 py-1.5 rounded-lg bg-[#161616] border border-[#222222] hover:border-[#333333] hover:bg-[#1A1A1A] text-white transition-all duration-300 flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold"
          >
            <Plus className="w-3 h-3" />
            添加设定卡
          </button>
        )}
      </div>

      {/* Editor or List */}
      {isAdding || editingId ? (
        <div className="flex-1 overflow-y-auto px-8 pb-24 space-y-4">
          <div className="p-5 bg-[#111111] rounded-3xl border border-[#222222] space-y-4">
            <h3 className="text-sm font-serif italic text-white flex items-center gap-1.5 border-b border-[#222222] pb-3">
              <Layers className="w-4 h-4 text-[#888888]" />
              {isAdding ? "创建世界设定卡" : "编辑世界设定卡"}
            </h3>

            {/* Title input */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-[#666666] font-semibold block">卡片标题 (Card Title)</label>
              <input
                type="text"
                placeholder="例如: 星尘结晶"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222222] rounded-lg px-3 py-2 text-xs font-mono text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
              />
            </div>

            {/* Keywords input */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-[#666666] font-semibold block flex items-center justify-between">
                <span>触发词/关键字 (用英文或中文逗号分隔)</span>
                <span className="text-[9px] text-[#444444] font-mono normal-case">用于在对话时自动激活</span>
              </label>
              <input
                type="text"
                placeholder="例如: 结晶, 水晶, 星尘"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222222] rounded-lg px-3 py-2 text-xs font-mono text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
              />
            </div>

            {/* Content description */}
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase tracking-widest text-[#666666] font-semibold block">设定详情 / 背景描述 (Description)</label>
              <textarea
                placeholder="在此输入世界设定详细信息，当触发词在对话中出现时，此段设定将作为常识背景输入给AI..."
                rows={5}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222222] rounded-lg px-3 py-2 text-xs text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 justify-end pt-2 border-t border-[#222222]">
              <button
                onClick={cancelForm}
                className="px-3.5 py-1.5 rounded-lg border border-[#222222] hover:bg-[#1C1C1C] transition-colors text-[10px] uppercase tracking-wider font-bold text-[#666666]"
              >
                取消
              </button>
              <button
                onClick={saveForm}
                className="px-4 py-1.5 rounded-lg bg-white hover:bg-white/90 text-black transition-colors text-[10px] uppercase tracking-wider font-bold shadow-md"
              >
                保存设定卡
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Package Import Bar */}
          <div className="px-8 py-3.5 border-y border-[#222222] bg-[#111111]/40 flex items-center justify-between shrink-0">
            <span className="text-[9px] uppercase tracking-widest text-[#888888] font-bold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              预设模板包 (Presets)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => addPresetPackage("magic")}
                className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md bg-[#161616] hover:bg-[#1F1F1F] border border-[#222222] text-[#888888] transition-all"
              >
                奇幻魔法
              </button>
              <button
                onClick={() => addPresetPackage("sci_fi")}
                className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md bg-[#161616] hover:bg-[#1F1F1F] border border-[#222222] text-[#888888] transition-all"
              >
                科幻赛博
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="px-8 py-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#555555]" />
              <input
                type="text"
                placeholder="搜索世界设定卡..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#111111] border border-[#222222] text-xs text-[#F2F2F2] placeholder-[#555555] focus:outline-none focus:border-[#444444] transition-colors font-mono"
              />
            </div>
          </div>

          {/* Trigger testing playground */}
          <div className="px-8 mb-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-[#111111] border border-[#222222] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#888888] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500/70" />
                  触发词在线匹配测试
                </span>
                {testTriggeredLores.length > 0 ? (
                  <span className="text-[9px] text-[#A7F3D0] bg-[#064E3B]/40 px-2.5 py-0.5 rounded-full border border-[#047857]/40 font-mono tracking-wider">
                    已捕获 {testTriggeredLores.length}
                  </span>
                ) : (
                  <span className="text-[9px] text-[#555555] font-mono">待机检测中</span>
                )}
              </div>
              <input
                type="text"
                placeholder="在此输入任意测试文本，模拟匹配对应触发词..."
                value={testSentence}
                onChange={(e) => setTestSentence(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#222222] rounded-lg text-xs text-[#F2F2F2] placeholder-[#444444] focus:outline-none font-mono"
              />
              {testTriggeredLores.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {testTriggeredLores.map((l) => (
                    <span
                      key={l.id}
                      className="text-[9px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-[#064E3B]/20 text-[#A7F3D0] border border-[#047857]/30 flex items-center gap-1"
                    >
                      ✦ {l.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section Divider */}
          <div className="px-8 py-2 shrink-0 bg-[#0A0A0A]">
            <div className="flex justify-between items-end">
              <h2 className="text-[10px] uppercase tracking-widest font-bold text-[#888888]">本地设定档案</h2>
              <div className="h-[1px] flex-1 bg-[#222222] ml-4 mb-1"></div>
            </div>
          </div>

          {/* Lore cards List */}
          <div className="flex-1 overflow-y-auto px-8 pb-24 space-y-3 bg-[#0A0A0A] no-scrollbar">
            {filteredLores.length === 0 ? (
              <div className="py-12 text-center bg-[#111111] rounded-3xl border border-[#222222]">
                <p className="text-xs text-[#555555] tracking-wider uppercase font-mono">没有找到符合条件的设定卡</p>
                <button
                  onClick={onResetDefaultLores}
                  className="mt-4 px-3.5 py-2 rounded-lg bg-[#161616] border border-[#222222] text-[10px] uppercase tracking-widest font-bold text-white hover:bg-[#1E1E1E] transition-colors"
                >
                  恢复默认预设设定
                </button>
              </div>
            ) : (
              filteredLores.map((lore) => {
                const isTriggeredInPlayground = testSentence.trim() && lore.isActive && lore.keywords.some((k) =>
                  testSentence.toLowerCase().includes(k.toLowerCase())
                );

                return (
                  <div
                    key={lore.id}
                    className={`p-4 bg-[#111111] rounded-3xl transition-all duration-350 border ${
                      isTriggeredInPlayground
                        ? "border-[#34D399]/40 bg-[#064E3B]/5 scale-[1.01]"
                        : lore.isActive
                        ? "border-[#222222]"
                        : "border-[#1A1A1A] opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-base font-serif italic font-semibold ${lore.isActive ? "text-white" : "text-[#555555]"}`}>
                            {lore.title}
                          </span>
                          {!lore.isActive && (
                            <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.2 rounded bg-[#0A0A0A] border border-[#222222] text-[#444444]">
                              已禁用
                            </span>
                          )}
                          {isTriggeredInPlayground && (
                            <span className="text-[9px] uppercase tracking-widest font-mono px-2 py-0.2 rounded bg-[#064E3B]/40 border border-[#34D399]/40 text-[#34D399] animate-pulse">
                              已触发
                            </span>
                          )}
                        </div>

                        {/* Keyword list */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {lore.keywords.map((k, idx) => (
                            <span
                              key={idx}
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${
                                lore.isActive
                                  ? isTriggeredInPlayground && testSentence.toLowerCase().includes(k.toLowerCase())
                                    ? "bg-[#064E3B]/40 text-[#34D399] border border-[#047857]"
                                    : "bg-[#0A0A0A] text-[#888888] border border-[#222222]"
                                  : "bg-[#0A0A0A] text-[#444444] border border-[#1A1A1A]"
                              }`}
                            >
                              #{k}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right toggle switcher styled beautifully */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleToggleActive(lore.id)}
                          className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                            lore.isActive ? "bg-[#333333]" : "bg-[#161616]"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white transition duration-250 ease-in-out ${
                              lore.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Content body */}
                    <p className={`text-xs mt-3.5 leading-relaxed border-t border-[#1C1C1C] pt-3 font-light ${lore.isActive ? "text-[#C8C8C8]" : "text-[#555555]"}`}>
                      {lore.content}
                    </p>

                    {/* Lower editing commands */}
                    <div className="flex justify-end gap-3.5 mt-3.5 border-t border-[#1C1C1C] pt-2.5 text-[10px] uppercase tracking-wider font-mono text-[#555555]">
                      <button
                        onClick={() => startEdit(lore)}
                        className="hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(lore.id)}
                        className="hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

