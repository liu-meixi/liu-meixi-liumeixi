export interface Character {
  id: string;
  name: string;
  avatar: string;
  slogan: string;
  systemPrompt: string;
  introMessage: string;
  category: string;
  color: string;
  autoReplyInterval?: string; // 可选 "1h", "3h", "6h"
  relationship?: string;      // 与我的关系
  boundLoreIds?: string[];    // 关联的世界书设定ID
  forbiddenWords?: string;          // 禁词约束，逗号隔开
  maxContextLength?: number;        // 上下文记忆条数
  enableRealTimePerception?: boolean; // 开启真实时间感知
  enableWeatherPerception?: boolean;  // 开启现实城市天气感知
  weatherCity?: string;             // 现实天气城市
  weatherCityNickname?: string;     // 城市昵称
  stickers?: { name: string; image: string }[]; // 专属表情
  isOfflineMode?: boolean;         // 线下模式 (神态紫色，对话粉色)
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  matchedLores?: string[]; // Triggers showing which World Book entries were active for this message!
  image?: string;          // Base64 data URL or uploaded photo link
}

export interface ChatSession {
  characterId: string;
  messages: Message[];
  lastUpdated: string;
}

export interface LoreEntry {
  id: string;
  title: string;
  keywords: string[]; // List of trigger words
  content: string;
  isActive: boolean;
}

export interface ApiConfig {
  useCustomApi: boolean;
  customUrl: string;
  customKey: string;
  customModel: string;
}

export interface CoupleDiaryReply {
  text: string;
  sticker?: { name: string; image: string };
  timestamp: string;
}

export interface CoupleDiary {
  id: string;
  date: string; // YYYY-MM-DD
  myDiaryContent?: string;
  myDiaryTimestamp?: string;
  aiReplyToMe?: CoupleDiaryReply;
  aiDiaryContent?: string;
  aiDiaryTimestamp?: string;
  myReplyToAi?: CoupleDiaryReply;
}

export interface CoupleSpaceConfig {
  boundCharacterId?: string;
  daysTogether?: number;
  daysTogetherBaseDate?: string; // ISO String
}

