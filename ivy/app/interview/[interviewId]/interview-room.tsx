"use client";

import {
  Camera,
  CameraOff,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InterviewDetails } from "./interview-data";

type ChatMessage = {
  id: string;
  speaker: "agent" | "candidate" | "system";
  text: string;
};

type InterviewEvaluation = {
  summary: string;
  recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
  overallScore: number;
  strengths: string[];
  risks: string[];
  rubricScores: Array<{
    criterion: string;
    score: number;
    evidence?: string;
  }>;
  nextSteps: string;
};

type NextQuestionResult = {
  shouldContinue: boolean;
  message: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "system-ready",
    speaker: "system",
    text: "Enter your full name and start the interview when you are ready.",
  },
];

type SpeechRecognitionEventResult = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionEventResult>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    webkitAudioContext?: typeof AudioContext;
  }
}

export function InterviewRoom({
  interviewDetails,
  initialCandidateName = "",
  agentName = "Ivy",
  maxQuestions = 8,
  silenceTimeoutSeconds = 30,
  closingMessage = "Thank you for your time. Your interview is now complete.",
}: {
  interviewDetails: InterviewDetails;
  initialCandidateName?: string;
  agentName?: string;
  maxQuestions?: number;
  silenceTimeoutSeconds?: number;
  closingMessage?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micLevelAnimationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const lastIvyAudioUrlRef = useRef<string | null>(null);
  const currentQuestionIndexRef = useRef(0);
  const startedAtRef = useRef<Date | null>(null);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const completionStartedRef = useRef(false);
  const [candidateName, setCandidateName] = useState(initialCandidateName);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [manualAnswer, setManualAnswer] = useState("");
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [lastIvyAudioUrl, setLastIvyAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const questions = useMemo(
    () => buildInterviewQuestions(interviewDetails, maxQuestions),
    [interviewDetails, maxQuestions],
  );
  const autoStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (micLevelAnimationRef.current) {
        cancelAnimationFrame(micLevelAnimationRef.current);
      }
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      void audioContextRef.current?.close();
      if (lastIvyAudioUrlRef.current) {
        URL.revokeObjectURL(lastIvyAudioUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!initialCandidateName.trim() || autoStartedRef.current) {
      return;
    }

    autoStartedRef.current = true;
    void startInterview(initialCandidateName);
    // startInterview intentionally runs once on room entry from the public join form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCandidateName]);

  async function startInterview(nameOverride?: string) {
    const name = (nameOverride ?? candidateName).trim();

    if (!name || isConnecting) {
      return;
    }

    setCandidateName(name);
    setIsConnecting(true);
    setMediaError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      setCameraEnabled(stream.getVideoTracks().some((track) => track.enabled));
      setMicEnabled(stream.getAudioTracks().some((track) => track.enabled));
      setIsCallEnded(false);
      setEndedAt(null);
      startedAtRef.current = new Date();
      startMicLevelMeter(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setHasStarted(true);
      addMessage(
        "system",
        `Interview started for ${name} using link ${interviewDetails.id}.`,
      );

      await speakAgentMessage(
        `Hi ${name}, welcome to your ${interviewDetails.role} interview with ${agentName}. I will ask around ${questions.length} questions, but I may adapt based on your answers. To start, please summarize your background and what makes you a strong fit for this role.`,
      );
      currentQuestionIndexRef.current = 0;
      setCurrentQuestionIndex(0);
      startListening();
    } catch {
      setMediaError("Camera and microphone permission is required to start the interview.");
    } finally {
      setIsConnecting(false);
    }
  }

  function startListening() {
    recognitionRef.current?.stop();
    setInterimTranscript("");

    const hasActiveMic =
      streamRef.current?.getAudioTracks().some((track) => track.enabled && track.readyState === "live") ??
      false;

    if (!hasActiveMic || isCallEnded) {
      setSpeechStatus("Microphone is muted or unavailable. Unmute or type your answer below.");
      return;
    }

    startAnswerRecording();

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsListening(false);
      setSpeechStatus(
        "Recording your answer. Click Stop & transcribe when you are done.",
      );
      addMessage(
        "system",
        "Browser live captions are unavailable, so Ivy will transcribe your recorded answer with Groq.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.maxAlternatives = 1;

    recognition.onaudiostart = () => {
      setSpeechStatus("Microphone connected. Start speaking your answer.");
    };

    recognition.onspeechstart = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      setSpeechStatus("I can hear speech. Keep going.");
    };

    recognition.onspeechend = () => {
      setSpeechStatus("Speech paused. Submit the captured answer or keep speaking.");
    };

    recognition.onresult = (event) => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      let finalTranscript = manualAnswer;
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);
      setManualAnswer([finalTranscript, interim].filter(Boolean).join(" ").trim());

      if (finalTranscript.trim()) {
        setSpeechStatus("Answer captured. Submit it when ready, or keep speaking to add more.");
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const reason = event?.error ? ` (${event.error})` : "";
      setSpeechStatus(
        `Live captions stopped${reason}. Recording is still active; click Stop & transcribe when done.`,
      );
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      setSpeechStatus(
        (current) => current ?? "Live captions stopped. Recording is still active.",
      );
    };

    recognitionRef.current = recognition;
    setSpeechStatus("Listening now. Speak your answer clearly.");
    setIsListening(true);

    try {
      recognition.start();
      silenceTimerRef.current = window.setTimeout(() => {
        recognition.stop();
        setSpeechStatus(`No speech detected for ${silenceTimeoutSeconds} seconds. Try again or type your answer.`);
      }, silenceTimeoutSeconds * 1000);
    } catch {
      setIsListening(false);
      setSpeechStatus("Could not start listening. Try again or type your answer below.");
    }
  }

  function startAnswerRecording() {
    const stream = streamRef.current;

    if (!stream || mediaRecorderRef.current?.state === "recording") {
      return;
    }

    if (!window.MediaRecorder) {
      setSpeechStatus("Audio recording is not supported in this browser. Please type your answer.");
      return;
    }

    const audioTracks = stream.getAudioTracks().filter((track) => track.readyState === "live");

    if (audioTracks.length === 0) {
      setSpeechStatus("No active microphone track found. Rejoin the interview or type your answer.");
      return;
    }

    recordedChunksRef.current = [];
    setRecordingSeconds(0);
    const audioOnlyStream = new MediaStream(audioTracks);
    const mimeType = getSupportedAudioMimeType();
    const recorder = mimeType
      ? new MediaRecorder(audioOnlyStream, { mimeType })
      : new MediaRecorder(audioOnlyStream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onerror = () => {
      setIsRecording(false);
      setIsListening(false);
      setSpeechStatus("Audio recorder failed. Try again or type your answer.");
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
    };

    recorder.onstop = () => {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      void transcribeRecordedAnswer();
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);
    setIsListening(true);
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);
    setSpeechStatus("Recording your answer. Click Stop & transcribe when you are done.");
  }

  function stopAnswerRecording() {
    recognitionRef.current?.stop();

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setSpeechStatus("Transcribing your answer with Groq...");
      return;
    }

    setSpeechStatus("No active recording found. Try Start speaking again.");
  }

  async function transcribeRecordedAnswer() {
    const chunks = recordedChunksRef.current;

    if (chunks.length === 0) {
      setIsListening(false);
      setSpeechStatus("No audio was captured. Check the mic level and try again.");
      return;
    }

    setIsTranscribing(true);
    setIsListening(false);

    try {
      const audioBlob = new Blob(chunks, { type: getSupportedAudioMimeType() });
      const formData = new FormData();
      formData.append("audio", audioBlob, "candidate-answer.webm");

      const response = await fetch("/api/interview/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = (await response.json()) as { text?: string };
      const text = data.text?.trim();

      if (!text) {
        setSpeechStatus("I could not detect words in that recording. Try again or type your answer.");
        return;
      }

      setManualAnswer((current) => [current, text].filter(Boolean).join(" ").trim());
      setInterimTranscript("");
      setSpeechStatus("Answer transcribed. Review it, then click Submit answer.");
    } catch {
      setSpeechStatus("Could not transcribe that recording. Try again or type your answer.");
    } finally {
      recordedChunksRef.current = [];
      setIsTranscribing(false);
    }
  }

  function startMicLevelMeter(stream: MediaStream) {
    if (micLevelAnimationRef.current) {
      cancelAnimationFrame(micLevelAnimationRef.current);
    }

    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.fftSize = 256;
    source.connect(analyser);
    audioContextRef.current = audioContext;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
      micLevelAnimationRef.current = requestAnimationFrame(tick);
    };

    tick();
  }

  async function submitCandidateAnswer(answer: string) {
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer || isAgentSpeaking || isCallEnded) {
      return;
    }

    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
    setManualAnswer("");
    setSpeechStatus(null);
    addMessage("candidate", trimmedAnswer);
    await moveToNextQuestion();
  }

  async function moveToNextQuestion() {
    if (isCallEnded) {
      return;
    }

    const nextIndex = currentQuestionIndexRef.current + 1;

    if (nextIndex >= questions.length) {
      await speakAgentMessage(
        closingMessage,
      );
      addMessage("system", "Interview complete. You can close this page now.");
      stopCallMedia();
      await completeInterview("completed");
      return;
    }

    const nextQuestion = await getAdaptiveNextQuestion(nextIndex);

    if (!nextQuestion.shouldContinue) {
      await speakAgentMessage(nextQuestion.message);
      addMessage("system", "Interview complete. You can close this page now.");
      stopCallMedia();
      await completeInterview("completed");
      return;
    }

    currentQuestionIndexRef.current = nextIndex;
    setCurrentQuestionIndex(nextIndex);
    await speakAgentMessage(nextQuestion.message);
    startListening();
  }

  async function getAdaptiveNextQuestion(turnNumber: number): Promise<NextQuestionResult> {
    setIsThinking(true);

    try {
      const response = await fetch("/api/interview/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidateName.trim(),
          interviewId: interviewDetails.id,
          role: interviewDetails.role,
          company: interviewDetails.company,
          jobDescription: interviewDetails.jobDescription,
          turnNumber,
          maxTurns: questions.length,
          transcript: messagesRef.current.map((message) => ({
            speaker: message.speaker,
            text: message.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not generate adaptive question.");
      }

      return (await response.json()) as NextQuestionResult;
    } catch {
      return {
        shouldContinue: true,
        message:
          questions[turnNumber] ??
          "Could you share one more specific example that shows your fit for this role?",
      };
    } finally {
      setIsThinking(false);
    }
  }

  async function speakAgentMessage(text: string) {
    if (isCallEnded) {
      return;
    }

    addMessage("agent", text);
    setIsAgentSpeaking(true);
    setAudioError(null);

    try {
      const response = await fetch("/api/interview/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, interviewId: interviewDetails.id }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Murf stream failed");
      }

      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (value) {
          const chunk = new ArrayBuffer(value.byteLength);
          new Uint8Array(chunk).set(value);
          chunks.push(chunk);
        }
      }

      const audioBlob = new Blob(chunks, { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (lastIvyAudioUrlRef.current) {
        URL.revokeObjectURL(lastIvyAudioUrlRef.current);
      }

      lastIvyAudioUrlRef.current = audioUrl;
      setLastIvyAudioUrl(audioUrl);
      const audio = audioRef.current;

      if (!audio) {
        throw new Error("Audio element is not ready");
      }

      audio.src = audioUrl;
      audio.load();

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          resolve();
        };
        audio.onerror = () => {
          setAudioError("Ivy voice playback failed. You can try Replay Ivy.");
          resolve();
        };
        void audio.play().catch(() => {
          setAudioError("Your browser blocked Ivy voice playback. Click Replay Ivy to hear it.");
          resolve();
        });
      });
    } catch {
      await speakWithBrowserVoice(text);
    } finally {
      setIsAgentSpeaking(false);
    }
  }

  async function replayIvyAudio() {
    if (!audioRef.current || !lastIvyAudioUrl) {
      return;
    }

    setAudioError(null);
    audioRef.current.currentTime = 0;

    try {
      await audioRef.current.play();
    } catch {
      setAudioError("Playback is still blocked. Check browser/site sound permissions.");
    }
  }

  function addMessage(speaker: ChatMessage["speaker"], text: string) {
    const message = {
      id: `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      speaker,
      text,
    };

    setMessages((current) => [
      ...current,
      message,
    ]);
    messagesRef.current = [...messagesRef.current, message];

    return message;
  }

  function toggleMute() {
    const nextEnabled = !micEnabled;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setMicEnabled(nextEnabled);

    if (!nextEnabled) {
      recognitionRef.current?.stop();
      setIsListening(false);
      addMessage("system", "Microphone muted.");
      return;
    }

    addMessage("system", "Microphone unmuted.");

    if (hasStarted && !isAgentSpeaking && !isCallEnded) {
      startListening();
    }
  }

  function toggleCamera() {
    const nextEnabled = !cameraEnabled;
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled;
    });
    setCameraEnabled(nextEnabled);
    addMessage("system", nextEnabled ? "Camera turned on." : "Camera turned off.");
  }

  async function endCall() {
    stopCallMedia();
    addMessage("system", "Call ended.");
    await completeInterview("ended_by_candidate");
  }

  function stopCallMedia() {
    recognitionRef.current?.stop();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    window.speechSynthesis?.cancel();
    if (micLevelAnimationRef.current) {
      cancelAnimationFrame(micLevelAnimationRef.current);
    }
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
    }
    void audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCallEnded(true);
    setEndedAt(new Date());
    setIsListening(false);
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsAgentSpeaking(false);
    setCameraEnabled(false);
    setMicEnabled(false);
    setMicLevel(0);
  }

  async function completeInterview(reason: "completed" | "ended_by_candidate") {
    if (isSummarizing || evaluation || completionStartedRef.current) {
      return;
    }

    completionStartedRef.current = true;
    setIsSummarizing(true);
    setSummaryError(null);

    const finalTranscript: ChatMessage[] = [
      ...messagesRef.current,
      {
        id: `system-${reason}`,
        speaker: "system",
        text:
          reason === "completed"
            ? "Interview completed normally."
            : "Interview ended by candidate.",
      },
    ];

    try {
      const response = await fetch("/api/interview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: interviewDetails.id,
          candidateName: candidateName.trim(),
          role: interviewDetails.role,
          company: interviewDetails.company,
          jobDescription: interviewDetails.jobDescription,
          transcript: finalTranscript.map((message) => ({
            speaker: message.speaker,
            text: message.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not create recruiter summary.");
      }

      const data = (await response.json()) as { evaluation: InterviewEvaluation };
      setEvaluation(data.evaluation);
      addMessage("system", "Recruiter summary created and saved when a matching session exists.");
    } catch {
      setSummaryError("Could not create the recruiter summary. Please try ending the call again.");
      completionStartedRef.current = false;
    } finally {
      setIsSummarizing(false);
    }
  }

  return (
    <section className="grid h-[calc(100vh-7rem)] min-h-[680px] w-full gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <audio ref={audioRef} preload="auto" className="hidden" />
      {isCallEnded ? (
        <InterviewCompleteScreen
          candidateName={candidateName}
          role={interviewDetails.role}
          questionsAnswered={messages.filter((message) => message.speaker === "candidate").length}
          durationLabel={formatDuration(startedAtRef.current, endedAt)}
          isSaving={isSummarizing}
          hasSaved={Boolean(evaluation)}
        />
      ) : (
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-zinc-950 text-white">
        <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-2">
          <div className="relative min-h-[260px] overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="size-full object-cover"
            />
            {!cameraEnabled ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <CameraOff className="size-10" />
                <p className="text-sm">Camera is off</p>
              </div>
            ) : null}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <Badge className="rounded-full bg-white text-zinc-950 hover:bg-white">
                {candidateName || "Candidate"}
              </Badge>
              <StatusPill active={micEnabled} activeIcon={Mic} inactiveIcon={MicOff} label="Mic" />
            </div>
          </div>

          <div className="relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-lg bg-black">
            <div
              className={cn(
                "absolute size-56 rounded-full bg-white/10 transition-transform duration-300",
                isAgentSpeaking ? "animate-ping" : "scale-75 opacity-40",
              )}
            />
            <div className="relative z-10 flex size-28 items-center justify-center rounded-full bg-white text-zinc-950 shadow-2xl">
              <Sparkles className="size-12" />
            </div>
            <div className="relative z-10 mt-6 flex h-8 items-end gap-1">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className={cn(
                    "w-2 rounded-full bg-white/80 transition-all",
                    isAgentSpeaking ? "animate-pulse" : "h-2",
                  )}
                  style={{
                    height: isAgentSpeaking ? `${14 + ((bar * 9) % 22)}px` : "8px",
                    animationDelay: `${bar * 90}ms`,
                  }}
                />
              ))}
            </div>
            <Badge className="relative z-10 mt-5 rounded-full bg-white text-zinc-950 hover:bg-white">
              {isAgentSpeaking ? "Ivy is speaking" : isListening ? "Listening to you" : "Ivy"}
            </Badge>
          </div>
        </div>

        <div className="border-t border-white/10 bg-zinc-900/95 p-4">
          {audioError ? (
            <div className="mb-3 flex flex-col gap-2 rounded-lg bg-white/10 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-200">{audioError}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void replayIvyAudio()}
                disabled={!lastIvyAudioUrl}
              >
                Replay Ivy
              </Button>
            </div>
          ) : null}

          {mediaError ? <p className="mb-3 text-sm text-red-200">{mediaError}</p> : null}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium">
                {isCallEnded ? "Interview ended" : isConnecting ? "Joining interview..." : "Interview in progress"}
              </p>
              <p className="text-xs text-zinc-400">
                Question {Math.min(currentQuestionIndex + 1, questions.length)} of {questions.length}
                {speechStatus ? ` · ${speechStatus}` : ""}
                {isRecording ? ` · Recording ${recordingSeconds}s` : ""}
                {isThinking ? " · Ivy is preparing the next question..." : ""}
                {isSummarizing ? " · Sending transcript to recruiter..." : ""}
                {evaluation ? " · Transcript submitted to recruiter." : ""}
                {summaryError ? " · Summary could not be created yet." : ""}
              </p>
              <div className="mt-2 flex max-w-xs items-center gap-2">
                <span className="text-xs text-zinc-500">Mic level</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => startListening()}
                disabled={!hasStarted || isAgentSpeaking || isThinking || isCallEnded || !micEnabled || isRecording || isTranscribing}
              >
                {isTranscribing ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
                {isTranscribing ? "Transcribing" : isRecording ? "Recording" : "Start speaking"}
              </Button>
              {isRecording ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => stopAnswerRecording()}
                >
                  Stop & transcribe
                </Button>
              ) : null}
              <Button type="button" variant="secondary" onClick={toggleMute} disabled={isCallEnded}>
                {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                {micEnabled ? "Mute" : "Unmute"}
              </Button>
              <Button type="button" variant="secondary" onClick={toggleCamera} disabled={isCallEnded}>
                {cameraEnabled ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
                {cameraEnabled ? "Camera off" : "Camera on"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void endCall()}
                disabled={isCallEnded || isSummarizing}
              >
                <PhoneOff className="size-4" />
                Cut call
              </Button>
            </div>
          </div>

          {hasStarted && !isCallEnded && !evaluation ? (
            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void submitCandidateAnswer(manualAnswer);
              }}
            >
              <div className="min-w-0 flex-1">
                {interimTranscript ? (
                  <p className="mb-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-zinc-200">
                    Heard so far: {interimTranscript}
                  </p>
                ) : null}
                <Textarea
                  value={manualAnswer}
                  onChange={(event) => setManualAnswer(event.target.value)}
                  placeholder="If speech misses you, type your answer here."
                  rows={2}
                  disabled={isAgentSpeaking || isThinking || isTranscribing}
                  className="border-white/10 bg-white text-zinc-950"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={!manualAnswer.trim() || isAgentSpeaking || isThinking || isTranscribing}
              >
                Submit answer
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      )}

      <aside className="flex min-h-0 flex-col rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5" />
            <p className="font-semibold">Live transcript</p>
          </div>
          <p className="mt-1 text-sm text-zinc-500">AI and candidate speech appears here.</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm leading-6",
                message.speaker === "agent" && "bg-zinc-950 text-white",
                message.speaker === "candidate" && "ml-8 bg-zinc-100 text-zinc-950",
                message.speaker === "system" && "bg-white text-zinc-500 ring-1 ring-zinc-200",
              )}
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wide opacity-70">
                {message.speaker === "agent"
                  ? "Ivy"
                  : message.speaker === "candidate"
                    ? candidateName || "Candidate"
                    : "System"}
              </p>
              <p>{message.text}</p>
            </div>
          ))}
          {interimTranscript ? (
            <div className="ml-8 rounded-lg bg-zinc-100 px-3 py-2 text-sm leading-6 text-zinc-500">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide">Listening</p>
              <p>{interimTranscript}</p>
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}

function InterviewCompleteScreen({
  candidateName,
  role,
  questionsAnswered,
  durationLabel,
  isSaving,
  hasSaved,
}: {
  candidateName: string;
  role: string;
  questionsAnswered: number;
  durationLabel: string;
  isSaving: boolean;
  hasSaved: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-col items-center justify-center rounded-xl bg-zinc-950 px-6 py-10 text-center text-white">
      <div className="flex size-24 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30">
        <CheckCircle2 className="size-11" />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Interview Complete!</h1>
      <p className="mt-3 text-base text-zinc-300">
        Thank you, <span className="font-medium text-white">{candidateName}</span>.
      </p>
      <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
        Your interview for the {role} position has been recorded. The hiring team will review your
        responses and get back to you with next steps.
      </p>

      <div className="mt-9 grid grid-cols-2 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/5">
        <div className="px-10 py-5">
          <p className="text-3xl font-semibold">{questionsAnswered}</p>
          <p className="mt-1 text-xs text-zinc-400">Questions answered</p>
        </div>
        <div className="px-10 py-5">
          <p className="text-3xl font-semibold">{durationLabel}</p>
          <p className="mt-1 text-xs text-zinc-400">Duration</p>
        </div>
      </div>

      <div className="mt-8 w-full max-w-xl rounded-xl border border-white/10 bg-white/5 p-5 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          What happens next?
        </p>
        <div className="mt-4 space-y-3 text-sm text-zinc-200">
          {[
            "Our team will review your interview responses.",
            "You will receive an email with the next steps.",
            "Expect to hear back within 2-5 business days.",
          ].map((item, index) => (
            <div key={item} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">
                {index + 1}
              </span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-7 flex items-center gap-2 text-xs text-zinc-500">
        {isSaving ? <Loader2 className="size-3 animate-spin" /> : null}
        {isSaving
          ? "Saving your interview for the recruiter..."
          : hasSaved
            ? "Your interview has been submitted to the recruiter."
            : "Your transcript will be available to the recruiter."}
      </p>
    </div>
  );
}

function StatusPill({
  active,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  label,
}: {
  active: boolean;
  activeIcon: ComponentType<{ className?: string }>;
  inactiveIcon: ComponentType<{ className?: string }>;
  label: string;
}) {
  const Icon = active ? ActiveIcon : InactiveIcon;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-zinc-950">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

function formatDuration(startedAt: Date | null, endedAt: Date | null) {
  if (!startedAt || !endedAt) {
    return "0s";
  }

  const totalSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function getSupportedAudioMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

async function speakWithBrowserVoice(text: string) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function buildInterviewQuestions(details: InterviewDetails, maxQuestions: number) {
  const baseQuestions = [
    `To start, please summarize your background and what makes you a strong fit for the ${details.role} role.`,
    `This role involves ${details.jobDescription}. Which part of that work have you done before, and what was your direct contribution?`,
    "Tell me about a project where you had to understand users, define a problem, and turn that into a practical solution.",
    "Describe a time you worked with engineering, product, or business stakeholders. How did you handle tradeoffs or disagreement?",
    "Walk me through one accomplishment you are proud of. What changed because of your work?",
    "What tools, processes, or habits help you produce high-quality work under deadlines?",
    "Tell me about a time something did not go as planned. What did you learn and what would you do differently now?",
    `Why are you interested in ${details.company}, and what questions would you want the recruiting team to answer next?`,
  ];

  return Array.from({ length: maxQuestions }, (_, index) =>
    baseQuestions[index] ??
    "Please share another role-relevant example that demonstrates your judgment, ownership, and impact.",
  );
}
