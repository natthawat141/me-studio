import type { AgentSettings } from "./agent-settings";
import type { ChatComponent } from "./chat-components";
export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  files?: string[]; // Legacy display names remain readable.
  attachmentIds?: string[];
  components?: ChatComponent[];
};
export type Project = {
  id: string;
  title: string;
  messages: Message[];
  videoId?: string;
  updatedAt: number;
  pinned?: boolean;
  archived?: boolean;
  agentSettings?: AgentSettings;
};
export type Media = {
  id: string;
  name: string;
  type: string;
  size: number;
  blob?: Blob;
  src?: string;
};
export type Settings = { autoPlay: boolean; muted: boolean };
export const defaultSettings: Settings = { autoPlay: false, muted: false };
export const demoMedia: Media[] = [
  {
    id: "greeting",
    name: "ทักทายยามเช้า.mp4",
    type: "video/mp4",
    size: 0,
    src: "/demos/greeting.mp4",
  },
  {
    id: "cartoon",
    name: "แมวกับกล่องปริศนา.mp4",
    type: "video/mp4",
    size: 0,
    src: "/demos/cartoon.mp4",
  },
];
export const seedProjects: Project[] = [
  {
    id: "welcome",
    title: "ทักทายยามเช้า",
    videoId: "greeting",
    updatedAt: 0,
    messages: [
      {
        id: "welcome-message",
        role: "assistant",
        text: "เปิดวิดีโอตัวอย่างไว้ให้แล้วทางขวา คุณสามารถนำเข้าคลิปของคุณ หรือเริ่มโปรเจกต์ใหม่ได้",
      },
    ],
  },
  {
    id: "cat",
    title: "แมวกับกล่องปริศนา",
    videoId: "cartoon",
    updatedAt: 0,
    messages: [
      {
        id: "cat-message",
        role: "assistant",
        text: "นี่คือวิดีโอตัวอย่างที่สร้างไว้ก่อนหน้า เล่นและดาวน์โหลดไฟล์ได้เลย",
      },
    ],
  },
];
export const prompts = [
  "สร้างการ์ตูนแมวไปทำงาน 30 วินาที",
  "เปลี่ยนฉากเป็นตอนกลางคืน",
  "เพิ่มเสียงบรรยายภาษาไทย",
];
