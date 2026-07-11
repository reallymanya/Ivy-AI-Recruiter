"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Bot, Briefcase, Building2, Clock3, ListChecks, LoaderCircle, Mail, Mic2, Play, Save, Sparkles, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { AgentSettings } from "@/lib/interview/agent-settings";

import { saveRecruiterSettings, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = { ok: false, message: "" };

type MurfVoice = {
  id: string;
  name: string;
  gender: string;
  description: string;
  locales: Array<{ id: string; name: string; styles: string[] }>;
};

export function SettingsForm({ settings, recruiterEmail }: { settings: AgentSettings; recruiterEmail: string }) {
  const [state, action, pending] = useActionState(saveRecruiterSettings, initialState);
  const [voices, setVoices] = useState<MurfVoice[]>([]);
  const [voiceError, setVoiceError] = useState("");
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [voiceId, setVoiceId] = useState(settings.voiceId);
  const [voiceLocale, setVoiceLocale] = useState(settings.voiceLocale);
  const [voiceStyle, setVoiceStyle] = useState(settings.voiceStyle);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.id === voiceId),
    [voiceId, voices],
  );
  const locales = selectedVoice?.locales ?? [];
  const selectedLocale = locales.find((locale) => locale.id === voiceLocale);
  const styles = selectedLocale?.styles ?? [];

  useEffect(() => {
    let active = true;

    async function loadVoices() {
      try {
        const response = await fetch("/api/settings/murf-voices");
        const payload = (await response.json()) as { voices?: MurfVoice[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load Murf voices.");
        if (active) setVoices(payload.voices ?? []);
      } catch (error) {
        if (active) setVoiceError(error instanceof Error ? error.message : "Could not load Murf voices.");
      } finally {
        if (active) setVoicesLoading(false);
      }
    }

    void loadVoices();
    return () => { active = false; };
  }, []);

  useEffect(
    () => () => {
      previewAudioRef.current?.pause();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function changeVoice(nextVoiceId: string) {
    setVoiceId(nextVoiceId);
    const voice = voices.find((item) => item.id === nextVoiceId);
    const locale = voice?.locales.find((item) => item.id === voiceLocale) ?? voice?.locales[0];
    if (locale) {
      setVoiceLocale(locale.id);
      setVoiceStyle(locale.styles.includes(voiceStyle) ? voiceStyle : locale.styles[0] ?? "Conversational");
    }
  }

  function changeLocale(nextLocale: string) {
    setVoiceLocale(nextLocale);
    const locale = locales.find((item) => item.id === nextLocale);
    setVoiceStyle(locale?.styles.includes(voiceStyle) ? voiceStyle : locale?.styles[0] ?? "Conversational");
  }

  async function previewVoice() {
    if (previewing) {
      stopPreview();
      return;
    }

    setPreviewError("");
    setPreviewing(true);
    try {
      const response = await fetch("/api/settings/murf-voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, locale: voiceLocale, style: voiceStyle }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Voice preview failed.");
      }
      const url = URL.createObjectURL(await response.blob());
      previewUrlRef.current = url;
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = stopPreview;
      audio.onerror = () => { setPreviewError("Could not play this voice preview."); stopPreview(); };
      await audio.play();
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Voice preview failed.");
      stopPreview();
    }
  }

  function stopPreview() {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewing(false);
  }

  return (
    <form action={action} className="grid gap-5">
      <div id="account" className="grid scroll-mt-24 gap-5 xl:grid-cols-2">
        <SettingsCard icon={Building2} title="Recruiter identity">
          <FormField label="Company name" description="Used in introductions and AI-generated questions.">
            <Input name="companyName" defaultValue={settings.companyName} maxLength={100} />
          </FormField>
          <FormField label="AI interviewer name" description="The name candidates hear during the interview.">
            <Input name="agentName" defaultValue={settings.agentName} maxLength={40} />
          </FormField>
        </SettingsCard>

        <SettingsCard icon={Mic2} title="Voice agent">
          <FormField label="AI voice" description="Voices available for the Falcon 2 model in your Murf account.">
            <NativeSelect className="w-full" name="voiceId" value={voiceId} onChange={(event) => changeVoice(event.target.value)}>
              {!voices.some((voice) => voice.id === voiceId) ? <NativeSelectOption value={voiceId}>{voiceId}</NativeSelectOption> : null}
              {voices.map((voice) => <NativeSelectOption key={voice.id} value={voice.id}>{voice.name}{voice.gender ? ` · ${voice.gender}` : ""}</NativeSelectOption>)}
            </NativeSelect>
            {voicesLoading ? <p className="flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle className="size-3 animate-spin" />Loading Murf voices...</p> : null}
            {voiceError ? <p className="text-xs text-amber-700">{voiceError} Your saved voice remains active.</p> : null}
            <Button type="button" variant="outline" className="w-fit" onClick={previewVoice} disabled={voicesLoading}>
              {previewing ? <Square className="size-4" /> : <Play className="size-4" />}
              {previewing ? "Stop preview" : "Preview voice"}
            </Button>
            {previewError ? <p className="text-xs text-red-600">{previewError}</p> : null}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Speaking style">
              <NativeSelect className="w-full" name="voiceStyle" value={voiceStyle} onChange={(event) => setVoiceStyle(event.target.value)}>
                {!styles.includes(voiceStyle) ? <NativeSelectOption value={voiceStyle}>{voiceStyle}</NativeSelectOption> : null}
                {styles.map((style) => <NativeSelectOption key={style} value={style}>{style}</NativeSelectOption>)}
              </NativeSelect>
            </FormField>
            <FormField label="Voice locale">
              <NativeSelect className="w-full" name="voiceLocale" value={voiceLocale} onChange={(event) => changeLocale(event.target.value)}>
                {!locales.some((locale) => locale.id === voiceLocale) ? <NativeSelectOption value={voiceLocale}>{voiceLocale}</NativeSelectOption> : null}
                {locales.map((locale) => <NativeSelectOption key={locale.id} value={locale.id}>{locale.name}</NativeSelectOption>)}
              </NativeSelect>
            </FormField>
          </div>
        </SettingsCard>
      </div>

      <div id="preferences" className="scroll-mt-24">
      <SettingsCard icon={ListChecks} title="Interview length">
        <p className="text-sm text-zinc-600">Set the target number of candidate questions for each interview category.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField name="screeningQuestionCount" label="Screening" value={settings.screeningQuestionCount} />
          <NumberField name="technicalQuestionCount" label="Technical" value={settings.technicalQuestionCount} />
          <NumberField name="hrFinalQuestionCount" label="HR final" value={settings.hrFinalQuestionCount} />
        </div>
        <NumberField name="silenceTimeoutSeconds" label="Silence timeout (seconds)" value={settings.silenceTimeoutSeconds} min={10} max={120} />
        <label className="flex items-start gap-3 rounded-md border border-zinc-200 p-4">
          <input name="allowFollowUps" type="checkbox" defaultChecked={settings.allowFollowUps} className="mt-1 size-4" />
          <span>
            <span className="block text-sm font-medium">Allow adaptive follow-up questions</span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">Ivy may probe a vague answer while staying inside the selected question limit.</span>
          </span>
        </label>
      </SettingsCard>
      </div>

      <div id="ai-settings" className="scroll-mt-24">
      <SettingsCard icon={Sparkles} title="AI prompt controls">
        <FormField label="Interview instructions" description="Add company-specific topics, tone, or questions. Job details are included automatically.">
          <Textarea name="interviewPrompt" defaultValue={settings.interviewPrompt} rows={5} placeholder="Example: Prioritize practical examples, customer empathy, and clear ownership. Avoid trick questions." />
        </FormField>
        <FormField label="Evaluation instructions" description="Guide how the final scorecard should assess candidates.">
          <Textarea name="evaluationPrompt" defaultValue={settings.evaluationPrompt} rows={5} placeholder="Example: Weight role-specific evidence above presentation style. Flag unsupported claims as concerns." />
        </FormField>
        <FormField label="Closing message" description="Spoken when an interview reaches its final question.">
          <Textarea name="closingMessage" defaultValue={settings.closingMessage} rows={3} />
        </FormField>
      </SettingsCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard icon={Mail} title="Invite emails and branding">
          <FormField label="Company logo URL" description="Displayed at the top of HTML interview invitations."><Input name="companyLogoUrl" type="url" defaultValue={settings.companyLogoUrl} placeholder="https://company.com/logo.png" /></FormField>
          <FormField label="Default subject" description="Use {{jobTitle}} to insert the role automatically."><Input name="emailSubjectTemplate" defaultValue={settings.emailSubjectTemplate} /></FormField>
          <FormField label="Default introduction"><Textarea name="emailIntro" defaultValue={settings.emailIntro} rows={3} /></FormField>
          <FormField label="Reply-to email"><Input name="replyToEmail" type="email" defaultValue={settings.replyToEmail || recruiterEmail} /></FormField>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Recruiter notifications">
          <CheckSetting name="recruiterNotifications" label="Email me when an interview completes" checked={settings.recruiterNotifications} />
          <FormField label="Notification email"><Input name="notificationEmail" type="email" defaultValue={settings.notificationEmail || recruiterEmail} /></FormField>
          <CheckSetting name="lowScoreAlerts" label="Highlight low scores in completion emails" checked={settings.lowScoreAlerts} />
          <NumberField name="lowScoreThreshold" label="Low-score threshold (%)" value={settings.lowScoreThreshold} min={0} max={100} />
        </SettingsCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard icon={Briefcase} title="New job defaults">
          <FormField label="Default location"><Input name="defaultJobLocation" defaultValue={settings.defaultJobLocation} placeholder="Remote / India" /></FormField>
          <FormField label="Default currency"><Input name="defaultJobCurrency" defaultValue={settings.defaultJobCurrency} maxLength={3} /></FormField>
          <FormField label="Default employment type"><NativeSelect className="w-full" name="defaultEmploymentType" defaultValue={settings.defaultEmploymentType}><NativeSelectOption value="Full-time">Full-time</NativeSelectOption><NativeSelectOption value="Part-time">Part-time</NativeSelectOption><NativeSelectOption value="Contract">Contract</NativeSelectOption><NativeSelectOption value="Internship">Internship</NativeSelectOption></NativeSelect></FormField>
        </SettingsCard>
        <SettingsCard icon={Clock3} title="Regional settings">
          <FormField label="Schedule timezone" description="Used for interview and completion dates throughout the dashboard."><NativeSelect className="w-full" name="timezone" defaultValue={settings.timezone}><NativeSelectOption value="Asia/Kolkata">India (Asia/Kolkata)</NativeSelectOption><NativeSelectOption value="America/New_York">US Eastern</NativeSelectOption><NativeSelectOption value="America/Los_Angeles">US Pacific</NativeSelectOption><NativeSelectOption value="Europe/London">United Kingdom</NativeSelectOption><NativeSelectOption value="UTC">UTC</NativeSelectOption></NativeSelect></FormField>
        </SettingsCard>
      </div>

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-zinc-500"}`}>{state.message || "Changes apply to newly started interviews."}</p>
        <Button type="submit" disabled={pending}><Save className="size-4" />{pending ? "Saving..." : "Save settings"}</Button>
      </div>
    </form>
  );
}

function SettingsCard({ icon: Icon, title, children }: { icon: typeof Bot; title: string; children: React.ReactNode }) {
  return <Card className="border-zinc-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4" />{title}</CardTitle></CardHeader><CardContent className="grid gap-5">{children}</CardContent></Card>;
}

function FormField({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{description ? <p className="text-xs leading-5 text-zinc-500">{description}</p> : null}{children}</div>;
}

function NumberField({ name, label, value, min = 3, max = 15 }: { name: string; label: string; value: number; min?: number; max?: number }) {
  return (
    <FormField label={`${label} questions`}>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={value}
        className="h-9 w-full rounded-lg border border-zinc-200 bg-transparent px-3 text-sm outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
      />
    </FormField>
  );
}

function CheckSetting({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return <label className="flex items-center gap-3 rounded-md border border-zinc-200 p-4 text-sm font-medium"><input name={name} type="checkbox" defaultChecked={checked} className="size-4" />{label}</label>;
}
