"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { getSocket } from "@/lib/socket";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const { username, hydrate } = useUserStore();

  const [hydrated, setHydrated] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const initRef = useRef(false);
  const candidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDesc = useRef(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !username) {
      router.replace("/");
    }
  }, [hydrated, username, router]);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    hasRemoteDesc.current = false;
    candidateBuffer.current = [];
  }, []);

  useEffect(() => {
    if (!hydrated || !username || initRef.current) return;
    initRef.current = true;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function createPeerConnection(): RTCPeerConnection {
      if (pcRef.current) {
        pcRef.current.close();
      }
      hasRemoteDesc.current = false;
      candidateBuffer.current = [];

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            roomId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[WebRTC] connectionState:", state);
        if (state === "connected") {
          setConnected(true);
          setWaiting(false);
        }
        if (state === "disconnected" || state === "failed" || state === "closed") {
          setConnected(false);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] iceConnectionState:", pc.iceConnectionState);
      };

      return pc;
    }

    async function flushCandidates() {
      const pc = pcRef.current;
      if (!pc || !hasRemoteDesc.current) return;
      for (const c of candidateBuffer.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.warn("[WebRTC] Failed to add buffered candidate:", e);
        }
      }
      candidateBuffer.current = [];
    }

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          localStreamRef.current = stream;
        } catch {
          localStreamRef.current = new MediaStream();
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    async function init() {
      await startMedia();

      socket.on(
        "ready-to-call",
        async ({
          initiator,
          partnerName: partner,
        }: {
          roomId: string;
          initiator: boolean;
          partnerName: string;
        }) => {
          console.log("[Signal] ready-to-call, initiator:", initiator, "partner:", partner);
          setPartnerName(partner);
          setWaiting(false);

          const pc = createPeerConnection();

          if (initiator) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("offer", { roomId, offer: pc.localDescription });
              console.log("[Signal] Sent offer");
            } catch (e) {
              console.error("[WebRTC] Failed to create offer:", e);
            }
          }
        }
      );

      socket.on(
        "offer",
        async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
          console.log("[Signal] Received offer");
          let pc = pcRef.current;
          if (!pc) {
            pc = createPeerConnection();
          }
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            hasRemoteDesc.current = true;
            await flushCandidates();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", { roomId, answer: pc.localDescription });
            console.log("[Signal] Sent answer");
          } catch (e) {
            console.error("[WebRTC] Failed to handle offer:", e);
          }
        }
      );

      socket.on(
        "answer",
        async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          console.log("[Signal] Received answer");
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            hasRemoteDesc.current = true;
            await flushCandidates();
          } catch (e) {
            console.error("[WebRTC] Failed to handle answer:", e);
          }
        }
      );

      socket.on(
        "ice-candidate",
        async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (!hasRemoteDesc.current) {
            candidateBuffer.current.push(candidate);
            return;
          }
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("[WebRTC] Failed to add ICE candidate:", e);
          }
        }
      );

      socket.on("user-left", () => {
        console.log("[Signal] user-left");
        setConnected(false);
        setWaiting(true);
        setPartnerName("");
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        hasRemoteDesc.current = false;
        candidateBuffer.current = [];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      });

      // Register listeners FIRST, then join room
      socket.emit("join-room", { roomId, username });
      console.log("[Signal] Emitted join-room for", roomId);
    }

    init();

    return () => {
      socket.off("ready-to-call");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
      socket.emit("leave-room", { roomId });
      cleanup();
    };
  }, [hydrated, username, roomId, cleanup]);

  const handleLeave = () => {
    const socket = getSocket();
    socket.emit("leave-room", { roomId });
    cleanup();
    router.push("/rooms");
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setMicOn((prev) => !prev);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setCamOn((prev) => !prev);
    }
  };

  if (!hydrated || !username) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLeave}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 transition-all hover:border-slate-500 hover:bg-slate-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold">Комната {roomId}</h1>
              {partnerName && (
                <p className="text-xs text-slate-400">Собеседник: {partnerName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Подключено
              </span>
            )}
            {!connected && !waiting && (
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                Подключение...
              </span>
            )}
            {waiting && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Ожидание...
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
              {username} (Вы)
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            {connected ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
                    <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">
                    {waiting ? "Ожидание собеседника..." : "Подключение..."}
                  </p>
                </div>
              </div>
            )}
            {partnerName && connected && (
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
                {partnerName}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleMic}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              micOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {micOn ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleCam}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              camOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {camOn ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </button>

          <button
            onClick={handleLeave}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 transition-all hover:bg-red-500"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}
