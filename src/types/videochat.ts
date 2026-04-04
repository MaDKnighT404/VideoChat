export interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  users: string[];
}

export interface ReadyToCallPayload {
  roomId: string;
  initiator: boolean;
  partnerName: string;
}

export interface AudioDataPayload {
  audio: ArrayBuffer;
  sampleRate: number;
}
