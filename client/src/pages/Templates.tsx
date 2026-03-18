import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Edit2, Save, X, FileText, Mail, MessageSquare, Video, Mic, StopCircle, RotateCcw, CheckCircle2, Plus, Trash2, Sparkles, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MERGE_TAGS = ["{{first_name}}", "{{customer_name}}", "{{business_name}}", "{{service_type}}", "{{review_link}}"];

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5 text-green-500" />,
};

function VideoRecorder({ currentUrl, onSaved }: { currentUrl: string; onSaved: (url: string) => void }) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "previewing" | "recording" | "recorded" | "uploading">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState(currentUrl || "");

  useEffect(() => {
    if (currentUrl) setSavedUrl(currentUrl);
  }, [currentUrl]);

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      setState("previewing");
    } catch {
      toast({ title: "Camera access denied", description: "Allow camera and microphone to record a video.", variant: "destructive" });
    }
  };

  const startRecording = () => {
    const stream = (videoRef.current?.srcObject as MediaStream);
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.muted = false;
        videoRef.current.load();
      }
      stream.getTracks().forEach(t => t.stop());
      setState("recorded");
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setState("recording");
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (videoRef.current) { videoRef.current.src = ""; videoRef.current.srcObject = null; }
    setState("idle");
  };

  const uploadVideo = async () => {
    if (!previewUrl) return;
    setState("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "recording.webm");
      const res = await fetch("/api/templates/upload-video", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setSavedUrl(url);
      onSaved(url);
      toast({ title: "Video saved" });
      setState("idle");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
      setState("recorded");
    }
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-[12.5px] flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Video Message</Label>
        {savedUrl && state === "idle" && (
          <span className="text-[11px] text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Video saved</span>
        )}
      </div>

      {savedUrl && state === "idle" && (
        <video src={savedUrl} controls className="w-full max-h-40 rounded-lg bg-black" />
      )}

      {state !== "idle" && (
        <video ref={videoRef} className="w-full max-h-48 rounded-lg bg-black" playsInline autoPlay={state === "previewing" || state === "recording"} controls={state === "recorded"} />
      )}

      <div className="flex gap-2 flex-wrap">
        {state === "idle" && (
          <Button size="sm" variant="outline" className="text-[12px] h-7 gap-1.5" onClick={startPreview}>
            <Video className="w-3.5 h-3.5" /> {savedUrl ? "Re-record" : "Record Video"}
          </Button>
        )}
        {state === "previewing" && (
          <Button size="sm" className="text-[12px] h-7 gap-1.5 bg-red-500 hover:bg-red-600" onClick={startRecording}>
            <StopCircle className="w-3.5 h-3.5" /> Start Recording
          </Button>
        )}
        {state === "recording" && (
          <Button size="sm" className="text-[12px] h-7 gap-1.5" onClick={stopRecording} variant="destructive">
            <StopCircle className="w-3.5 h-3.5" /> Stop Recording
          </Button>
        )}
        {(state === "recorded" || state === "uploading") && (
          <>
            <Button size="sm" className="text-[12px] h-7 gap-1.5" onClick={uploadVideo} disabled={state === "uploading"}>
              <Save className="w-3.5 h-3.5" /> {state === "uploading" ? "Uploading..." : "Save Video"}
            </Button>
            <Button size="sm" variant="outline" className="text-[12px] h-7 gap-1.5" onClick={reset} disabled={state === "uploading"}>
              <RotateCcw className="w-3.5 h-3.5" /> Retake
            </Button>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Video will be attached when sending via WhatsApp or SMS.</p>
    </div>
  );
}

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

function TemplateEditor({ template, onCancel }: { template: Template; onCancel: () => void }) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [videoUrl, setVideoUrl] = useState(template.videoUrl || "");
  const [audioUrl, setAudioUrl] = useState(template.audioUrl || "");
  const [mode, setMode] = useState<"text" | "video" | "audio">(template.videoUrl ? "video" : template.audioUrl ? "audio" : "text");
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
    mutationFn: async () => apiRequest("PATCH", `/api/templates/${template.id}`, { subject, body, videoUrl, audioUrl }),
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

  const charCount = body.length;
  const isSmsWarning = template.channel === "sms" && charCount > 160;
  const missingReviewLink = !body.includes("{{review_link}}");

  // Preview with sample data
  const preview = body
    .replace(/{{first_name}}/g, "Sarah")
    .replace(/{{customer_name}}/g, "Sarah Jones")
    .replace(/{{business_name}}/g, "Clean Pro Services")
    .replace(/{{service_type}}/g, "House Cleaning")
    .replace(/{{review_link}}/g, "https://reviewoptic.app/r/abc123");

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
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

      {mode === "text" && (
        <>
          {template.channel === "email" && (
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
              <span className={cn("text-[11px] font-mono", isSmsWarning ? "text-destructive font-semibold" : "text-muted-foreground")}>
                {charCount} chars {template.channel === "sms" && "(max 160)"}
              </span>
            </div>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="resize-none text-[13px] min-h-32"
              ref={el => setBodyEl(el)}
              data-testid="textarea-template-body"
            />
            {isSmsWarning && (
              <p className="text-[11.5px] text-destructive">⚠ SMS messages over 160 characters may be split into multiple messages</p>
            )}
            {missingReviewLink && (
              <p className="text-[11.5px] text-amber-600">⚠ Template should include {"{{"}<span>review_link</span>{"}}"}  merge tag</p>
            )}
          </div>
        </>
      )}

      {/* Video recorder */}
      {mode === "video" && <VideoRecorder currentUrl={videoUrl} onSaved={url => setVideoUrl(url)} />}
      {/* Audio recorder */}
      {mode === "audio" && <AudioRecorder currentUrl={audioUrl} onSaved={url => setAudioUrl(url)} />}
      {/* Merge tags + preview — text mode only */}
      {mode === "text" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Insert merge tags:</Label>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map(tag => (
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
              {settings?.logoUrl && template.channel === "email" && (
                <div style={{ textAlign: logoPosition === "center" ? "center" : logoPosition === "right" ? "right" : "left" }} className="mb-3">
                  <img src={settings.logoUrl} alt="Logo" className="inline-block max-h-10 max-w-[160px] object-contain" />
                </div>
              )}
              {preview}
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

function TemplateCard({ template, isReadOnly }: { template: Template; isReadOnly: boolean }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(template.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const renameMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/templates/${template.id}`, { name: newName.trim() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/templates"] }); setRenaming(false); },
    onError: () => toast({ title: "Failed to rename", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/templates/${template.id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/templates"] }); setConfirmDelete(false); toast({ title: "Template deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <>
      <Card className="border-card-border" data-testid={`template-card-${template.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 flex-shrink-0">
                {channelIcons[template.channel] || <FileText className="w-3.5 h-3.5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                {renaming ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") renameMutation.mutate(); if (e.key === "Escape") { setRenaming(false); setNewName(template.name); } }}
                      className="h-6 text-[13px] px-2 py-0"
                      autoFocus
                    />
                    <button onClick={() => renameMutation.mutate()} className="text-primary hover:text-primary/80"><Save className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setRenaming(false); setNewName(template.name); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-[14px] font-semibold truncate">{template.name}</CardTitle>
                    {!isReadOnly && !editing && (
                      <button onClick={() => setRenaming(true)} className="text-muted-foreground/50 hover:text-muted-foreground flex-shrink-0">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">{template.channel}</Badge>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{template.templateType.replace(/_/g, " ")}</Badge>
                </div>
              </div>
            </div>
            {!editing && !renaming && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1" onClick={() => setEditing(true)} disabled={isReadOnly} data-testid={`button-edit-template-${template.id}`}>
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {editing ? (
            <TemplateEditor template={template} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-2">
              {template.subject && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Subject</p>
                  <p className="text-[13px]">{template.subject}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Body</p>
                <p className="text-[13px] text-muted-foreground whitespace-pre-wrap line-clamp-4">{template.body}</p>
              </div>
              {template.videoUrl && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Video Message</p>
                  <video src={template.videoUrl} controls className="w-full max-h-36 rounded-lg bg-black" />
                </div>
              )}
              {template.audioUrl && (
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Voice Note</p>
                  <audio src={template.audioUrl} controls className="w-full h-10" />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground/60">
                Updated {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Delete template?</DialogTitle></DialogHeader>
          <p className="text-[13px] text-muted-foreground">"{template.name}" will be permanently deleted.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewTemplateDialog({ channel, open, onClose }: { channel: string; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [templateType, setTemplateType] = useState("review_request");
  const [isGenerating, setIsGenerating] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (opts?: { body?: string; subject?: string }) => apiRequest("POST", "/api/templates", {
      name: name.trim() || `New ${channel} template`,
      channel,
      templateType,
      subject: opts?.subject || (channel === "email" ? "How was your experience with {{business_name}}?" : ""),
      body: opts?.body || "Hi {{first_name}},\n\nThank you for choosing {{business_name}}!\n\n{{review_link}}\n\nThanks,\nThe {{business_name}} team",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template created" });
      setName("");
      onClose();
    },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  const generateAndCreate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      createMutation.mutate({ body: data.body, subject: data.subject });
    } catch (err: any) {
      toast({ title: "AI generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New {channel} template</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Template name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`e.g. Follow-up ${channel}`}
              className="text-[13px]"
              autoFocus
              onKeyDown={e => e.key === "Enter" && createMutation.mutate()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Type</Label>
            <Select value={templateType} onValueChange={setTemplateType}>
              <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="review_request">Review Request</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[12px]"
            onClick={generateAndCreate}
            disabled={isGenerating || createMutation.isPending}
          >
            {isGenerating ? <><Sparkles className="w-3.5 h-3.5 animate-pulse" />Generating...</> : <><Sparkles className="w-3.5 h-3.5" />Generate with AI</>}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-[12px]"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || isGenerating}
          >
            <Plus className="w-3.5 h-3.5" /> Create blank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const isReadOnly = !!user?.isImpersonating;
  const { data: templates, isLoading } = useQuery<Template[]>({ queryKey: ["/api/templates"] });
  const [activeTab, setActiveTab] = useState("email");
  const [showNew, setShowNew] = useState(false);

  const byChannel = {
    email: templates?.filter(t => t.channel === "email") || [],
    sms: templates?.filter(t => t.channel === "sms") || [],
    whatsapp: templates?.filter(t => t.channel === "whatsapp") || [],
  };

  return (
    <div className="px-6 py-7 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Message Templates</h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">
            Customize the messages sent to your customers. Use merge tags to personalize.
          </p>
        </div>
        {!isReadOnly && (
          <Button size="sm" className="gap-1.5 text-[12px] flex-shrink-0" onClick={() => setShowNew(true)}>
            <Plus className="w-3.5 h-3.5" /> New Template
          </Button>
        )}
      </div>

      {/* Merge tag reference */}
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

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="email" className="gap-1.5 text-[13px]" data-testid="tab-email">
              <Mail className="w-3.5 h-3.5" /> Email ({byChannel.email.length})
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5 text-[13px]" data-testid="tab-sms">
              <MessageSquare className="w-3.5 h-3.5" /> SMS ({byChannel.sms.length})
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5 text-[13px]" data-testid="tab-whatsapp">
              <MessageSquare className="w-3.5 h-3.5 text-green-500" /> WhatsApp ({byChannel.whatsapp.length})
            </TabsTrigger>
          </TabsList>
          {(["email", "sms", "whatsapp"] as const).map(ch => (
            <TabsContent key={ch} value={ch} className="space-y-4">
              {byChannel[ch].length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px] mb-3">No {ch} templates yet</p>
                  {!isReadOnly && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-[12px]" onClick={() => setShowNew(true)}>
                      <Plus className="w-3.5 h-3.5" /> Create one
                    </Button>
                  )}
                </div>
              ) : (
                byChannel[ch].map(t => <TemplateCard key={t.id} template={t} isReadOnly={isReadOnly} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <NewTemplateDialog channel={activeTab} open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
