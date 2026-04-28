import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft, Send, Ban, Trash2, Star, Clock, Eye, CheckCircle2, MessageSquare,
  Mail, Phone, Calendar, FileText, Edit2, Save, X, Sparkles, RefreshCw, Mic, Video
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Customer, ReviewRequest, Review, PrivateFeedback, ActivityLog, Template } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function StarRating({ stars, size = "sm" }: { stars: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={cn(sz, i <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  );
}

function SendRequestDialog({ customer, open, onClose }: { customer: Customer; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [channel, setChannel] = useState(customer.channel);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");
  const [messageType, setMessageType] = useState<"text" | "voice" | "video">("text");
  const [phonetic, setPhonetic] = useState(customer.namePronunciation || "");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [emailRecordingType, setEmailRecordingType] = useState<"none" | "voice" | "video">("none");
  const [emailRecordingId, setEmailRecordingId] = useState<string | null>(null);
  const [liteLimitResetDate, setLiteLimitResetDate] = useState<string | null>(null);

  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const { data: templates } = useQuery<Template[]>({ queryKey: ["/api/templates"] });
  const { data: recordings = [] } = useQuery<any[]>({ queryKey: ["/api/recordings"] });

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
      const res = await apiRequest("POST", "/api/ai/generate-message", { customerId: customer.id, channel });
      const data = await res.json();
      setAiMessage(data.message || "");
    } catch (err: any) {
      console.error("[generateAIMessage]", err);
      toast({ title: "Could not generate message", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const channelTemplates = (templates || []).filter(t => t.channel === channel && t.templateType === "review_request");

  const generatePreview = async () => {
    setIsPreviewing(true);
    setPreviewId(null);
    const typeRecs = (recordings as any[]).filter((r: any) => r.type === messageType);
    const activeRecId = selectedRecordingId ?? typeRecs[0]?.id ?? null;
    try {
      const res = await apiRequest("POST", "/api/recordings/preview", { customerId: customer.id, recordingId: activeRecId, phonetic });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPreviewId(data.previewId);
      const firstName = customer.name.split(" ")[0];
      if (phonetic && phonetic !== firstName) {
        await apiRequest("PATCH", `/api/customers/${customer.id}`, { namePronunciation: phonetic });
      }
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/review-requests", {
      customerId: customer.id,
      channel,
      scheduledAt: new Date(),
      selectedPlatforms: availablePlatforms.filter(p => selectedPlatforms.includes(p.key)).map(p => ({ name: p.name, url: p.url })),
      customMessage: aiMessage || undefined,
      customSubject: channel === "email" && customSubject ? customSubject : undefined,
      templateId: selectedTemplateId !== "default" ? selectedTemplateId : undefined,
      recordingId: emailRecordingType !== "none"
        ? (emailRecordingId ?? (recordings as any[]).find((r: any) => r.type === emailRecordingType)?.id ?? undefined)
        : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Review request sent!" });
      onClose();
    },
    onError: (err: any) => {
      try {
        const json = JSON.parse(err.message.replace(/^\d+: /, ""));
        if (json.code === "lite_limit_reached") {
          setLiteLimitResetDate(json.resetDate || null);
          return;
        }
      } catch {}
      toast({ title: "Failed to send", variant: "destructive" });
    },
  });

  if (liteLimitResetDate !== null) {
    const resetFormatted = new Date(liteLimitResetDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    return (
      <Dialog open={open} onOpenChange={() => { setLiteLimitResetDate(null); onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Monthly limit reached</DialogTitle>
            <DialogDescription>You've used all 10 review requests for this month on your Standard plan.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">
              Your allowance resets on <strong>{resetFormatted}</strong>. You can wait until then, or upgrade to Pro for unlimited review requests every month.
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={() => { setLiteLimitResetDate(null); onClose(); }}>
              Wait until {resetFormatted}
            </Button>
            <Button onClick={() => window.location.href = "/pricing"}>
              Upgrade to Pro — unlimited requests
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Review Request</DialogTitle>
          <DialogDescription>Send to {customer.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Channel</Label>
            <Select value={channel} onValueChange={(v) => { setChannel(v); setAiMessage(""); setSelectedTemplateId("default"); setMessageType("text"); setEmailRecordingType("none"); setEmailRecordingId(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {channelTemplates.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default template</SelectItem>
                  {channelTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
                        ? "bg-selected text-selected-foreground border-selected"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* After-rating media (all channels) */}
          {(() => {
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

          {emailRecordingType !== "none" ? null : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[12.5px]">Message</Label>
                <button
                  type="button"
                  onClick={generateAIMessage}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 text-[11.5px] font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                >
                  {isGenerating
                    ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating...</>
                    : <><Sparkles className="w-3 h-3" />{aiMessage ? "Regenerate" : "Generate with AI"}</>
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
                    Click <span className="font-medium text-primary">Generate with AI</span> to create a personalised message based on {customer.name.split(" ")[0]}'s job details.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-confirm-send-detail">
            {mutation.isPending ? "Sending..." : "Send Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showSend, setShowSend] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const id = params?.id;

  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: ["/api/customers", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });
  const { data: allRequests } = useQuery<ReviewRequest[]>({ queryKey: ["/api/review-requests"] });
  const { data: allReviews } = useQuery<Review[]>({ queryKey: ["/api/reviews"] });
  const { data: allFeedback } = useQuery<PrivateFeedback[]>({ queryKey: ["/api/private-feedback"] });
  const { data: allActivity } = useQuery<ActivityLog[]>({ queryKey: ["/api/activity"] });

  const customerRequests = allRequests?.filter(r => r.customerId === id) || [];
  const customerReviews = allReviews?.filter(r => r.customerId === id) || [];
  const customerFeedback = allFeedback?.filter(f => f.customerId === id) || [];
  const customerActivity = allActivity?.filter(a => a.customerId === id) || [];

  const dncMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/customers/${id}`, { doNotContact: !customer?.doNotContact }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Updated" });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      navigate("/customers");
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/customers/${id}`, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer updated" });
      setEditing(false);
    },
    onError: () => toast({ title: "Failed to update customer", variant: "destructive" }),
  });

  const startEdit = () => {
    setEditForm({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      serviceDate: customer?.serviceDate || "",
      serviceType: customer?.serviceType || "",
      notes: customer?.notes || "",
      channel: customer?.channel || "email",
    });
    setEditing(true);
  };

  if (isLoading) return (
    <div className="px-6 py-7 max-w-4xl mx-auto space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
  if (!customer) return (
    <div className="px-6 py-16 text-center text-muted-foreground">
      <p>Customer not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/customers")}>Back to Customers</Button>
    </div>
  );

  const statusMap: Record<string, { label: string; color: string }> = {
    pending_request: { label: "Pending", color: "bg-muted text-muted-foreground" },
    request_sent: { label: "Request Sent", color: "bg-blue-100 text-blue-700" },
    clicked: { label: "Clicked Link", color: "bg-purple-100 text-purple-700" },
    feedback_left: { label: "Feedback Left", color: "bg-amber-100 text-amber-700" },
    review_completed: { label: "Reviewed", color: "bg-green-100 text-green-700" },
    no_response: { label: "No Response", color: "bg-orange-100 text-orange-700" },
  };
  const s = customer.doNotContact ? { label: "Do Not Contact", color: "bg-red-100 text-red-700" } : (statusMap[customer.status] || statusMap.pending_request);

  return (
    <div className="px-6 py-7 max-w-4xl mx-auto">
      {/* Back button */}
      <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="link-back">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-medium", s.color)}>
              {s.label}
            </span>
            {customer.doNotContact && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <Ban className="w-3 h-3" /> Do Not Contact
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => dncMutation.mutate()}
            className={cn("gap-1.5", customer.doNotContact ? "" : "text-destructive border-destructive/40 hover:bg-destructive/5")}
            data-testid="button-toggle-dnc"
          >
            <Ban className="w-3.5 h-3.5" />
            {customer.doNotContact ? "Remove DNC" : "Do Not Contact"}
          </Button>
          <Button size="sm" onClick={() => setShowSend(true)} disabled={customer.doNotContact} className="gap-1.5" data-testid="button-send-request-detail">
            <Send className="w-3.5 h-3.5" />
            {["clicked", "no_response"].includes(customer.status) ? "Send New Request" : "Send Request"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Info cards */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border-card-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[14px] font-semibold">Contact Info</CardTitle>
              {!editing ? (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEdit}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2.5 pb-4">
              {editing ? (
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Name</Label>
                    <Input className="h-8 text-[13px]" value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Email</Label>
                    <Input className="h-8 text-[13px]" type="email" value={editForm.email || ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Phone</Label>
                    <Input className="h-8 text-[13px]" type="tel" placeholder="07xxx xxxxxx" value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Channel</Label>
                    <Select value={editForm.channel || "email"} onValueChange={v => setEditForm(f => ({ ...f, channel: v }))}>
                      <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Service Date</Label>
                    <Input className="h-8 text-[13px]" type="date" value={editForm.serviceDate || ""} onChange={e => setEditForm(f => ({ ...f, serviceDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Service Type</Label>
                    <Input className="h-8 text-[13px]" value={editForm.serviceType || ""} onChange={e => setEditForm(f => ({ ...f, serviceType: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Notes</Label>
                    <Textarea className="text-[13px] min-h-[60px]" value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.serviceDate && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{customer.serviceDate}</span>
                    </div>
                  )}
                  {customer.serviceType && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{customer.serviceType}</span>
                    </div>
                  )}
                  {customer.notes && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-[12px] text-muted-foreground">{customer.notes}</p>
                    </div>
                  )}
                  {!customer.email && !customer.phone && !customer.serviceDate && !customer.serviceType && !customer.notes && (
                    <p className="text-[12px] text-muted-foreground">No contact info — click edit to add details.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-semibold">Ratings</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {customerRequests.filter(r => r.rating).length === 0 ? (
                <p className="text-[12px] text-muted-foreground">No ratings yet</p>
              ) : (
                <div className="space-y-2">
                  {customerRequests.filter(r => r.rating).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(r => (
                    <div key={r.id} className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30">
                      <div className="flex items-center justify-between gap-2">
                        <StarRating stars={r.rating!} />
                        <span className="text-[11px] text-muted-foreground">{format(new Date(r.createdAt), "d MMM yyyy")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity timeline */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] font-semibold">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {customerActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-7 h-7 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px]">No activity yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {customerActivity.map(item => (
                      <div key={item.id} className="flex gap-4 relative">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center z-10">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-[13px] font-medium">{item.message}</p>
                          <p className="text-[11.5px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request History */}
          {customerRequests.length > 0 && (
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-semibold">Request History ({customerRequests.length})</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-3">
                {[...customerRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(rr => {
                  const feedback = customerFeedback.find(f => f.reviewRequestId === rr.id);
                  const channelLabel = rr.channel === "whatsapp" ? "WhatsApp" : rr.channel === "sms" ? "SMS" : "Email";
                  return (
                    <div key={rr.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2.5">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] h-5 px-2 capitalize">{channelLabel}</Badge>
                          {rr.sentAt && (
                            <span className="text-[11.5px] text-muted-foreground">
                              {format(new Date(rr.sentAt), "d MMM yyyy")}
                            </span>
                          )}
                        </div>
                        {rr.rating && <StarRating stars={rr.rating} />}
                      </div>
                      {/* Journey */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                          <Send className="w-2.5 h-2.5" /> Sent
                        </span>
                        {rr.channel === "email" && rr.openedAt && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">
                            <Eye className="w-2.5 h-2.5" /> Opened
                          </span>
                        )}
                        {rr.followUpCount >= 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">Follow-up 1</span>
                        )}
                        {rr.followUpCount >= 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">Follow-up 2</span>
                        )}
                        {rr.followUpCount >= 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">Follow-up 3</span>
                        )}
                        {rr.rating && rr.rating >= 4 && rr.clickedAt && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-medium">
                            <Eye className="w-2.5 h-2.5" /> Clicked
                          </span>
                        )}
                        {rr.rating && rr.rating >= 4 && !rr.clickedAt && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
                            <Star className="w-2.5 h-2.5" /> Rated — no click yet
                          </span>
                        )}
                        {feedback && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
                            <MessageSquare className="w-2.5 h-2.5" /> Private feedback
                          </span>
                        )}
                        {rr.status === "no_response" && !rr.rating && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-medium">No response</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Private Feedback */}
          {customerFeedback.length > 0 && (
            <Card className="border-card-border border-amber-200 dark:border-amber-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  Private Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 space-y-2">
                {customerFeedback.map(f => (
                  <div key={f.id} className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating stars={f.stars} />
                      {f.responded && <span className="text-[11px] text-green-600 font-medium">✓ Responded</span>}
                    </div>
                    {f.message && <p className="text-[13px] text-muted-foreground">{f.message}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {customer && <SendRequestDialog customer={customer} open={showSend} onClose={() => setShowSend(false)} />}
    </div>
  );
}
