import React, { useState } from "react";
import { ApiConfig } from "../types";
import { Key, Globe, Cpu, CheckCircle2, AlertTriangle, Eye, EyeOff, Sparkles, RefreshCw, Smartphone } from "lucide-react";

interface SettingsProps {
  config: ApiConfig;
  onConfigChange: (config: ApiConfig) => void;
  onClearHistory: () => void;
}

export default function Settings({ config, onConfigChange, onClearHistory }: SettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleExportData = () => {
    try {
      const data = {
        world_book_lores: localStorage.getItem("world_book_lores") ? JSON.parse(localStorage.getItem("world_book_lores")!) : [],
        api_config: localStorage.getItem("api_config") ? JSON.parse(localStorage.getItem("api_config")!) : null,
        chat_sessions: localStorage.getItem("chat_sessions") ? JSON.parse(localStorage.getItem("chat_sessions")!) : {},
        custom_characters: localStorage.getItem("custom_characters") ? JSON.parse(localStorage.getItem("custom_characters")!) : [],
        user_profile: localStorage.getItem("user_profile") ? JSON.parse(localStorage.getItem("user_profile")!) : null,
        custom_stickers: localStorage.getItem("custom_stickers") ? JSON.parse(localStorage.getItem("custom_stickers")!) : []
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neuralis_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("备份导出失败：" + e);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.world_book_lores) {
          localStorage.setItem("world_book_lores", JSON.stringify(parsed.world_book_lores));
        }
        if (parsed.api_config) {
          localStorage.setItem("api_config", JSON.stringify(parsed.api_config));
        }
        if (parsed.chat_sessions) {
          localStorage.setItem("chat_sessions", JSON.stringify(parsed.chat_sessions));
        }
        if (parsed.custom_characters) {
          localStorage.setItem("custom_characters", JSON.stringify(parsed.custom_characters));
        }
        if (parsed.user_profile) {
          localStorage.setItem("user_profile", JSON.stringify(parsed.user_profile));
        }
        if (parsed.custom_stickers) {
          localStorage.setItem("custom_stickers", JSON.stringify(parsed.custom_stickers));
        }
        alert("数据导入成功！即将刷新应用同步更改。");
        window.location.reload();
      } catch (err) {
        alert("导入失败，文件格式有误或已损坏。");
      }
    };
    reader.readAsText(file);
  };

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("user_profile");
      return saved ? JSON.parse(saved) : { name: "星旅者", avatar: "🧑‍🚀", lore: "探索无尽星空与数码边界的心灵漫游者" };
    } catch {
      return { name: "星旅者", avatar: "🧑‍🚀", lore: "探索无尽星空与数码边界的心灵漫游者" };
    }
  });

  const saveProfile = (updated: typeof userProfile) => {
    setUserProfile(updated);
    localStorage.setItem("user_profile", JSON.stringify(updated));
  };

  const updateConfig = (fields: Partial<ApiConfig>) => {
    onConfigChange({ ...config, ...fields });
  };

  const applyPreset = (provider: "deepseek" | "openai" | "gemini_custom" | "openrouter") => {
    switch (provider) {
      case "deepseek":
        updateConfig({
          customUrl: "https://api.deepseek.com/v1",
          customModel: "deepseek-chat",
          useCustomApi: true
        });
        break;
      case "openai":
        updateConfig({
          customUrl: "https://api.openai.com/v1",
          customModel: "gpt-4o-mini",
          useCustomApi: true
        });
        break;
      case "gemini_custom":
        updateConfig({
          customUrl: "https://generativelanguage.googleapis.com/v1beta",
          customModel: "gemini-2.5-flash",
          useCustomApi: true
        });
        break;
      case "openrouter":
        updateConfig({
          customUrl: "https://openrouter.ai/api/v1",
          customModel: "google/gemini-2.5-flash",
          useCustomApi: true
        });
        break;
    }
  };

  const testConnection = async () => {
    setTestStatus("testing");
    setTestMessage("Testing endpoint handshakes...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
          systemInstruction: "You are a test agent. Answer with exactly 'OK'.",
          useCustomApi: config.useCustomApi,
          customUrl: config.customUrl,
          customKey: config.customKey,
          customModel: config.customModel
        })
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        setTestStatus("success");
        setTestMessage(`Handshake success: "${data.reply || "No reply"}"`);
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "Connection refused. Verify your token or URL.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(err.message || "Network error. Please try again.");
    }
  };

  return (
    <div id="settings-view" className="flex flex-col h-full bg-[#0A0A0A] text-[#F2F2F2] overflow-y-auto no-scrollbar font-sans">
      {/* Settings Editorial Header */}
      <div className="px-8 pt-6 pb-4 bg-[#0A0A0A] shrink-0">
        <h1 className="text-4xl font-serif font-light tracking-tighter leading-none italic text-white">
          系统设置
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-[#888888] mt-1.5 font-medium">
          功能配置 / API 端点 / 界面人设管理
        </p>
      </div>

      <div className="px-8 pb-24 space-y-6">
        {/* API Engine Selection Card */}
        <div className="p-5 rounded-3xl bg-[#111111] border border-[#222222] space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">自定义模型 API 接口</span>
              <span className="text-[10px] text-[#666666] block mt-0.5">启用外部第三方推理端点</span>
            </div>
            <button
              onClick={() => updateConfig({ useCustomApi: !config.useCustomApi })}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                config.useCustomApi ? "bg-white" : "bg-[#222222]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full transition duration-250 ease-in-out ${
                  config.useCustomApi ? "translate-x-4 bg-black" : "translate-x-0 bg-white"
                }`}
              />
            </button>
          </div>

          {!config.useCustomApi && (
            <div className="p-3.5 bg-[#161616] border border-[#222222] rounded-2xl text-xs text-[#888888] flex items-start gap-2 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500/70" />
              <span>
                <strong>默认免配通道</strong> — 已配置官方专享 Gemini 模型，零门槛开箱即用，无需任何 API Key 设置。
              </span>
            </div>
          )}
        </div>

        {/* User Persona Settings Card */}
        <div className="p-5 rounded-3xl bg-[#111111] border border-[#222222] space-y-4">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">我的人设档案</span>
            <span className="text-[10px] text-[#666666] block mt-0.5">在此定制您的昵称、头像和背景人设，AI聊天时会代入此设定</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] uppercase tracking-widest text-[#555555] font-semibold block">My Nickname (我的昵称)</label>
                <input
                  type="text"
                  placeholder="e.g. 观测者"
                  value={userProfile.name}
                  onChange={(e) => saveProfile({ ...userProfile, name: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
                />
              </div>

              <div className="space-y-1 flex-1">
                <label className="text-[9px] uppercase tracking-widest text-[#555555] font-semibold block">My Avatar (我的头像)</label>
                <div className="flex gap-2 items-center">
                  {userProfile.avatar.startsWith("data:image/") || userProfile.avatar.startsWith("http") ? (
                    <img src={userProfile.avatar} className="w-8 h-8 rounded-full object-cover border border-[#222222]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm border border-[#222222]">
                      {userProfile.avatar}
                    </div>
                  )}
                  <select
                    value={userProfile.avatar.startsWith("data:image/") ? "custom" : userProfile.avatar}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        saveProfile({ ...userProfile, avatar: e.target.value });
                      }
                    }}
                    className="bg-[#0A0A0A] border border-[#222222] rounded-xl px-2 py-1.5 text-xs text-[#F2F2F2] focus:outline-none flex-1"
                  >
                    <option value="🧑‍🚀">🧑‍🚀 宇航员</option>
                    <option value="🧚">🧚 妖精</option>
                    <option value="🐈">🐈 猫咪</option>
                    <option value="🦊">🦊 狐狸</option>
                    <option value="⚡">⚡ 极客</option>
                    <option value="🔮">🔮 术士</option>
                    <option value="🌸">🌸 樱花</option>
                    <option value="👑">👑 王冠</option>
                    <option value="🍷">🍷 优雅</option>
                    <option value="🕶️">🕶️ 墨镜</option>
                    {userProfile.avatar.startsWith("data:image/") && <option value="custom">🖼️ 自定义图片</option>}
                  </select>

                  <input
                    type="file"
                    accept="image/*"
                    id="settings-avatar-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          saveProfile({ ...userProfile, avatar: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="settings-avatar-upload"
                    className="cursor-pointer text-[10px] uppercase tracking-wider px-2.5 py-1.5 bg-[#1C1C1C] hover:bg-neutral-800 border border-[#222222] rounded-xl text-[#F2F2F2] h-8 font-semibold flex items-center justify-center"
                  >
                    相册
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-[#555555] font-semibold block">人设描述与背景关系设定</label>
              <textarea
                placeholder="输入你的性格、背景秘密、与AI各角色的关系设定，让AI在聊天中能够记住并匹配你的身份..."
                rows={3}
                value={userProfile.lore}
                onChange={(e) => saveProfile({ ...userProfile, lore: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#222222] rounded-xl px-3 py-2 text-xs text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors resize-none font-sans"
              />
            </div>
          </div>
        </div>

        {/* Custom Configuration Panel */}
        <div className={`space-y-4 transition-all duration-350 ${config.useCustomApi ? "opacity-100" : "opacity-40"}`}>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-[#888888]">API 接口端点配置</h2>
            <div className="h-[1px] flex-1 bg-[#222222] ml-4 mb-1"></div>
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => applyPreset("deepseek")}
              className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl bg-[#111111] hover:bg-[#161616] border border-[#222222] text-left transition-colors flex items-center justify-between text-[#888888]"
            >
              <span>DeepSeek</span>
              <span className="text-[9px] text-blue-400 font-mono font-normal">v1</span>
            </button>
            <button
              onClick={() => applyPreset("openai")}
              className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl bg-[#111111] hover:bg-[#161616] border border-[#222222] text-left transition-colors flex items-center justify-between text-[#888888]"
            >
              <span>OpenAI</span>
              <span className="text-[9px] text-green-400 font-mono font-normal">GPT</span>
            </button>
            <button
              onClick={() => applyPreset("gemini_custom")}
              className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl bg-[#111111] hover:bg-[#161616] border border-[#222222] text-left transition-colors flex items-center justify-between text-[#888888]"
            >
              <span>Gemini Key</span>
              <span className="text-[9px] text-purple-400 font-mono font-normal">Key</span>
            </button>
            <button
              onClick={() => applyPreset("openrouter")}
              className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold rounded-xl bg-[#111111] hover:bg-[#161616] border border-[#222222] text-left transition-colors flex items-center justify-between text-[#888888]"
            >
              <span>OpenRouter</span>
              <span className="text-[9px] text-amber-400 font-mono font-normal">Proxy</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Base URL */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-[#666666] font-semibold block">接口基础路径 (Base URL)</label>
              <input
                type="text"
                placeholder="例如: https://api.openai.com/v1"
                value={config.customUrl}
                onChange={(e) => updateConfig({ customUrl: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#222222] rounded-lg px-3 py-2 text-xs font-mono text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
                disabled={!config.useCustomApi}
              />
            </div>

            {/* API Key */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-[#666666] font-semibold block flex items-center justify-between">
                <span>接口密钥 (API Key / Access Token)</span>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[#444444] hover:text-[#888888] transition-colors normal-case font-mono text-[9px]"
                  disabled={!config.useCustomApi}
                >
                  {showKey ? "隐藏" : "显示"}
                </button>
              </label>
              <input
                type={showKey ? "text" : "password"}
                placeholder="sk-•••••••••••••"
                value={config.customKey}
                onChange={(e) => updateConfig({ customKey: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#222222] rounded-lg px-3 py-2 text-xs font-mono text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
                disabled={!config.useCustomApi}
              />
            </div>

            {/* Model name */}
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-[#666666] font-semibold block">模型 ID (Model ID)</label>
              <input
                type="text"
                placeholder="例如: gpt-4o-mini 或 deepseek-chat"
                value={config.customModel}
                onChange={(e) => updateConfig({ customModel: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-[#222222] rounded-lg px-3 py-2 text-xs font-mono text-[#F2F2F2] placeholder-[#444444] focus:outline-none focus:border-[#444444] transition-colors"
                disabled={!config.useCustomApi}
              />
            </div>
          </div>
        </div>

        {/* Diagnostic Test Button */}
        <div className="pt-4 border-t border-[#222222]">
          <button
            onClick={testConnection}
            disabled={testStatus === "testing"}
            className="w-full py-2.5 rounded-xl bg-[#161616] hover:bg-[#1A1A1A] border border-[#222222] text-[10px] uppercase tracking-wider font-bold text-white transition-all duration-300 flex items-center justify-center gap-2"
          >
            {testStatus === "testing" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            测试连接状态 (Test Handshake)
          </button>

          {/* Diagnostic Display Area */}
          {testStatus !== "idle" && (
            <div
              className={`mt-3.5 p-3.5 rounded-2xl border text-xs space-y-1.5 leading-relaxed font-mono ${
                testStatus === "testing"
                  ? "bg-[#111111] border-[#222222] text-[#888888]"
                  : testStatus === "success"
                  ? "bg-[#064E3B]/10 border-[#047857]/40 text-[#A7F3D0]"
                  : "bg-[#881337]/10 border-[#BE123C]/40 text-[#FDA4AF]"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider">
                {testStatus === "testing" && <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />}
                {testStatus === "success" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {testStatus === "error" && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                <span>
                  {testStatus === "testing" && "正在握手测试中..."}
                  {testStatus === "success" && "测试成功：连接正常"}
                  {testStatus === "error" && "测试失败：连接中断"}
                </span>
              </div>
              <p className="text-[10px] leading-relaxed opacity-90 break-all">{testMessage}</p>
            </div>
          )}
        </div>

        {/* 数据导入导出与维护 */}
        <div className="pt-4 border-t border-[#222222] space-y-4">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#888888]">数据备份与维护</h3>
          
          {/* Export and Import Global Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleExportData}
              className="py-2.5 rounded-xl bg-[#111111] hover:bg-neutral-800 border border-[#222222] text-[10px] uppercase tracking-wider font-bold text-[#F2F2F2] flex items-center justify-center gap-2"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              全局导出备份
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                id="import-backup-file-input"
                className="hidden"
                onChange={handleImportData}
              />
              <label
                htmlFor="import-backup-file-input"
                className="w-full py-2.5 rounded-xl bg-[#111111] hover:bg-neutral-800 border border-[#222222] text-[10px] uppercase tracking-wider font-bold text-[#F2F2F2] flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <Cpu className="w-3.5 h-3.5 text-green-400" />
                全局导入备份
              </label>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#111111] border border-[#222222] flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">清空会话与缓存</span>
              <span className="text-[10px] text-[#666666] block mt-0.5">重置应用并清理所有本地数据</span>
            </div>
            <button
              onClick={() => {
                if (window.confirm("确定要清空所有的聊天记录和世界书设定吗？此操作无法撤销。")) {
                  onClearHistory();
                }
              }}
              className="px-3.5 py-1.5 rounded-lg border border-rose-950 hover:bg-rose-950/20 text-[10px] uppercase tracking-wider font-bold text-rose-400 transition-colors"
            >
              一键清空
            </button>
          </div>
        </div>

        {/* Minimalist Editorial Frame footer */}
        <div className="py-4 text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#444444] font-mono">
            系统就绪 / 专属加密传输信道
          </p>
        </div>
      </div>
    </div>
  );
}

