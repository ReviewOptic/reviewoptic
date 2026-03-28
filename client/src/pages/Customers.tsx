import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, Search, Send, MoreHorizontal, Ban, Trash2, Users,
  Upload, Download, X, CheckCircle2, Clock, Star, Eye, AlertCircle, Edit2, Sparkles, RefreshCw, Mic, Video, Archive, ArchiveRestore, CalendarClock
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
import { TimePicker } from "@/components/ui/time-picker";

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
  scheduled: { label: "Scheduled", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400", icon: <CalendarClock className="w-3 h-3" /> },
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
  const [scheduleRequest, setScheduleRequest] = useState(false);
  const [scheduledSendDate, setScheduledSendDate] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/customers", {
        ...data,
        ...(scheduleRequest && scheduledSendDate ? { scheduledSendDate } : {}),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: scheduleRequest && scheduledSendDate ? `Review request scheduled for ${new Date(scheduledSendDate).toLocaleDateString("en-GB")}` : "Customer added successfully" });
      onClose();
      setForm({ name: "", email: "", phone: "", serviceDate: "", serviceType: "", notes: "", channel: "email" });
      setScheduleRequest(false);
      setScheduledSendDate("");
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
          {/* Schedule review request */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[12.5px] font-medium">Schedule review request</Label>
                <p className="text-[11px] text-muted-foreground">Set a date to send automatically when the job is done.</p>
              </div>
              <Switch checked={scheduleRequest} onCheckedChange={setScheduleRequest} />
            </div>
            {scheduleRequest && (
              <Input
                type="date"
                value={scheduledSendDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => setScheduledSendDate(e.target.value)}
                className="text-[13px]"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate(form)}
            disabled={!form.name || (!form.email && !form.phone) || (!!form.email && !isValidEmail(form.email)) || (!!form.phone && !isValidPhone(form.phone)) || (scheduleRequest && !scheduledSendDate) || mutation.isPending}
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
  const [liteLimitResetDate, setLiteLimitResetDate] = useState<string | null>(null);
  const [positiveTemplateId, setPositiveTemplateId] = useState<string>("");
  const [negativeTemplateId, setNegativeTemplateId] = useState<string>("");
  const [emailRecordingType, setEmailRecordingType] = useState<"none" | "voice" | "video">("none");
  const [emailRecordingId, setEmailRecordingId] = useState<string | null>(null);

  const { data: settings } = useQuery<any>({ queryKey: ["/api/settings"] });
  const { data: templates } = useQuery<Template[]>({ queryKey: ["/api/templates"] });
  const { data: recordings = [] } = useQuery<any[]>({ queryKey: ["/api/recordings"] });

  const positiveTemplates = (templates || []).filter(t => t.channel === channel && t.templateType === "response_positive");
  const negativeTemplates = (templates || []).filter(t => t.channel === channel && t.templateType === "response_negative");

  // Auto-select first template when templates load or channel changes
  useEffect(() => {
    if (positiveTemplates.length > 0 && !positiveTemplates.find(t => t.id === positiveTemplateId)) {
      setPositiveTemplateId(positiveTemplates[0].id);
    }
  }, [positiveTemplates.map(t => t.id).join(","), channel]);

  useEffect(() => {
    if (negativeTemplates.length > 0 && !negativeTemplates.find(t => t.id === negativeTemplateId)) {
      setNegativeTemplateId(negativeTemplates[0].id);
    }
  }, [negativeTemplates.map(t => t.id).join(","), channel]);

  useEffect(() => {
    if (settings?.defaultSendTime && customTime === "" && delay === "now") {
      const [hours, minutes] = settings.defaultSendTime.split(":").map(Number);
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      if (d <= new Date()) d.setDate(d.getDate() + 1); // if time already passed, schedule for tomorrow
      const pad = (n: number) => String(n).padStart(2, "0");
      setDelay("custom");
      setCustomTime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(hours)}:${pad(minutes)}`);
    }
  }, [settings?.defaultSendTime]);

  useEffect(() => {
    setChannel(getValidChannel(customer));
  }, [customer?.id]);



  const availablePlatforms = settings ? [
    { key: "google", name: "Google", url: settings.googleReviewLink },
    { key: "facebook", name: "Facebook", url: settings.facebookReviewLink },
    { key: "trustpilot", name: "Trustpilot", url: settings.trustpilotLink },
    { key: "tripadvisor", name: "TripAdvisor", url: settings.tripadvisorLink },
    { key: "checkatrade", name: "Checkatrade", url: settings.checkatradeLink },
    { key: "mybuilder", name: "MyBuilder", url: settings.mybuilderLink },
  ].filter(p => p.url) : [];



  const canSend = !(delay === "custom" && !customTime)
    && (positiveTemplates.length === 0 || !!positiveTemplateId)
    && (negativeTemplates.length === 0 || !!negativeTemplateId);

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
        selectedPlatforms: availablePlatforms.map(p => ({ name: p.name, url: p.url })),
        positiveTemplateId: positiveTemplateId || undefined,
        negativeTemplateId: negativeTemplateId || undefined,
        recordingId: emailRecordingType !== "none"
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
    onError: (err: any) => {
      try {
        const json = JSON.parse(err.message.replace(/^\d+: /, ""));
        if (json.code === "lite_limit_reached") {
          setLiteLimitResetDate(json.resetDate || null);
          return;
        }
      } catch {}
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  if (liteLimitResetDate !== null) {
    const resetFormatted = new Date(liteLimitResetDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    return (
      <Dialog open={open} onOpenChange={() => { setLiteLimitResetDate(null); onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Monthly limit reached</DialogTitle>
            <DialogDescription>You've used all 10 review requests for this month on your Lite plan.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
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
            <Select value={channel} onValueChange={(v) => { setChannel(v); setPositiveTemplateId(""); setNegativeTemplateId(""); setEmailRecordingType("none"); setEmailRecordingId(null); }}>
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
            <Select value={delay} onValueChange={v => {
              setDelay(v);
              if (v === "custom" && !customTime) {
                const d = new Date(Date.now() + 3600000);
                const pad = (n: number) => String(n).padStart(2, "0");
                setCustomTime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
              } else if (v !== "custom") {
                setCustomTime("");
              }
            }}>
              <SelectTrigger data-testid="select-send-timing"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Send now</SelectItem>
                <SelectItem value="1h">In 1 hour</SelectItem>
                <SelectItem value="2h">In 2 hours</SelectItem>
                <SelectItem value="custom">Custom time</SelectItem>
              </SelectContent>
            </Select>
            {delay === "custom" && (() => {
              const datePart = customTime ? customTime.split("T")[0] : new Date().toISOString().split("T")[0];
              const timePart = customTime ? (customTime.split("T")[1] || "09:00").slice(0, 5) : "09:00";
              return (
                <div className="mt-1.5 space-y-1.5">
                  <Input
                    type="date"
                    value={datePart}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setCustomTime(`${e.target.value}T${timePart}`)}
                    className="text-[13px]"
                  />
                  <TimePicker value={timePart} onChange={v => setCustomTime(`${datePart}T${v}`)} />
                </div>
              );
            })()}
          </div>


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

          {/* After 4-5★ template */}
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">After 4–5★ rating — response template</Label>
            {positiveTemplates.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                No {channel} template for 4–5★ yet. <a href="/?tab=templates" className="text-primary underline font-medium">Set one up in Templates</a>.
              </p>
            ) : (
              <Select value={positiveTemplateId} onValueChange={v => setPositiveTemplateId(v)}>
                <SelectTrigger className="text-[12.5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {positiveTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* After 1-3★ template */}
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">After 1–3★ rating — response template</Label>
            {negativeTemplates.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                No {channel} template for 1–3★ yet. <a href="/?tab=templates" className="text-primary underline font-medium">Set one up in Templates</a>.
              </p>
            ) : (
              <Select value={negativeTemplateId} onValueChange={v => setNegativeTemplateId(v)}>
                <SelectTrigger className="text-[12.5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {negativeTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkSend, setShowBulkSend] = useState(false);
  const [bulkChannel, setBulkChannel] = useState<"email" | "sms" | "whatsapp">("email");
  const [bulkSending, setBulkSending] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isReadOnly = !!user?.isImpersonating;

  async function sendBulkRequests() {
    const selectedCustomers = displayList.filter(c => selectedIds.has(c.id) && !c.doNotContact);
    if (!selectedCustomers.length) return;
    setBulkSending(true);
    let sent = 0;
    for (const c of selectedCustomers) {
      try {
        await apiRequest("POST", "/api/review-requests", { customerId: c.id, channel: bulkChannel });
        sent++;
      } catch {}
    }
    setBulkSending(false);
    setShowBulkSend(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
    toast({ title: `Sent ${sent} request${sent !== 1 ? "s" : ""}` });
  }

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

  function exportCSV() {
    const rows = displayList.map(c => {
      const reqs = allRequests.filter(r => r.customerId === c.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = reqs[0];
      const rating = latest?.rating ?? "";
      const sentAt = latest?.sentAt ? new Date(latest.sentAt).toLocaleDateString() : "";
      const clickedAt = latest?.clickedAt ? new Date(latest.clickedAt).toLocaleDateString() : "";
      const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [escape(c.name), escape(c.email), escape(c.phone), escape(c.channel), escape(c.status), escape(rating), escape(sentAt), escape(clickedAt)].join(",");
    });
    const header = "Name,Email,Phone,Channel,Status,Star Rating,Date Sent,Date Clicked";
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
                <div className="flex gap-1.5 w-full">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => setShowImport(true)} data-testid="button-import-csv">
                    <Upload className="w-3.5 h-3.5" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={exportCSV} disabled={!displayList.length}>
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </Button>
                </div>
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
                {!showArchived && !isReadOnly && (
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      className="rounded border-border cursor-pointer"
                      checked={displayList.length > 0 && displayList.every(c => selectedIds.has(c.id))}
                      onChange={e => setSelectedIds(e.target.checked ? new Set(displayList.map(c => c.id)) : new Set())}
                    />
                  </th>
                )}
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
                    {!showArchived && !isReadOnly && (
                      <td className="pl-4 pr-2 py-3 w-8">
                        <input
                          type="checkbox"
                          className="rounded border-border cursor-pointer"
                          checked={selectedIds.has(customer.id)}
                          onChange={e => setSelectedIds(prev => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(customer.id) : next.delete(customer.id);
                            return next;
                          })}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                    )}
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
                      <div className="space-y-1">
                        <StatusBadge status={customer.status} doNotContact={customer.doNotContact} />
                        {(() => {
                          const rating = allRequests.filter(r => r.customerId === customer.id && r.rating).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.rating;
                          if (!rating) return null;
                          return (
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} className={cn("w-3 h-3", i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
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
                                  {["clicked", "no_response"].includes(customer.status) ? "Send New Request" : "Send Request"}
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

      {/* Bulk send action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border border-border shadow-lg rounded-xl px-5 py-3">
          <span className="text-[13px] font-medium">{selectedIds.size} customer{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <Button size="sm" className="gap-1.5" onClick={() => setShowBulkSend(true)}>
            <Send className="w-3.5 h-3.5" />
            Send Requests
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Bulk send dialog */}
      <Dialog open={showBulkSend} onOpenChange={v => !bulkSending && setShowBulkSend(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Send to {selectedIds.size} customer{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>Choose a channel. Customers without the required contact info will be skipped.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="flex gap-2">
              {(["email", "sms", "whatsapp"] as const).map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setBulkChannel(ch)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[12.5px] font-medium border transition-colors",
                    bulkChannel === ch ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {ch === "email" ? "Email" : ch === "sms" ? "SMS" : "WhatsApp"}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              {bulkChannel === "email" ? "Customers without an email address will be skipped." : "Customers without a phone number will be skipped."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowBulkSend(false)} disabled={bulkSending}>Cancel</Button>
            <Button size="sm" onClick={sendBulkRequests} disabled={bulkSending} className="gap-1.5">
              <Send className="w-3.5 h-3.5" />
              {bulkSending ? "Sending..." : `Send to ${selectedIds.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

