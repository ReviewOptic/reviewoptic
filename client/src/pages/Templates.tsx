import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Edit2, Save, X, FileText, Mail, MessageSquare, Video, Mic, StopCircle, RotateCcw, CheckCircle2, Sparkles, Upload, Plus, Trash2, ChevronDown, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Template } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

const MERGE_TAGS = ["{{first_name}}", "{{customer_name}}", "{{business_name}}", "{{service_type}}"];

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5 text-green-500" />,
};

function AudioRecorder({ currentUrl, onSaved }: { currentUrl: string; onSaved: (url: string) => void }) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "uploading">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState(currentUrl || "");
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (currentUrl) setSavedUrl(currentUrl); }, [currentUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stream.getTracks().forEach(t => t.stop());
        setState("recorded");
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      setState("recording");
    } catch {
      toast({ title: "Microphone access denied", description: "Allow microphone access to record a voice note.", variant: "destructive" });
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDuration(0);
    setState("idle");
  };

  const upload = async () => {
    if (!previewUrl) return;
    setState("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "voice-note.webm");
      const res = await fetch("/api/templates/upload-audio", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setSavedUrl(url);
      onSaved(url);
      toast({ title: "Voice note saved" });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setState("idle");
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
      setState("recorded");
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-[12.5px] flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Voice Note</Label>
        {savedUrl && state === "idle" && (
          <span className="text-[11px] text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Voice note saved</span>
        )}
      </div>

      {savedUrl && state === "idle" && (
        <audio src={savedUrl} controls className="w-full h-10" />
      )}

      {previewUrl && state === "recorded" && (
        <audio src={previewUrl} controls className="w-full h-10" />
      )}

      {state === "recording" && (
        <div className="flex items-center gap-2 text-red-500">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[12px] font-mono">Recording {fmt(duration)}</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {state === "idle" && (
          <Button size="sm" variant="outline" className="text-[12px] h-7 gap-1.5" onClick={startRecording}>
            <Mic className="w-3.5 h-3.5" /> {savedUrl ? "Re-record" : "Start Recording"}
          </Button>
        )}
        {state === "recording" && (
          <Button size="sm" variant="destructive" className="text-[12px] h-7 gap-1.5" onClick={stopRecording}>
            <StopCircle className="w-3.5 h-3.5" /> Stop
          </Button>
        )}
        {(state === "recorded" || state === "uploading") && (
          <>
            <Button size="sm" className="text-[12px] h-7 gap-1.5" onClick={upload} disabled={state === "uploading"}>
              <Save className="w-3.5 h-3.5" /> {state === "uploading" ? "Uploading..." : "Save Voice Note"}
            </Button>
            <Button size="sm" variant="outline" className="text-[12px] h-7 gap-1.5" onClick={reset} disabled={state === "uploading"}>
              <RotateCcw className="w-3.5 h-3.5" /> Retake
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function GenerateAIButton({ channel, templateType, onGenerated }: { channel: string; templateType: string; onGenerated: (body: string, subject?: string) => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channel, templateType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onGenerated(data.body, data.subject);
    } catch (err: any) {
      toast({ title: "AI generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <button type="button" onClick={generate} disabled={loading} className="flex items-center gap-1 text-[11.5px] font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors">
      {loading ? <><Sparkles className="w-3 h-3 animate-pulse" />Generating...</> : <><Sparkles className="w-3 h-3" />Generate with AI</>}
    </button>
  );
}

function RecordingPicker({ type, currentUrl, onSelect }: { type: "video" | "voice"; currentUrl: string; onSelect: (url: string) => void }) {
  const { data: recordings = [] } = useQuery<any[]>({ queryKey: ["/api/recordings"] });
  const filtered = (recordings as any[]).filter(r => r.type === type);

  if (filtered.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-border text-center space-y-1">
        <p className="text-[13px] text-muted-foreground">No {type} recordings yet.</p>
        <p className="text-[12px] text-muted-foreground">Add recordings in the <span className="font-medium">Recordings</span> tab, then come back to select one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-muted-foreground">Select a recording to attach:</p>
      {filtered.map((rec: any) => (
        <button
          key={rec.id}
          type="button"
          onClick={() => onSelect(currentUrl === rec.url ? "" : rec.url)}
          className={cn("w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
            currentUrl === rec.url ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted flex-shrink-0">
            {type === "video" ? <Video className="w-4 h-4 text-muted-foreground" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
          </div>
          <p className="flex-1 text-[13px] font-medium truncate">{rec.label || `${type} recording`}</p>
          {currentUrl === rec.url && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
        </button>
      ))}
      {currentUrl && filtered.some((r: any) => r.url === currentUrl) && (
        <div className="pt-1">
          {type === "video"
            ? <video src={currentUrl} controls className="w-full max-h-36 rounded-lg bg-black" />
            : <audio src={currentUrl} controls className="w-full h-10" />}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, onCancel, textOnly = false }: { template: Template; onCancel: () => void; textOnly?: boolean }) {
  const { toast } = useToast();
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [videoUrl, setVideoUrl] = useState(template.videoUrl || "");
  const [audioUrl, setAudioUrl] = useState(template.audioUrl || "");
  const [mode, setMode] = useState<"text" | "video" | "audio">(textOnly ? "text" : template.videoUrl ? "video" : template.audioUrl ? "audio" : "text");
  const [bodyEl, setBodyEl] = useState<HTMLTextAreaElement | null>(null);
  const { data: settings } = useQuery<{ logoUrl: string; logoPosition: string }>({ queryKey: ["/api/settings"] });
  const [logoPosition, setLogoPosition] = useState<string>(settings?.logoPosition || "left");
  const logoPosMutation = useMutation({
    mutationFn: (pos: string) => apiRequest("PATCH", "/api/settings", { logoPosition: pos }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/settings"] }),
  });

  useEffect(() => {
    if (settings?.logoPosition) setLogoPosition(settings.logoPosition);
  }, [settings?.logoPosition]);

  const mutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/templates/${template.id}`, { name: name.trim() || template.name, subject, body, videoUrl, audioUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template saved" });
      onCancel();
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const insertTag = (tag: string) => {
    if (!bodyEl) return;
    const start = bodyEl.selectionStart;
    const end = bodyEl.selectionEnd;
    const newBody = body.slice(0, start) + tag + body.slice(end);
    setBody(newBody);
    setTimeout(() => {
      bodyEl.focus();
      bodyEl.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const isResponseTemplate = template.templateType === "response_positive" || template.templateType === "response_negative";
  const isFollowUp = template.templateType?.startsWith("follow_up");
  const isCustom = template.templateType === "custom";
  const showLinkPlaceholder = isFollowUp || (isCustom && template.channel !== "email");
  const smsCharLimit = isFollowUp ? 86 : 149;
  const charCount = body.length;
  const isSmsWarning = template.channel === "sms" && !isResponseTemplate && charCount > smsCharLimit;
  const availableMergeTags = MERGE_TAGS;

  // Preview with sample data
  const preview = body
    .replace(/{{first_name}}/g, "Sarah")
    .replace(/{{customer_name}}/g, "Sarah Jones")
    .replace(/{{business_name}}/g, "Clean Pro Services")
    .replace(/{{service_type}}/g, "House Cleaning")
    .replace(/{{review_link}}/g, "https://reviewoptic.app/r/abc123");

  return (
    <div className="space-y-4">
      {/* Name field */}
      <div className="space-y-1.5">
        <Label className="text-[12.5px]">Template name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" className="text-[13px]" />
      </div>
      {/* Mode toggle — only for slots that allow media */}
      {!textOnly && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("text")}
            className={cn("flex-1 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors", mode === "text" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}
          >
            Text
          </button>
          <button
            onClick={() => setMode("video")}
            className={cn("flex-1 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors flex items-center justify-center gap-1.5", mode === "video" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}
          >
            <Video className="w-3.5 h-3.5" /> Video
          </button>
          <button
            onClick={() => setMode("audio")}
            className={cn("flex-1 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors flex items-center justify-center gap-1.5", mode === "audio" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}
          >
            <Mic className="w-3.5 h-3.5" /> Voice Note
          </button>
        </div>
      )}

      {mode === "text" && (
        <>
          {isResponseTemplate ? (
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Opening line</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Thank you so much for your rating!" className="text-[13px]" data-testid="input-template-subject" />
              <p className="text-[11.5px] text-muted-foreground">This appears as the first line in the pop-up dialogue, before your message below.</p>
            </div>
          ) : null}
          {!isResponseTemplate && template.channel === "email" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Subject Line</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." className="text-[13px]" data-testid="input-template-subject" />
              </div>
              {settings?.logoUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[12.5px] text-muted-foreground shrink-0">Logo position:</Label>
                    {[{ value: "left", label: "Top Left" }, { value: "center", label: "Top Centre" }, { value: "right", label: "Top Right" }].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setLogoPosition(opt.value); logoPosMutation.mutate(opt.value); }}
                        className={`px-3 py-1 rounded-lg border text-[12px] font-medium transition-colors ${logoPosition === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[12.5px]">Message Body</Label>
              <div className="flex items-center gap-3">
                <GenerateAIButton channel={template.channel} templateType={template.templateType} onGenerated={(b, s) => { setBody(b); if (s) setSubject(s); }} />
                <span className={cn("text-[11px] font-mono", isSmsWarning ? "text-destructive font-semibold" : "text-muted-foreground")}>
                  {charCount} chars {template.channel === "sms" && !isResponseTemplate && `(max ${smsCharLimit})`}
                </span>
              </div>
            </div>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="resize-none text-[13px] min-h-32"
              ref={el => setBodyEl(el)}
              data-testid="textarea-template-body"
            />
            {showLinkPlaceholder && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-muted/40 select-none pointer-events-none">
                <span className="text-[11px] text-muted-foreground/60 font-mono truncate">🔗 https://reviewoptic.app/review?rid=...</span>
                <span className="text-[11px] text-muted-foreground/50 italic shrink-0">added automatically</span>
              </div>
            )}
            {isSmsWarning && (
              <p className="text-[11.5px] text-destructive">⚠ Message over {smsCharLimit} characters — the rating link may not fit in one SMS</p>
            )}
          </div>
        </>
      )}

      {/* Recording pickers — select from Recordings tab */}
      {mode === "video" && <RecordingPicker type="video" currentUrl={videoUrl} onSelect={url => setVideoUrl(url)} />}
      {mode === "audio" && <RecordingPicker type="voice" currentUrl={audioUrl} onSelect={url => setAudioUrl(url)} />}
      {/* Merge tags + preview — text mode only */}
      {mode === "text" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Insert merge tags:</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableMergeTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => insertTag(tag)}
                  className="text-[11.5px] font-mono px-2 py-1 rounded bg-muted hover:bg-accent border border-border transition-colors"
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Preview (sample data):</Label>
            <div className="p-3 rounded-lg bg-white border border-border text-[12.5px] whitespace-pre-wrap text-foreground">
              {settings?.logoUrl && template.channel === "email" && !isResponseTemplate && (
                <div style={{ textAlign: logoPosition === "center" ? "center" : logoPosition === "right" ? "right" : "left" }} className="mb-3">
                  <img src={settings.logoUrl} alt="Logo" className="inline-block max-h-10 max-w-[160px] object-contain" />
                </div>
              )}
              {isResponseTemplate && subject && (
                <p className="font-medium text-foreground mb-2">{subject.replace(/{{first_name}}/g, "Sarah").replace(/{{business_name}}/g, "Clean Pro Services")}</p>
              )}
              {preview}
              {showLinkPlaceholder && (
                <p className="mt-2 text-[11px] text-muted-foreground/50 font-mono">🔗 https://reviewoptic.app/review?rid=... <span className="italic not-italic font-sans">(rating link)</span></p>
              )}
            </div>
          </div>
        </>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
        </Button>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-save-template">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {mutation.isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </div>
  );
}

const TEMPLATE_SLOTS: {
  type: string;
  label: string;
  description: string;
  textOnly: boolean;
  defaultSubject: string;
  defaultBody: string;
  defaultBodySms?: string;
  defaultBodyWa?: string;
}[] = [
  {
    type: "response_positive",
    label: "After 4-5★ Rating",
    description: "Shown to customers who give a high rating. Appears as a message in the pop-up after they rate.",
    textOnly: true,
    defaultSubject: "Thank you for your rating — {{business_name}}",
    defaultBody: "Hi {{first_name}},\n\nThank you so much for your rating! If you have a moment, we'd really appreciate it if you could share your experience with others on one of our review pages below.\n\nThanks again,\nThe {{business_name}} team",
  },
  {
    type: "response_negative",
    label: "After 1-3★ Rating",
    description: "Shown to customers who give a low rating. Appears as a message in the pop-up after they rate.",
    textOnly: true,
    defaultSubject: "We'd love to make this right — {{business_name}}",
    defaultBody: "Hi {{first_name}},\n\nThank you for your feedback — we're sorry to hear your experience didn't meet expectations. We'd love the chance to make it right.\n\nPlease reply to this message and we'll be in touch shortly.\n\nThe {{business_name}} team",
  },
  {
    type: "follow_up_1",
    label: "Follow-up 1",
    description: "First reminder sent to customers who haven't rated yet. Only sent if they haven't tapped the original link.",
    textOnly: true,
    defaultSubject: "Just checking in",
    defaultBody: "Hi {{first_name}},\n\nJust a quick follow-up — we'd love to hear how we did! Tap the link below to leave your rating.\n\nThanks,\nThe {{business_name}} team",
    defaultBodySms: "Just checking in! We'd love to hear from you — tap below:",
    defaultBodyWa: "😊 Just a quick follow-up from {{business_name}} — we'd love to hear how we did! Tap the link below to leave your rating:",
  },
  {
    type: "follow_up_2",
    label: "Follow-up 2",
    description: "Second reminder for customers who still haven't rated. Only sent if they haven't tapped the original link.",
    textOnly: true,
    defaultSubject: "A polite reminder",
    defaultBody: "Hi {{first_name}},\n\nWe know you're busy, but your feedback really means a lot to us! Tap the link below whenever you're ready.\n\nThanks,\nThe {{business_name}} team",
    defaultBodySms: "We'd still love your feedback! Tap below when you get a moment:",
    defaultBodyWa: "💛 We know you're busy, but your feedback really means a lot to {{business_name}}! Tap the link below whenever you're ready:",
  },
  {
    type: "follow_up_3",
    label: "Follow-up 3",
    description: "Final reminder for customers who still haven't rated. Only sent if they haven't tapped the original link.",
    textOnly: true,
    defaultSubject: "We'd still love to hear from you",
    defaultBody: "Hi {{first_name}},\n\nThis is our last message, we promise! If you ever have a moment, we'd still love to hear from you — tap the link below.\n\nThanks for choosing {{business_name}}.",
    defaultBodySms: "Last message from us! We'd still love your feedback — tap below:",
    defaultBodyWa: "🙏 This is our last message, we promise! If you ever have a moment, we'd still love to hear from you — tap the link below:",
  },
];


function TemplateSlot({ slot, template, channel, isReadOnly }: {
  slot: typeof TEMPLATE_SLOTS[number];
  template: Template | undefined;
  channel: string;
  isReadOnly: boolean;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [localTemplate, setLocalTemplate] = useState<Template | undefined>(undefined);
  const effectiveTemplate = template || localTemplate;
  const [testSending, setTestSending] = useState(false);

  const sendTest = async (phone?: string) => {
    if (!effectiveTemplate) return;
    if ((effectiveTemplate.channel === "sms" || effectiveTemplate.channel === "whatsapp") && !phone) {
      const entered = window.prompt(`Enter your phone number to receive the test ${effectiveTemplate.channel === "whatsapp" ? "WhatsApp" : "SMS"} (e.g. +447700900000):`);
      if (!entered?.trim()) return;
      return sendTest(entered.trim());
    }
    setTestSending(true);
    try {
      const res = await apiRequest("POST", `/api/templates/${effectiveTemplate.id}/test-send`, phone ? { phone } : {});
      const data = await res.json();
      if (res.ok) toast({ title: data.message });
      else toast({ title: data.message || "Failed to send test", variant: "destructive" });
    } catch {
      toast({ title: "Failed to send test", variant: "destructive" });
    } finally {
      setTestSending(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/templates", {
        name: slot.label,
        channel,
        templateType: slot.type,
        subject: channel === "email" ? slot.defaultSubject : "",
        body: channel === "sms" && slot.defaultBodySms
          ? slot.defaultBodySms
          : channel === "whatsapp" && slot.defaultBodyWa
            ? slot.defaultBodyWa
            : slot.defaultBody,
      });
      return res.json() as Promise<Template>;
    },
    onSuccess: (data: Template) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setLocalTemplate(data);
      setEditing(true);
    },
    onError: () => toast({ title: "Failed to set up template", variant: "destructive" }),
  });

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-[14px] font-semibold">{slot.label}</CardTitle>
            <CardDescription className="text-[12px] mt-0.5">{slot.description}</CardDescription>
          </div>
          {!editing && !isReadOnly && (
            effectiveTemplate ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => sendTest()} disabled={testSending} title="Send a test to yourself">
                  <Send className="w-3 h-3" />{testSending ? "Sending..." : "Test"}
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1" onClick={() => setEditing(true)}>
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-[12px] flex-shrink-0" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Setting up..." : "Customise"}
              </Button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {editing && effectiveTemplate ? (
          <TemplateEditor template={effectiveTemplate} textOnly={slot.textOnly} onCancel={() => setEditing(false)} />
        ) : effectiveTemplate ? (
          <div className="space-y-2">
            {effectiveTemplate.subject && (
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Subject</p>
                <p className="text-[13px]">{effectiveTemplate.subject}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Body</p>
              <p className="text-[13px] text-muted-foreground whitespace-pre-wrap line-clamp-4">{effectiveTemplate.body}</p>
            </div>
            {effectiveTemplate.videoUrl && (
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Video Message</p>
                <video src={effectiveTemplate.videoUrl} controls className="w-full max-h-36 rounded-lg bg-black" />
              </div>
            )}
            {effectiveTemplate.audioUrl && (
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Voice Note</p>
                <audio src={effectiveTemplate.audioUrl} controls className="w-full h-10" />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/60">
              Updated {formatDistanceToNow(new Date(effectiveTemplate.updatedAt), { addSuffix: true })}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground py-1">
            Using default message — click <span className="font-medium">Customise</span> to write your own.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecordingsTab() {
  const { data: recordings = [], refetch } = useQuery<any[]>({ queryKey: ["/api/recordings"] });
  const { toast } = useToast();

  // Which type is being added right now
  const [addingType, setAddingType] = useState<"voice" | "video" | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [uploading, setUploading] = useState(false);

  // Inline recorder state
  const [recState, setRecState] = useState<"idle" | "previewing" | "recording" | "recorded">("idle");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recDuration, setRecDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Label editing for existing recordings
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const voiceRecs = (recordings as any[]).filter(r => r.type === "voice");
  const videoRecs = (recordings as any[]).filter(r => r.type === "video");

  function resetRecorder() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    setRecDuration(0);
    setRecState("idle");
    if (videoPreviewRef.current) { videoPreviewRef.current.src = ""; videoPreviewRef.current.srcObject = null; }
  }

  function cancelAdding() {
    if (recState === "recording") mediaRecorderRef.current?.stop();
    // Stop any live camera/mic stream
    const vid = videoPreviewRef.current;
    if (vid?.srcObject) (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    resetRecorder();
    setAddingType(null);
    setNewLabel("");
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecState("recorded");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecDuration(0);
      timerRef.current = setInterval(() => setRecDuration(d => d + 1), 1000);
      setRecState("recording");
    } catch {
      toast({ title: "Microphone access denied", description: "Allow microphone access to record.", variant: "destructive" });
    }
  }

  async function startVideoPreview() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.play().catch(() => {});
      }
      setRecState("previewing");
    } catch {
      toast({ title: "Camera access denied", description: "Allow camera and microphone to record.", variant: "destructive" });
    }
  }

  function startVideoRecording() {
    const stream = videoPreviewRef.current?.srcObject as MediaStream;
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
        videoPreviewRef.current.src = url;
        videoPreviewRef.current.muted = false;
        videoPreviewRef.current.load();
      }
      stream.getTracks().forEach(t => t.stop());
      setRecState("recorded");
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecState("recording");
  }

  function retake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordedBlob(null);
    if (videoPreviewRef.current) { videoPreviewRef.current.src = ""; videoPreviewRef.current.srcObject = null; }
    setRecState("idle");
    setRecDuration(0);
  }

  async function handleSave() {
    if (!recordedBlob || !addingType) return;
    setUploading(true);
    try {
      const fd = new FormData();
      const filename = addingType === "voice" ? "voice-note.webm" : "video-message.webm";
      fd.append("file", recordedBlob, filename);
      fd.append("type", addingType);
      fd.append("label", newLabel.trim() || (addingType === "voice" ? "Voice Note" : "Video Message"));
      const res = await fetch("/api/recordings/upload", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error((await res.json()).message);
      toast({ title: "Recording saved" });
      cancelAdding();
      refetch();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/recordings/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      toast({ title: "Recording removed" });
      refetch();
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  }

  async function handleRename(id: string) {
    try {
      await fetch(`/api/recordings/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel }),
      });
      refetch();
    } catch {
      toast({ title: "Failed to rename", variant: "destructive" });
    }
    setEditingId(null);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const sections = [
    {
      type: "voice" as const,
      recs: voiceRecs,
      title: "Voice Notes",
      icon: <Mic className="w-4 h-4 text-primary" />,
      description: "Record a personal voice message to show customers after they give a 4-5★ rating. Select it in the Send Request dialog under 'After 4-5★ rating'. Works for email, SMS, and WhatsApp.",
      emptyHint: <>Try: <span className="italic">"Thank you so much for your rating — it means the world to us! If you have a moment, we'd really love it if you could share your experience online."</span></>,
      addLabel: "Record voice note",
    },
    {
      type: "video" as const,
      recs: videoRecs,
      title: "Video Messages",
      icon: <Video className="w-4 h-4 text-primary" />,
      description: "Record a personal video message to show customers after they give a 4-5★ rating. Select it in the Send Request dialog under 'After 4-5★ rating'. Works for email, SMS, and WhatsApp.",
      emptyHint: <>Try: <span className="italic">"Hi, thank you so much for your rating — it really means a lot to us! If you'd like to share your experience, we'd be incredibly grateful."</span></>,
      addLabel: "Record video message",
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map(({ type, recs, title, icon, description, emptyHint, addLabel }) => (
        <Card key={type} className="border-card-border">
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">{icon}{title}</CardTitle>
            <CardDescription className="text-[12.5px]">{description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-5 space-y-3">
            {/* Existing recordings */}
            {recs.map((rec: any) => (
              <div key={rec.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {editingId === rec.id ? (
                    <>
                      <Input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                        className="text-[12.5px] h-7 flex-1"
                        onKeyDown={e => { if (e.key === "Enter") handleRename(rec.id); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus />
                      <Button size="sm" variant="outline" className="text-[11.5px] h-7 px-2" onClick={() => handleRename(rec.id)}>Save</Button>
                      <Button size="sm" variant="ghost" className="text-[11.5px] h-7 px-2" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="text-[12.5px] font-medium flex-1">{rec.label}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => { setEditingId(rec.id); setEditLabel(rec.label); }}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(rec.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
                {type === "voice"
                  ? <audio controls src={rec.url} className="w-full h-10" />
                  : <video controls src={rec.url} className="w-full rounded-lg max-h-48 bg-black" />}
              </div>
            ))}

            {recs.length === 0 && addingType !== type && (
              <p className="text-[12px] text-muted-foreground text-center italic px-2">{emptyHint}</p>
            )}

            {/* In-app recorder */}
            {addingType === type ? (
              <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                {/* Label */}
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Label <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                    placeholder={type === "voice" ? "e.g. Standard voice note" : "e.g. Main video message"}
                    className="text-[12.5px]" />
                </div>

                {/* Voice recorder */}
                {type === "voice" && (
                  <div className="space-y-2">
                    {recState === "recorded" && recordedUrl && (
                      <audio src={recordedUrl} controls className="w-full h-10" />
                    )}
                    {recState === "recording" && (
                      <div className="flex items-center gap-2 text-red-500">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[12px] font-mono">Recording {fmt(recDuration)}</span>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {recState === "idle" && (
                        <Button size="sm" variant="outline" className="text-[12px] gap-1.5" onClick={startVoiceRecording}>
                          <Mic className="w-3.5 h-3.5" /> Start recording
                        </Button>
                      )}
                      {recState === "recording" && (
                        <Button size="sm" variant="destructive" className="text-[12px] gap-1.5" onClick={() => mediaRecorderRef.current?.stop()}>
                          <StopCircle className="w-3.5 h-3.5" /> Stop
                        </Button>
                      )}
                      {recState === "recorded" && (
                        <>
                          <Button size="sm" className="text-[12px] gap-1.5" onClick={handleSave} disabled={uploading}>
                            <Save className="w-3.5 h-3.5" /> {uploading ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" className="text-[12px] gap-1.5" onClick={retake} disabled={uploading}>
                            <RotateCcw className="w-3.5 h-3.5" /> Re-record
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Video recorder */}
                {type === "video" && (
                  <div className="space-y-2">
                    {/* Always rendered so ref is available when stream is assigned */}
                    <video ref={videoPreviewRef}
                      className={`w-full max-h-48 rounded-lg bg-black${recState === "idle" ? " hidden" : ""}`}
                      playsInline
                      autoPlay={recState === "previewing" || recState === "recording"}
                      controls={recState === "recorded"}
                    />
                    {recState === "recording" && (
                      <div className="flex items-center gap-2 text-red-500">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[12px]">Recording…</span>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {recState === "idle" && (
                        <Button size="sm" variant="outline" className="text-[12px] gap-1.5" onClick={startVideoPreview}>
                          <Video className="w-3.5 h-3.5" /> Open camera
                        </Button>
                      )}
                      {recState === "previewing" && (
                        <Button size="sm" className="text-[12px] gap-1.5 bg-red-500 hover:bg-red-600" onClick={startVideoRecording}>
                          <StopCircle className="w-3.5 h-3.5" /> Start recording
                        </Button>
                      )}
                      {recState === "recording" && (
                        <Button size="sm" variant="destructive" className="text-[12px] gap-1.5" onClick={() => mediaRecorderRef.current?.stop()}>
                          <StopCircle className="w-3.5 h-3.5" /> Stop
                        </Button>
                      )}
                      {recState === "recorded" && (
                        <>
                          <Button size="sm" className="text-[12px] gap-1.5" onClick={handleSave} disabled={uploading}>
                            <Save className="w-3.5 h-3.5" /> {uploading ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" className="text-[12px] gap-1.5" onClick={retake} disabled={uploading}>
                            <RotateCcw className="w-3.5 h-3.5" /> Re-record
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <Button variant="ghost" size="sm" className="text-[12px] w-full" onClick={cancelAdding}>
                  Cancel
                </Button>
              </div>
            ) : recs.length < 2 ? (
              <Button variant="outline" size="sm" className="text-[12.5px] w-full gap-1.5"
                onClick={() => { setAddingType(type); setNewLabel(""); resetRecorder(); }}>
                <Plus className="w-3.5 h-3.5" />
                {recs.length === 0 ? addLabel : "Add another"}
              </Button>
            ) : (
              <p className="text-[11.5px] text-muted-foreground text-center">Maximum of 2 recordings reached.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const MAX_CUSTOM = 10;

function CustomTemplatesSection({ templates, channel, isReadOnly }: {
  templates: Template[];
  channel: string;
  isReadOnly: boolean;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const customTemplates = templates.filter(t => t.templateType === "custom");
  const canAdd = customTemplates.length < MAX_CUSTOM;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/templates", {
        name: creatingName.trim() || "Custom template",
        channel,
        templateType: "custom",
        subject: channel === "email" ? "Message from {{business_name}}" : "",
        body: "Hi {{first_name}},\n\n\n\nThanks,\nThe {{business_name}} team",
      });
      return res.json() as Promise<Template>;
    },
    onSuccess: (data: Template) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setCreatingName("");
      setShowCreate(false);
      setEditingId(data.id);
      setExpanded(true);
    },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/templates/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Custom Templates ({customTemplates.length}/{MAX_CUSTOM})</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
        </button>
        {!isReadOnly && canAdd && !showCreate && (
          <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1.5" onClick={() => { setShowCreate(true); setExpanded(true); }}>
            <Plus className="w-3 h-3" /> Add template
          </Button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2 mt-3">
          {customTemplates.length === 0 && !showCreate && (
            <p className="text-[12.5px] text-muted-foreground py-1">
              No custom templates yet. Click <span className="font-medium">Add template</span> above to create one.
            </p>
          )}

          {showCreate && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-card-border">
              <Input
                autoFocus
                value={creatingName}
                onChange={e => setCreatingName(e.target.value)}
                placeholder="Template name (e.g. Bathroom Fitting)"
                className="text-[13px] flex-1"
                onKeyDown={e => { if (e.key === "Enter") createMutation.mutate(); if (e.key === "Escape") { setShowCreate(false); setCreatingName(""); }}}
              />
              <Button size="sm" className="h-7 text-[12px]" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setShowCreate(false); setCreatingName(""); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {customTemplates.map(t => (
            <div key={t.id} className="rounded-lg border border-card-border overflow-hidden">
              {editingId === t.id ? (
                <div className="p-4">
                  <TemplateEditor template={t} textOnly={false} onCancel={() => setEditingId(null)} />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{t.name}</p>
                    <p className="text-[11.5px] text-muted-foreground line-clamp-1 mt-0.5">{t.body}</p>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1" onClick={() => setEditingId(t.id)}>
                        <Edit2 className="w-3 h-3" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(t.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {!canAdd && !isReadOnly && (
            <p className="text-[11.5px] text-muted-foreground text-center py-1">Maximum of {MAX_CUSTOM} custom templates reached.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const isReadOnly = !!user?.isImpersonating;
  const { data: templates, isLoading } = useQuery<Template[]>({ queryKey: ["/api/templates"] });
  const [activeTab, setActiveTab] = useState("email");

  const byChannel = {
    email: templates?.filter(t => t.channel === "email") || [],
    sms: templates?.filter(t => t.channel === "sms") || [],
    whatsapp: templates?.filter(t => t.channel === "whatsapp") || [],
  };

  return (
    <div className="px-6 py-7 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
        <p className="text-[13.5px] text-muted-foreground mt-0.5">
          Customise the messages sent to your customers at each stage of the review journey.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="email" className="gap-1.5 text-[13px]" data-testid="tab-email">
              <Mail className="w-3.5 h-3.5" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5 text-[13px]" data-testid="tab-sms">
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5 text-[13px]" data-testid="tab-whatsapp">
              <MessageSquare className="w-3.5 h-3.5 text-green-500" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="recordings" className="gap-1.5 text-[13px]" data-testid="tab-recordings">
              <Mic className="w-3.5 h-3.5" /> Recordings
            </TabsTrigger>
          </TabsList>

          {activeTab !== "recordings" && (
            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-[12.5px] font-semibold text-primary mb-2">Available Merge Tags</p>
              <div className="flex flex-wrap gap-2">
                {MERGE_TAGS.map(tag => (
                  <code key={tag} className="text-[11.5px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">{tag}</code>
                ))}
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-2">
                These tags are automatically replaced with real data when messages are sent.
              </p>
            </div>
          )}

          {(["email", "sms", "whatsapp"] as const).map(ch => (
            <TabsContent key={ch} value={ch} className="space-y-4">
              {TEMPLATE_SLOTS.map(slot => (
                <TemplateSlot
                  key={slot.type}
                  slot={slot}
                  template={byChannel[ch].find(t => t.templateType === slot.type)}
                  channel={ch}
                  isReadOnly={isReadOnly}
                />
              ))}
              <CustomTemplatesSection templates={byChannel[ch]} channel={ch} isReadOnly={isReadOnly} />
            </TabsContent>
          ))}

          <TabsContent value="recordings">
            <RecordingsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
