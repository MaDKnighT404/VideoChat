"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

const SEND_W = 1280;
const SEND_H = 720;
const FRAME_MS = 100;
const JPEG_Q = 0.6;
const AUDIO_BUF_SIZE = 4096;

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
  const [hasRemoteFrame, setHasRemoteFrame] = useState(false);
  const [remoteUiOpen, setRemoteUiOpen] = useState(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selCam, setSelCam] = useState("");
  const [selMic, setSelMic] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localDisplayRef = useRef<HTMLVideoElement>(null);
  const remoteImgRef = useRef<HTMLImageElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const frameTimerRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const captureCtxRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const playCtxRef = useRef<AudioContext | null>(null);
  const nextPlayRef = useRef(0);
  const prevBlobUrlRef = useRef("");

  const socketRef = useRef<Socket | null>(null);
  const sendingRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !username) router.replace("/");
  }, [hydrated, username, router]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      setDevices(devs);
    });
  }, []);

  const getMedia = useCallback(async (camId?: string, micId?: string) => {
    const videoC: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };
    if (camId) videoC.deviceId = { exact: camId };

    const audioC: MediaTrackConstraints | boolean = micId ? { deviceId: { exact: micId } } : true;

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: videoC,
        audio: audioC,
      });
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: videoC,
          audio: false,
        });
      } catch {
        return new MediaStream();
      }
    }
  }, []);

  const stopVideoSending = useCallback(() => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = 0;
    }
  }, []);

  const stopAudioSending = useCallback(() => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close().catch(() => {});
      captureCtxRef.current = null;
    }
  }, []);

  const stopReceiving = useCallback(() => {
    if (playCtxRef.current) {
      playCtxRef.current.close().catch(() => {});
      playCtxRef.current = null;
    }
    nextPlayRef.current = 0;
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = "";
    }
  }, []);

  const cleanup = useCallback(() => {
    stopVideoSending();
    stopAudioSending();
    stopReceiving();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, [stopVideoSending, stopAudioSending, stopReceiving]);

  const startVideoSending = useCallback(
    (socket: Socket) => {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
        canvasRef.current.width = SEND_W;
        canvasRef.current.height = SEND_H;
        canvasCtxRef.current = canvasRef.current.getContext("2d");
      }

      const cvs = canvasRef.current!;
      const ctx = canvasCtxRef.current!;

      stopVideoSending();
      frameTimerRef.current = window.setInterval(() => {
        const video = localVideoRef.current;
        if (!video || video.readyState < 2) return;
        ctx.drawImage(video, 0, 0, SEND_W, SEND_H);
        cvs.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              blob.arrayBuffer().then((buf) => {
                socket.emit("video-frame", { roomId, frame: buf });
              });
            }
          },
          "image/jpeg",
          JPEG_Q
        );
      }, FRAME_MS);
    },
    [roomId, stopVideoSending]
  );

  const startAudioSending = useCallback(
    (socket: Socket) => {
      const stream = localStreamRef.current;
      if (!stream || stream.getAudioTracks().length === 0) {
        console.log("[Audio] No audio tracks to send");
        return;
      }

      stopAudioSending();

      const actx = new AudioContext();
      captureCtxRef.current = actx;

      const source = actx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
      const processor = actx.createScriptProcessor(AUDIO_BUF_SIZE, 1, 1);
      processorNodeRef.current = processor;

      const silentGain = actx.createGain();
      silentGain.gain.value = 0;
      gainNodeRef.current = silentGain;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(actx.destination);

      const sr = actx.sampleRate;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        socket.emit("audio-data", {
          roomId,
          audio: int16.buffer,
          sampleRate: sr,
        });
      };
      console.log("[Audio] Sending started, sampleRate:", sr);
    },
    [roomId, stopAudioSending]
  );

  useEffect(() => {
    if (!hydrated || !username || initRef.current) return;
    initRef.current = true;

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    const playCtx = new AudioContext();
    playCtxRef.current = playCtx;

    async function init() {
      const stream = await getMedia();
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (localDisplayRef.current) localDisplayRef.current.srcObject = stream;

      const devs = await navigator.mediaDevices.enumerateDevices();
      setDevices(devs);

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      if (audioTracks.length > 0) {
        const label = audioTracks[0].label;
        const match = devs.find((d) => d.kind === "audioinput" && d.label === label);
        if (match) setSelMic(match.deviceId);
      }
      if (videoTracks.length > 0) {
        const label = videoTracks[0].label;
        const match = devs.find((d) => d.kind === "videoinput" && d.label === label);
        if (match) setSelCam(match.deviceId);
      }

      socket.on(
        "ready-to-call",
        ({ partnerName: partner }: { roomId: string; initiator: boolean; partnerName: string }) => {
          console.log("[Signal] ready-to-call, partner:", partner);
          setPartnerName(partner);
          setWaiting(false);
          setConnected(true);
          setHasRemoteFrame(false);
          setRemoteUiOpen(false);

          sendingRef.current = true;
          startVideoSending(socket);
          startAudioSending(socket);
        }
      );

      socket.on("video-frame", (frame: ArrayBuffer) => {
        const blob = new Blob([frame], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        const img = remoteImgRef.current;
        if (img) {
          img.src = url;
        }
        if (prevBlobUrlRef.current) {
          URL.revokeObjectURL(prevBlobUrlRef.current);
        }
        prevBlobUrlRef.current = url;
        setHasRemoteFrame(true);
      });

      socket.on(
        "audio-data",
        ({ audio, sampleRate }: { audio: ArrayBuffer; sampleRate: number }) => {
          const ctx = playCtxRef.current;
          if (!ctx) return;

          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {});
          }

          let int16: Int16Array;
          if (audio instanceof ArrayBuffer) {
            int16 = new Int16Array(audio);
          } else {
            const u8 = audio as unknown as Uint8Array;
            int16 = new Int16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2);
          }

          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
          }

          const buf = ctx.createBuffer(1, float32.length, sampleRate);
          buf.getChannelData(0).set(float32);

          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);

          const now = ctx.currentTime;
          let t = nextPlayRef.current;
          if (t < now) t = now + 0.05;
          if (t - now > 1.0) t = now + 0.05;

          src.start(t);
          nextPlayRef.current = t + buf.duration;
        }
      );

      socket.on("user-left", () => {
        console.log("[Signal] user-left");
        setConnected(false);
        setWaiting(true);
        setPartnerName("");
        setHasRemoteFrame(false);
        setRemoteUiOpen(false);
        sendingRef.current = false;
        stopVideoSending();
        stopAudioSending();
        if (prevBlobUrlRef.current) {
          URL.revokeObjectURL(prevBlobUrlRef.current);
          prevBlobUrlRef.current = "";
        }
      });

      socket.emit("join-room", { roomId, username });
      console.log("[Signal] Emitted join-room for", roomId);
    }

    init();

    return () => {
      socket.off("ready-to-call");
      socket.off("video-frame");
      socket.off("audio-data");
      socket.off("user-left");
      socket.emit("leave-room", { roomId });
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, username, roomId]);

  const switchDevice = useCallback(
    async (kind: "cam" | "mic", deviceId: string) => {
      if (kind === "cam") setSelCam(deviceId);
      else setSelMic(deviceId);

      const newCam = kind === "cam" ? deviceId : selCam;
      const newMic = kind === "mic" ? deviceId : selMic;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await getMedia(newCam, newMic);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (localDisplayRef.current) localDisplayRef.current.srcObject = stream;

      if (sendingRef.current && socketRef.current) {
        stopVideoSending();
        stopAudioSending();
        startVideoSending(socketRef.current);
        startAudioSending(socketRef.current);
      }
    },
    [
      selCam,
      selMic,
      getMedia,
      stopVideoSending,
      stopAudioSending,
      startVideoSending,
      startAudioSending,
    ]
  );

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
      setMicOn((p) => !p);
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setCamOn((p) => !p);
    }
  };

  useEffect(() => {
    const resume = () => {
      playCtxRef.current?.resume().catch(() => {});
    };
    document.addEventListener("click", resume, { once: true });
    document.addEventListener("touchstart", resume, { once: true });
    return () => {
      document.removeEventListener("click", resume);
      document.removeEventListener("touchstart", resume);
    };
  }, []);

  const cameras = devices.filter((d) => d.kind === "videoinput");
  const mics = devices.filter((d) => d.kind === "audioinput");

  const inCall = connected;

  useEffect(() => {
    if (!inCall && localDisplayRef.current && localStreamRef.current) {
      localDisplayRef.current.srcObject = localStreamRef.current;
    }
  }, [inCall]);

  const deviceSelectorsEl = (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 text-sm">
      <label className="flex items-center gap-2">
        <span className="text-slate-400">Камера:</span>
        <select
          value={selCam}
          onChange={(e) => switchDevice("cam", e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
        >
          {cameras.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Камера ${cameras.indexOf(d) + 1}`}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span className="text-slate-400">Микрофон:</span>
        <select
          value={selMic}
          onChange={(e) => switchDevice("mic", e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white outline-none focus:border-blue-500"
        >
          {mics.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Микрофон ${mics.indexOf(d) + 1}`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  const callControlsEl = (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={toggleMic}
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
          micOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"
        }`}
      >
        {micOn ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={toggleCam}
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
          camOn ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-500"
        }`}
      >
        {camOn ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={handleLeave}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 transition-all hover:bg-red-500"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
          />
        </svg>
      </button>
    </div>
  );

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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold">Комната {roomId}</h1>
              {partnerName && <p className="text-xs text-slate-400">Собеседник: {partnerName}</p>}
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

      {!inCall && (
        <div className="border-b border-slate-700 bg-slate-800/30 px-6 py-2">
          {deviceSelectorsEl}
        </div>
      )}

      {/* Always-mounted hidden video for capture (never unmounts, so startVideoSending always has a valid element) */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '1px', height: '1px' }}
      />

      <main
        className={
          inCall
            ? "relative min-h-0 flex-1 overflow-hidden bg-black"
            : "flex flex-1 flex-col items-center justify-center gap-6 p-6"
        }
      >
        {inCall ? (
          <>
            <div
              role="button"
              tabIndex={0}
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black outline-none"
              onClick={() => setRemoteUiOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setRemoteUiOpen((o) => !o);
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={remoteImgRef} alt="" className="max-h-full max-w-full object-contain" />
              {remoteUiOpen && (
                <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
              )}
              {!hasRemoteFrame && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/90">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
                      <svg
                        className="h-10 w-10 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">
                      {waiting ? "Ожидание собеседника..." : "Подключение..."}
                    </p>
                  </div>
                </div>
              )}
              {partnerName && hasRemoteFrame && !remoteUiOpen && (
                <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
                  {partnerName}
                </div>
              )}
            </div>

            {remoteUiOpen && (
              <>
                <div
                  className="absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {partnerName && (
                    <p className="mb-2 text-center text-xs text-slate-300">
                      Собеседник: {partnerName}
                    </p>
                  )}
                  {deviceSelectorsEl}
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 z-20 flex justify-center border-t border-white/10 bg-black/55 px-4 py-4 backdrop-blur-md"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {callControlsEl}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                <video
                  ref={localDisplayRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
                  {username} (Вы)
                </div>
              </div>

              <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={remoteImgRef}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                />
                {(!connected || !hasRemoteFrame) && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
                        <svg
                          className="h-10 w-10 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-500">
                        {waiting ? "Ожидание собеседника..." : "Подключение..."}
                      </p>
                    </div>
                  </div>
                )}
                {partnerName && connected && hasRemoteFrame && (
                  <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
                    {partnerName}
                  </div>
                )}
              </div>
            </div>

            {callControlsEl}
          </>
        )}
      </main>
    </div>
  );
}
