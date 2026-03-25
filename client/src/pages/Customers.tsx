import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, Search, Send, MoreHorizontal, Ban, Trash2, Users,
  Upload, X, CheckCircle2, Clock, Star, Eye, AlertCircle, Edit2, Sparkles, RefreshCw, Mic, Video, Archive, ArchiveRestore
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, ReviewRequest, Template } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_request: { label: "Pending", color: "bg-muted text-muted-foreground", icon: <Clock className="w-3 h-3" /> },
  request_sent: { label: "Request Sent", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Send className="w-3 h-3" /> },
  follow_up_1_sent: { label: "Follow-up 1 Sent", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", icon: <Send className="w-3 h-3" /> },
  follow_up_2_sent: { label: "Follow-up 2 Sent", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", icon: <Send className="w-3 h-3" /> },
  follow_up_3_sent: { label: "Follow-up 3 Sent", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: <Send className="w-3 h-3" /> },
  clicked: { label: "Clicked", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <Eye className="w-3 h-3" /> },
  review_completed: { label: "Reviewed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <Star className="w-3 h-3" /> },
  no_response: { label: "No Response", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: <AlertCircle className="w-3 h-3" /> },
  do_not_contact: { label: "Do Not Contact", color: "bg-destructive/10 text-destructive", icon: <Ban className="w-3 h-3" /> },
};

function StatusBadge({ status, doNotContact }: { status: string; doNotContact: boolean }) {
  const s = doNotContact ? statusConfig.do_not_contact : (statusConfig[status] || statusConfig.pending_request);
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", s.color)}>
      {s.icon} {s.label}
    </span>
  );
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone = (v: string) => /^\+?[\d\s\-().]{7,}$/.test(v);

function AddCustomerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", serviceDate: "", serviceType: "", notes: "", channel: "email"
  });
  const mutation = useMutation({
    mutationFn: async (data: typeof form) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Customer added successfully" });
      onClose();
      setForm({ name: "", email: "", phone: "", serviceDate: "", serviceType: "", notes: "", channel: "email" });
    },
    onError: () => toast({ title: "Failed to add customer", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-customer">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>Add a new customer to send review requests to.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[12.5px]">Name *</Label>
              <Input id="name" placeholder="Sarah Johnson" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-customer-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[12.5px]">Phone *</Label>
              <Input id="phone" placeholder="+1 555 000 0000" value={form.phone} onChange={e => {
                const phone = e.target.value;
                setForm(f => {
                  const hasEmail = !!f.email;
                  const hasPhone = !!phone;
                  const channel = !hasPhone && (f.channel === "sms" || f.channel === "whatsapp") ? (hasEmail ? "email" : f.channel) : f.channel;
                  return { ...f, phone, channel };
                });
              }} className={form.phone && !isValidPhone(form.phone) ? "border-destructive" : ""} data-testid="input-customer-phone" />
              {form.phone && !isValidPhone(form.phone) && <p className="text-[11px] text-destructive">Enter a valid phone number</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[12.5px]">Email *</Label>
            <p className="text-[11px] text-muted-foreground -mt-0.5">Email or phone required</p>
            <Input id="email" type="email" placeholder="sarah@example.com" value={form.email} onChange={e => {
              const email = e.target.value;
              setForm(f => {
                const hasPhone = !!f.phone;
                const hasEmail = !!email;
                const channel = !hasEmail && f.channel === "email" ? (hasPhone ? "sms" : f.channel) : f.channel;
                return { ...f, email, channel };
              });
            }} className={form.email && !isValidEmail(form.email) ? "border-destructive" : ""} data-testid="input-customer-email" />
            {form.email && !isValidEmail(form.email) && <p className="text-[11px] text-destructive">Enter a valid email address</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="service" className="text-[12.5px]">Service Type</Label>
              <Input id="service" placeholder="House Cleaning" value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))} data-testid="input-service-type" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-[12.5px]">Service Date</Label>
              <Input id="date" type="date" value={form.serviceDate} onChange={e => setForm(f => ({ ...f, serviceDate: e.target.value }))} data-testid="input-service-date" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[12.5px]">Notes</Label>
            <Textarea id="notes" placeholder="Any notes about this customer or job..." className="resize-none h-16 text-[13px]" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate(form)}
            disabled={!form.name || (!form.email && !form.phone) || (!!form.email && !isValidEmail(form.email)) || (!!form.phone && !isValidPhone(form.phone)) || mutation.isPending}
            data-testid="button-submit-customer"
          >
            {mutation.isPending ? "Adding..." : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendRequestDialog({ customer, open, onClose }: { customer: Customer | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const getValidChannel = (c: typeof customer) => {
    const preferred = c?.channel || "email";
    if (preferred === "email" && !c?.email) return c?.phone ? "sms" : "email";
    if ((preferred === "sms" || preferred === "whatsapp") && !c?.phone) return c?.email ? "email" : preferred;
    return preferred;
  };
  const [channel, setChannel] = useState(() => getValidChannel(customer));
  const [delay, setDelay] = useState("now");
  const [customTime, setCustomTime] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [messageMode, setMessageMode] = useState<"template" | "ai">("template");
  const [messageType, setMessageType] = useState<"text" | "voice" | "video">("text");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [aiMessage, setAiMessage] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [phonetic, setPhonetic] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [emailRecordingType, setEmailRecordingType] = useState<"none" | "voice" | "video">("none");
  const [emailRecordingId, setEmailRecordingId] = useState<string | null>(null);

  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const { data: templates } = useQuery<Template[]>({ queryKey: ["/api/templates"] });
  const { data: recordings = [] } = useQuery<any[]>({ queryKey: ["/api/recordings"] });

  const channelTemplates = (templates || []).filter(t => t.channel === channel && t.templateType === "review_request");
  const selectedTemplate = channelTemplates.find(t => t.id === selectedTemplateId) ?? channelTemplates[0];

  useEffect(() => {
    if (settings?.businessName && !customSubject) {
      setCustomSubject(`How was your experience with ${settings.businessName}?`);
    }
  }, [settings]);

  useEffect(() => {
    setChannel(getValidChannel(customer));
  }, [customer?.id]);

  useEffect(() => {
    if (customer) setPhonetic(customer.namePronunciation || "");
  }, [customer?.id]);

  useEffect(() => {
    if (messageMode === "template" && selectedTemplate?.subject) {
      setCustomSubject(selectedTemplate.subject);
    }
  }, [selectedTemplate?.id, messageMode]);

  const availablePlatforms = settings ? [
    { key: "google", name: "Google", url: settings.googleReviewLink },
    { key: "facebook", name: "Facebook", url: settings.facebookReviewLink },
    { key: "trustpilot", name: "Trustpilot", url: settings.trustpilotLink },
    { key: "tripadvisor", name: "TripAdvisor", url: settings.tripadvisorLink },
    { key: "checkatrade", name: "Checkatrade", url: settings.checkatradeLink },
    { key: "mybuilder", name: "MyBuilder", url: settings.mybuilderLink },
  ].filter(p => p.url) : [];

  const togglePlatform = (key: string) => {
    setSelectedPlatforms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const generateAIMessage = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/ai/generate-message", { customerId: customer?.id, channel });
      const data = await res.json();
      setAiMessage(data.message || "");
    } catch (err: any) {
      toast({ title: "Could not generate message", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePreview = async (phon?: string) => {
    setIsPreviewing(true);
    setPreviewId(null);
    const typeRecs = (recordings as any[]).filter((r: any) => r.type === messageType);
    const activeRecId = selectedRecordingId ?? typeRecs[0]?.id ?? null;
    try {
      const res = await apiRequest("POST", "/api/recordings/preview", {
        customerId: customer?.id,
        recordingId: activeRecId,
        phonetic: phon ?? phonetic,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPreviewId(data.previewId);
      // Save phonetic spelling to customer if different from their name
      const firstName = customer?.name.split(" ")[0] || "";
      const spellingToSave = phon ?? phonetic;
      if (spellingToSave && spellingToSave !== firstName) {
        await apiRequest("PATCH", `/api/customers/${customer?.id}`, { namePronunciation: spellingToSave });
      }
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const canSend = (delay === "custom" && !customTime) ? false
    : (channel === "whatsapp" && messageType !== "text")
    ? !!previewId
    : (messageMode === "template" || aiMessage.trim().length > 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/review-requests", {
        customerId: customer?.id,
        channel,
        scheduledAt: delay === "now" ? new Date()
          : delay === "1h" ? new Date(Date.now() + 60 * 60 * 1000)
          : delay === "2h" ? new Date(Date.now() + 2 * 60 * 60 * 1000)
          : delay === "custom" && customTime ? new Date(customTime)
          : new Date(),
        selectedPlatforms: availablePlatforms.filter(p => selectedPlatforms.includes(p.key)).map(p => ({ name: p.name, url: p.url })),
        customMessage: messageMode === "ai" ? (aiMessage || undefined) : undefined,
        customSubject: channel === "email" && customSubject ? customSubject : undefined,
        templateId: messageMode === "template" && selectedTemplate ? selectedTemplate.id : undefined,
        recordingId: channel === "email" && emailRecordingType !== "none"
          ? (emailRecordingId ?? (recordings as any[]).find((r: any) => r.type === emailRecordingType)?.id ?? undefined)
          : undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      if (data?.isScheduled && data?.scheduledAt) {
        const time = new Date(data.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        toast({ title: `Request scheduled for ${time}`, description: `Will be sent to ${customer?.name} via ${channel}` });
      } else {
        toast({ title: "Review request sent!", description: `Sent to ${customer?.name} via ${channel}` });
      }
      onClose();
    },
    onError: () => toast({ title: "Failed to send request", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-send-request">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Review Request
          </DialogTitle>
          <DialogDescription>Send a review request to {customer?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Channel */}
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Send via</Label>
            <Select value={channel} onValueChange={(v) => { setChannel(v); setAiMessage(""); setSelectedTemplateId(""); setMessageType("text"); setEmailRecordingType("none"); setEmailRecordingId(null); }}>
              <SelectTrigger data-testid="select-send-channel"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email" disabled={!customer?.email}>Email</SelectItem>
                <SelectItem value="sms" disabled={!customer?.phone}>SMS</SelectItem>
                <SelectItem value="whatsapp" disabled={!customer?.phone}>WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timing */}
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Timing</Label>
            <Select value={delay} onValueChange={v => { setDelay(v); setCustomTime(""); }}>
              <SelectTrigger data-testid="select-send-timing"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Send now</SelectItem>
                <SelectItem value="1h">In 1 hour</SelectItem>
                <SelectItem value="2h">In 2 hours</SelectItem>
                <SelectItem value="custom">Custom time</SelectItem>
              </SelectContent>
            </Select>
            {delay === "custom" && (
              <Input
                type="datetime-local"
                value={customTime}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                onChange={e => setCustomTime(e.target.value)}
                className="mt-1.5 text-[13px]"
              />
            )}
          </div>

          {/* Platforms */}
          {availablePlatforms.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Review platforms <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePlatform(p.key)}
                    className={`px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors ${
                      selectedPlatforms.includes(p.key)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Email: after-rating media */}
          {channel === "email" && (() => {
            const voiceRecs = (recordings as any[]).filter((r: any) => r.type === "voice");
            const videoRecs = (recordings as any[]).filter((r: any) => r.type === "video");
            const activeRecs = emailRecordingType === "voice" ? voiceRecs : emailRecordingType === "video" ? videoRecs : [];
            const activeRecId = emailRecordingId ?? activeRecs[0]?.id ?? null;
            return (
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">After 4–5★ rating, show</Label>
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  {([
                    { value: "none" as const, label: "Text only" },
                    { value: "voice" as const, label: "Voice note", icon: <Mic className="w-3 h-3" /> },
                    { value: "video" as const, label: "Video", icon: <Video className="w-3 h-3" /> },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setEmailRecordingType(opt.value); setEmailRecordingId(null); }}
                      className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors flex items-center justify-center gap-1 ${emailRecordingType === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {"icon" in opt && opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
                {emailRecordingType !== "none" && (
                  activeRecs.length === 0 ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                      <p className="text-[12px] text-amber-700">No {emailRecordingType === "voice" ? "voice notes" : "videos"} recorded yet. <a href="/templates?tab=recordings" className="underline font-medium">Record one in Templates → Recordings</a>.</p>
                    </div>
                  ) : activeRecs.length > 1 ? (
                    <Select value={activeRecId ?? ""} onValueChange={v => setEmailRecordingId(v)}>
                      <SelectTrigger className="text-[12.5px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {activeRecs.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-[11.5px] text-muted-foreground px-1">Will use: <span className="font-medium">{activeRecs[0].label}</span></p>
                  )
                )}
              </div>
            );
          })()}

          {/* WhatsApp message type selector */}
          {channel === "whatsapp" && (
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Message type</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {([
                  { value: "text", label: "Text", icon: null },
                  { value: "voice", label: "Voice note", icon: <Mic className="w-3 h-3" /> },
                  { value: "video", label: "Video", icon: <Video className="w-3 h-3" /> },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMessageType(opt.value)}
                    className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors flex items-center justify-center gap-1 ${messageType === opt.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {opt.icon}{opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voice / Video preview + pronunciation */}
          {channel === "whatsapp" && messageType !== "text" ? (
            (() => {
              const typeRecs = (recordings as any[]).filter((r: any) => r.type === messageType);
              const activeRecId = selectedRecordingId ?? typeRecs[0]?.id ?? null;
              const firstName = customer?.name?.split(" ")[0] || "";
              return typeRecs.length > 0 ? (
                <div className="space-y-3">
                  {typeRecs.length > 1 && (
                    <div className="space-y-1.5">
                      <Label className="text-[12.5px]">Recording</Label>
                      <Select value={activeRecId ?? ""} onValueChange={v => { setSelectedRecordingId(v); setPreviewId(null); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {typeRecs.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {previewId ? (
                    <div className="space-y-2">
                      <Label className="text-[12.5px]">Preview — with {firstName}'s name</Label>
                      {messageType === "voice" ? (
                        <audio controls src={`/api/recordings/preview/${previewId}`} className="w-full h-10" />
                      ) : (
                        <video controls src={`/api/recordings/preview/${previewId}`} className="w-full rounded-lg max-h-40 bg-black" />
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-muted/40 border border-border p-3 text-center">
                      <p className="text-[12px] text-muted-foreground">Generate a preview to hear how it sounds with {firstName}'s name before sending.</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px]">How to pronounce this name <span className="text-muted-foreground font-normal">(for voice only)</span></Label>
                    <div className="flex gap-2">
                      <Input
                        value={phonetic}
                        onChange={e => { setPhonetic(e.target.value); setPreviewId(null); }}
                        placeholder={firstName}
                        className="text-[12.5px] flex-1"
                      />
                      <Button size="sm" variant="outline" onClick={() => generatePreview()} disabled={isPreviewing || !activeRecId} className="text-[12.5px] shrink-0">
                        {isPreviewing ? <><RefreshCw className="w-3 h-3 animate-spin mr-1" />Generating...</> : previewId ? "Re-generate" : "Preview"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Only used to pronounce the name in voice/video — the spelling in text messages is never changed. E.g. type <span className="italic">See-oh-bhan</span> for Siobhan.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center space-y-1">
                  <p className="text-[12.5px] font-medium text-amber-800">
                    {messageType === "voice" ? "Voice note" : "Video message"} not set up yet
                  </p>
                  <p className="text-[11.5px] text-amber-700">
                    Record your {messageType === "voice" ? "voice note" : "video"} in <a href="/templates?tab=recordings" className="underline font-medium">Templates → Recordings</a>.
                  </p>
                </div>
              );
            })()
          ) : (
            /* Text message mode toggle */
            <div className="space-y-2">
              <Label className="text-[12.5px]">Message</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => { setMessageMode("template"); setAiMessage(""); }}
                  className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${messageMode === "template" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Use a template
                </button>
                <button
                  type="button"
                  onClick={() => setMessageMode("ai")}
                  className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 ${messageMode === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Sparkles className="w-3 h-3" /> Generate with AI
                </button>
              </div>

              {/* Template mode */}
              {messageMode === "template" && (
                <div className="space-y-2">
                  {channelTemplates.length === 0 ? (
                    <div className="rounded-lg bg-muted/50 border border-dashed border-border p-3 text-center">
                      <p className="text-[11.5px] text-muted-foreground">
                        No {channel} templates yet. <a href="/templates" className="font-medium text-primary underline">Create one in Templates</a>.
                      </p>
                    </div>
                  ) : (
                    <>
                      {channelTemplates.length > 1 && (
                        <Select value={selectedTemplate?.id ?? ""} onValueChange={setSelectedTemplateId}>
                          <SelectTrigger className="text-[12.5px]"><SelectValue placeholder="Choose template…" /></SelectTrigger>
                          <SelectContent>
                            {channelTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {selectedTemplate && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-[12.5px] text-muted-foreground whitespace-pre-wrap line-clamp-5">
                          {selectedTemplate.body}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* AI mode */}
              {messageMode === "ai" && (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={generateAIMessage}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 text-[11.5px] font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                    >
                      {isGenerating
                        ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating...</>
                        : <><Sparkles className="w-3 h-3" />{aiMessage ? "Regenerate" : "Generate"}</>
                      }
                    </button>
                  </div>
                  {aiMessage ? (
                    <Textarea
                      value={aiMessage}
                      onChange={(e) => setAiMessage(e.target.value)}
                      rows={channel === "sms" || channel === "whatsapp" ? 3 : 5}
                      className="text-[12.5px] resize-none"
                    />
                  ) : (
                    <div className="rounded-lg bg-muted/50 border border-dashed border-border p-3 text-center">
                      <p className="text-[11.5px] text-muted-foreground">
                        Click <span className="font-medium text-primary">Generate</span> to create a personalised message for {customer?.name?.split(" ")[0]}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subject (email only) */}
          {channel === "email" && (
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Subject</Label>
              <Input
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                placeholder="How was your experience with us?"
                className="text-[12.5px]"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canSend} data-testid="button-confirm-send">
            {mutation.isPending ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCustomerDialog({ customer, open, onClose }: { customer: Customer | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", serviceDate: "", serviceType: "", notes: "", channel: "email" });

  useState(() => {
    if (customer) setForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      serviceDate: customer.serviceDate || "",
      serviceType: customer.serviceType || "",
      notes: customer.notes || "",
      channel: customer.channel || "email",
    });
  });

  const mutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/customers/${customer?.id}`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update customer", variant: "destructive" }),
  });

  if (!customer) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update details for {customer.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Name *</Label>
              <Input placeholder="Sarah Johnson" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Phone</Label>
              <Input placeholder="07xxx xxxxxx" value={form.phone} onChange={e => {
                const phone = e.target.value;
                setForm(f => {
                  const hasEmail = !!f.email;
                  const hasPhone = !!phone;
                  const channel = !hasPhone && (f.channel === "sms" || f.channel === "whatsapp") ? (hasEmail ? "email" : f.channel) : f.channel;
                  return { ...f, phone, channel };
                });
              }} className={form.phone && !isValidPhone(form.phone) ? "border-destructive" : ""} />
              {form.phone && !isValidPhone(form.phone) && <p className="text-[11px] text-destructive">Enter a valid phone number</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Email</Label>
            <Input type="email" placeholder="sarah@example.com" value={form.email} onChange={e => {
              const email = e.target.value;
              setForm(f => {
                const hasPhone = !!f.phone;
                const hasEmail = !!email;
                const channel = !hasEmail && f.channel === "email" ? (hasPhone ? "sms" : f.channel) : f.channel;
                return { ...f, email, channel };
              });
            }} className={form.email && !isValidEmail(form.email) ? "border-destructive" : ""} />
            {form.email && !isValidEmail(form.email) && <p className="text-[11px] text-destructive">Enter a valid email address</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Service Type</Label>
              <Input placeholder="House Cleaning" value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Service Date</Label>
              <Input type="date" value={form.serviceDate} onChange={e => setForm(f => ({ ...f, serviceDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Preferred Channel</Label>
            <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email" disabled={!form.email}>Email</SelectItem>
                <SelectItem value="sms" disabled={!form.phone}>SMS</SelectItem>
                <SelectItem value="whatsapp" disabled={!form.phone}>WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Notes</Label>
            <Textarea placeholder="Any notes..." className="resize-none h-16 text-[13px]" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={!form.name || (!!form.email && !isValidEmail(form.email)) || (!!form.phone && !isValidPhone(form.phone)) || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportCsvDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ imported: number; skipped: { row: number; reason: string }[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { rows: [], errors: ["CSV has no data rows."] };
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const parsed: any[] = [];
    const errs: string[] = [];
    lines.slice(1).forEach((line, i) => {
      // Handle quoted fields
      const cols: string[] = [];
      let cur = "", inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      cols.push(cur.trim());
      const row: any = {};
      headers.forEach((h, j) => { row[h] = cols[j] || ""; });
      if (!row.name) { errs.push(`Row ${i + 2}: skipped — name is required`); return; }
      if (!row.email && !row.phone) { errs.push(`Row ${i + 2}: skipped — email or phone required`); return; }
      parsed.push(row);
    });
    return { rows: parsed, errors: errs };
  }

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const { rows: parsed, errors: errs } = parseCSV(e.target?.result as string);
      setRows(parsed);
      setErrors(errs);
    };
    reader.readAsText(f);
  }

  async function handleImport() {
    setIsImporting(true);
    try {
      const res = await apiRequest("POST", "/api/customers/import", { customers: rows });
      const data = await res.json();
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  }

  function handleClose() {
    setFile(null);
    setRows([]);
    setErrors([]);
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-[13px] text-muted-foreground">
              <p>Upload a CSV file to add multiple customers at once.</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><span className="font-medium text-foreground">Name</span> is required</li>
                <li><span className="font-medium text-foreground">Email or phone number</span> is required (one or both)</li>
                <li>Service type, service date, and notes are optional</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-1">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById("csv-file-input")?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to select or drag & drop a CSV file</p>
              )}
              <input id="csv-file-input" type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {file && (
              <div className="text-sm space-y-1">
                <p className="font-medium">{rows.length} customer{rows.length !== 1 ? "s" : ""} ready to import</p>
                {errors.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2 space-y-0.5">
                    {errors.map((e, i) => <p key={i} className="text-[12px] text-orange-700 dark:text-orange-300">{e}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 space-y-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">{result.imported} customer{result.imported !== 1 ? "s" : ""} imported successfully</span>
            </div>
            {result.skipped.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2 space-y-0.5">
                <p className="text-[12px] font-medium text-orange-700 dark:text-orange-300">{result.skipped.length} row{result.skipped.length !== 1 ? "s" : ""} skipped:</p>
                {result.skipped.map((s, i) => <p key={i} className="text-[12px] text-orange-700 dark:text-orange-300">Row {s.row}: {s.reason}</p>)}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button size="sm" onClick={handleImport} disabled={rows.length === 0 || isImporting}>
                {isImporting ? "Importing..." : `Import ${rows.length > 0 ? rows.length : ""} Customer${rows.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sendTo, setSendTo] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isReadOnly = !!user?.isImpersonating;

  const { data: customers, isLoading } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: archivedCustomers, isLoading: isLoadingArchived } = useQuery<Customer[]>({ queryKey: ["/api/customers/archived"], enabled: showArchived });
  const { data: allRequests = [] } = useQuery<ReviewRequest[]>({ queryKey: ["/api/review-requests"] });

  const toggleDncMutation = useMutation({
    mutationFn: async (customer: Customer) =>
      apiRequest("PATCH", `/api/customers/${customer.id}`, { doNotContact: !customer.doNotContact }),
    onSuccess: (_, customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: customer.doNotContact ? "Customer removed from DNC list" : "Customer marked as Do Not Contact" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/customers/${id}`, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/archived"] });
      toast({ title: "Customer archived" });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/customers/${id}`, { archived: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/archived"] });
      toast({ title: "Customer restored" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Customer deleted" });
    },
  });

  const filtered = customers?.filter(c => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "dnc" ? c.doNotContact : c.status === statusFilter);
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredArchived = archivedCustomers?.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const displayList = showArchived ? filteredArchived : filtered;
  const displayLoading = showArchived ? isLoadingArchived : isLoading;

  const statusFilters = [
    { value: "all", label: "All" },
    { value: "pending_request", label: "Pending" },
    { value: "request_sent", label: "Sent" },
    { value: "clicked", label: "Clicked" },
    { value: "review_completed", label: "Reviewed" },
    { value: "no_response", label: "No Response" },
    { value: "dnc", label: "Do Not Contact" },
  ];

  return (
    <div className="px-6 py-7 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">
            {customers?.length || 0} total customers
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowArchived(v => !v)}
          >
            <Archive className="w-3.5 h-3.5" />
            Archived
          </Button>
          {!isReadOnly && !showArchived && (
            <>
              <div className="flex flex-col items-center gap-1">
                <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setShowImport(true)} data-testid="button-import-csv">
                  <Upload className="w-3.5 h-3.5" />
                  Import CSV
                </Button>
                <a href="/customer-import-template.csv" download className="text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
                  Download CSV template
                </a>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)} data-testid="button-add-customer">
                <Plus className="w-3.5 h-3.5" />
                Add Customer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9 h-9 text-[13px]"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-customers"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {!showArchived && (
          <div className="flex gap-1.5 flex-wrap">
            {statusFilters.map(f => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                className="h-9 text-[12.5px] px-3"
                onClick={() => setStatusFilter(f.value)}
                data-testid={`filter-${f.value}`}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Service</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Requests</th>
                <th className="text-left px-4 py-3 text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Added</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {displayLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3"><Skeleton className="h-9 w-32" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-7 w-7" /></td>
                  </tr>
                ))
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-[13px]">
                      {showArchived
                        ? (search ? "No archived customers match your search" : "No archived customers")
                        : (search || statusFilter !== "all" ? "No customers match your filters" : "No customers yet. Add your first customer!")}
                    </p>
                    {!showArchived && !search && statusFilter === "all" && !isReadOnly && (
                      <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowAdd(true)}>
                        <Plus className="w-3.5 h-3.5" /> Add Customer
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                displayList.map(customer => (
                  <tr
                    key={customer.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    data-testid={`customer-row-${customer.id}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="text-[13px] font-medium hover:text-primary transition-colors text-left"
                          data-testid={`link-customer-${customer.id}`}
                        >
                          {customer.name}
                        </button>
                        <p className="text-[11.5px] text-muted-foreground sm:hidden truncate">{customer.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[13px] text-muted-foreground">{customer.email}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[13px] text-muted-foreground">{customer.serviceType || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={customer.status} doNotContact={customer.doNotContact} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[13px] text-muted-foreground">
                        {allRequests.filter(r => r.customerId === customer.id && r.sentAt).length}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[12px] text-muted-foreground">
                        {formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`menu-${customer.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {showArchived ? (
                            // Archived view: only show unarchive + delete
                            <>
                              <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)}>
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {!isReadOnly && (
                                <>
                                  <DropdownMenuItem onClick={() => unarchiveMutation.mutate(customer.id)}>
                                    <ArchiveRestore className="w-3.5 h-3.5 mr-2" />
                                    Unarchive
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => deleteMutation.mutate(customer.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          ) : (
                            // Normal view
                            <>
                              {!isReadOnly && (
                                <DropdownMenuItem
                                  onClick={() => setSendTo(customer)}
                                  disabled={customer.doNotContact}
                                  data-testid={`action-send-${customer.id}`}
                                >
                                  <Send className="w-3.5 h-3.5 mr-2 text-primary" />
                                  Send Request
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)}>
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {!isReadOnly && (
                                <>
                                  <DropdownMenuItem onClick={() => setEditCustomer(customer)}>
                                    <Edit2 className="w-3.5 h-3.5 mr-2" />
                                    Edit Contact
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => toggleDncMutation.mutate(customer)}
                                    className={customer.doNotContact ? "text-foreground" : "text-destructive"}
                                    data-testid={`action-dnc-${customer.id}`}
                                  >
                                    <Ban className="w-3.5 h-3.5 mr-2" />
                                    {customer.doNotContact ? "Remove DNC" : "Do Not Contact"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => archiveMutation.mutate(customer.id)}>
                                    <Archive className="w-3.5 h-3.5 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteMutation.mutate(customer.id)}
                                    className="text-destructive"
                                    data-testid={`action-delete-${customer.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddCustomerDialog open={showAdd} onClose={() => setShowAdd(false)} />
      <ImportCsvDialog open={showImport} onClose={() => setShowImport(false)} />
      <SendRequestDialog customer={sendTo} open={!!sendTo} onClose={() => setSendTo(null)} />
      <EditCustomerDialog customer={editCustomer} open={!!editCustomer} onClose={() => setEditCustomer(null)} />
    </div>
  );
}

