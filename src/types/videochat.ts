export type RoomCategory = "video-audio" | "audio-only" | "group-audio";

export const CATEGORY_LABELS: Record<RoomCategory, string> = {
  "video-audio": "Видео и звук",
  "audio-only": "Только звук",
  "group-audio": "Групповые",
};

export const CATEGORY_ORDER: RoomCategory[] = ["video-audio", "audio-only", "group-audio"];

export interface RoomParticipant {
  id: string;
  username: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  category: RoomCategory;
  maxUsers: number;
  userCount: number;
  users: RoomParticipant[];
}

export interface RoomInfoPayload {
  roomId: string;
  name: string;
  category: RoomCategory;
  maxUsers: number;
}

export interface ReadyToCallPayload {
  roomId: string;
  initiator: boolean;
  partnerName: string;
}

export interface ParticipantsUpdatePayload {
  roomId: string;
  participants: RoomParticipant[];
}

export interface AudioDataPayload {
  audio: ArrayBuffer;
  sampleRate: number;
}
