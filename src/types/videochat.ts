export interface RoomParticipant {
  id: string;
  username: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  users: RoomParticipant[];
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
