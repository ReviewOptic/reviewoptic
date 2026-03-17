import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { Save, ExternalLink, Copy, Check, Globe, Bell, FileCode, Star, Share2, Upload, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Settings as SettingsType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function SettingSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-semibold">{title}</h3>
        {description && <p className="text-[12.5px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<SettingsType>({ queryKey: ["/api/settings"] });
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const isFirstRender = useRef(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setUploadingLogo(true);
    try {
      const image = await createImageBitmap(await fetch(cropSrc).then(r => r.blob()));
      const canvas = document.createElement("canvas");
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), "image/png"));
      const data = new FormData();
      data.append("logo", blob, "logo.png");
      const res = await fetch("/api/settings/upload-logo", { method: "POST", body: data, credentials: "include" });
      if (res.ok) {
        const { url } = await res.json();
        setForm(f => ({ ...f, logoUrl: url }));
        setCropSrc(null);
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const [form, setForm] = useState({
    ownerName: "",
    businessName: "",
    businessEmail: "",
    websiteUrl: "",
    logoUrl: "",
    logoPosition: "left",
    facebookProfileUrl: "",
    instagramUrl: "",
    xUrl: "",
    linkedinUrl: "",
    googleReviewLink: "",
    facebookReviewLink: "",
    trustpilotLink: "",
    tripadvisorLink: "",
    checkatradeLink: "",
    mybuilderLink: "",
    defaultChannel: "email",
    followUpEnabled: true,
    followUp1Days: 3,
    followUp2Days: 7,
    maxFollowUps: 2,
    widgetMinStars: 4,
    widgetCount: 5,
    widgetLayout: "grid",
    socialPostEnabled: false,
    socialPostMessage: "⭐ We just received a {stars}★ review! Thank you {customer_name}!",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ownerName: settings.ownerName || "",
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        websiteUrl: settings.websiteUrl || "",
        logoUrl: settings.logoUrl || "",
        logoPosition: settings.logoPosition || "left",
        facebookProfileUrl: settings.facebookProfileUrl || "",
        instagramUrl: settings.instagramUrl || "",
        xUrl: settings.xUrl || "",
        linkedinUrl: settings.linkedinUrl || "",
        googleReviewLink: settings.googleReviewLink || "",
        facebookReviewLink: settings.facebookReviewLink || "",
        trustpilotLink: settings.trustpilotLink || "",
        tripadvisorLink: settings.tripadvisorLink || "",
        checkatradeLink: settings.checkatradeLink || "",
        mybuilderLink: settings.mybuilderLink || "",
        defaultChannel: settings.defaultChannel || "email",
        followUpEnabled: settings.followUpEnabled ?? true,
        followUp1Days: settings.followUp1Days ?? 3,
        followUp2Days: settings.followUp2Days ?? 7,
        maxFollowUps: settings.maxFollowUps ?? 2,
        widgetMinStars: settings.widgetMinStars ?? 4,
        widgetCount: settings.widgetCount ?? 5,
        widgetLayout: settings.widgetLayout || "grid",
        socialPostEnabled: settings.socialPostEnabled ?? false,
        socialPostMessage: settings.socialPostMessage || "⭐ We just received a {stars}★ review! Thank you {customer_name}!",
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", "/api/settings", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => {
      setSaveStatus("idle");
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!form.businessEmail) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSaveStatus("saving");
    debounceTimer.current = setTimeout(() => mutation.mutate(), 1500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [form]);

  const widgetCode = `<script src="https://reviewoptic.app/widget.js" data-business-id="my-business" data-min-stars="${form.widgetMinStars}" data-count="${form.widgetCount}" data-layout="${form.widgetLayout}"></script>`;

  const handleCopyWidget = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Embed code copied!" });
  };

  if (isLoading) return (
    <div className="px-6 py-7 max-w-3xl mx-auto space-y-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
    </div>
  );

  return (
    <div className="px-6 py-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">Configure your ReviewOptic account</p>
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px]">
          {saveStatus === "saving" && <span className="text-muted-foreground">Saving…</span>}
          {saveStatus === "saved" && <span className="text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
        </div>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="text-[12.5px]" data-testid="tab-business">Business</TabsTrigger>
          <TabsTrigger value="platforms" className="text-[12.5px]" data-testid="tab-platforms">Review Platforms</TabsTrigger>
          <TabsTrigger value="followup" className="text-[12.5px]" data-testid="tab-followup">Follow-Ups</TabsTrigger>
          <TabsTrigger value="widget" className="text-[12.5px]" data-testid="tab-widget">Widget</TabsTrigger>
          <TabsTrigger value="social" className="text-[12.5px]" data-testid="tab-social">Social</TabsTrigger>
        </TabsList>

        {/* Business Info */}
        <TabsContent value="business">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-[15px]">Business Information</CardTitle>
              <CardDescription className="text-[12.5px]">This info is used in your message templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pb-5">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Your Name</Label>
                <Input
                  value={form.ownerName}
                  onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                  placeholder="e.g. Sarah"
                  data-testid="input-owner-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Company Logo</Label>
                {cropSrc ? (
                  <div className="space-y-3">
                    <div className="flex gap-1.5 mb-2">
                      {[{ label: "Square", value: 1 }, { label: "2:1", value: 2 }, { label: "3:1", value: 3 }, { label: "4:1", value: 4 }].map(a => (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => { setCropAspect(a.value); setCrop({ x: 0, y: 0 }); }}
                          className={`px-2.5 py-1 rounded text-[12px] font-medium border transition-colors ${cropAspect === a.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative h-56 rounded-lg overflow-hidden border border-border bg-muted/30">
                      <Cropper
                        image={cropSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={cropAspect}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1" />
                      <Button size="sm" variant="outline" onClick={() => setCropSrc(null)}>Cancel</Button>
                      <Button size="sm" onClick={applyCrop} disabled={uploadingLogo}>
                        {uploadingLogo ? "Saving…" : "Apply Crop"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {form.logoUrl && (
                      <div className="relative">
                        <img src={form.logoUrl} alt="Logo" className="h-16 w-auto max-w-[120px] object-contain" />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, logoUrl: "" }))}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer text-[12.5px] text-muted-foreground hover:text-foreground transition-colors">
                      <Upload className="w-4 h-4" />
                      {form.logoUrl ? "Change logo" : "Upload logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            setCropSrc(reader.result as string);
                            setCrop({ x: 0, y: 0 });
                            setZoom(1);
                            setCropAspect(1);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <p className="text-[11.5px] text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Business Name</Label>
                  <Input
                    value={form.businessName}
                    onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                    placeholder="Clean Pro Services"
                    data-testid="input-business-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Business Email <span className="text-destructive">*</span></Label>
                  <Input
                    type="email"
                    value={form.businessEmail}
                    onChange={e => setForm(f => ({ ...f, businessEmail: e.target.value }))}
                    placeholder="hello@mybusiness.com"
                    data-testid="input-business-email"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Website</Label>
                  <Input
                    type="url"
                    value={form.websiteUrl}
                    onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                    placeholder="https://www.mybusiness.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Default Send Channel</Label>
                <Select value={form.defaultChannel} onValueChange={v => setForm(f => ({ ...f, defaultChannel: v }))}>
                  <SelectTrigger className="w-48" data-testid="select-default-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11.5px] text-muted-foreground">New customers will default to this channel</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Platforms */}
        <TabsContent value="platforms">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-[15px]">Review Platforms</CardTitle>
              <CardDescription className="text-[12.5px]">Add links where customers can leave reviews. Happy customers (4-5 stars) will be directed here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-5">
              <p className="text-[12px] text-muted-foreground">Add at least one. Happy customers will be directed to whichever platforms you've filled in.</p>
              {[
                { label: "Google Business", key: "googleReviewLink", placeholder: "https://g.page/r/..." },
                { label: "Facebook Page", key: "facebookReviewLink", placeholder: "https://www.facebook.com/..." },
                { label: "Trustpilot", key: "trustpilotLink", placeholder: "https://www.trustpilot.com/review/..." },
                { label: "TripAdvisor", key: "tripadvisorLink", placeholder: "https://www.tripadvisor.co.uk/..." },
                { label: "Checkatrade", key: "checkatradeLink", placeholder: "https://www.checkatrade.com/trades/..." },
                { label: "MyBuilder", key: "mybuilderLink", placeholder: "https://www.mybuilder.com/..." },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-[12.5px]">{label}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="flex-1"
                    />
                    {(form as any)[key] && (
                      <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => window.open((form as any)[key], "_blank")}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-900/30">
                <p className="text-[12.5px] text-green-700 dark:text-green-400 font-medium">Sentiment Pre-Screen Filter</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Customers who rate 4-5 stars will be directed to your review platforms. Customers who rate 1-3 stars will be redirected to a private feedback form — protecting your public rating.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-up Settings */}
        <TabsContent value="followup">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-[15px]">Automated Follow-Ups</CardTitle>
              <CardDescription className="text-[12.5px]">Configure automatic reminders for customers who haven't responded</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13.5px] font-medium">Enable Auto Follow-Ups</p>
                  <p className="text-[12px] text-muted-foreground">Automatically send reminders to non-responders</p>
                </div>
                <Switch
                  checked={form.followUpEnabled}
                  onCheckedChange={v => setForm(f => ({ ...f, followUpEnabled: v }))}
                  data-testid="switch-followup-enabled"
                />
              </div>
              {form.followUpEnabled && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12.5px]">First Follow-Up</Label>
                      <span className="text-[13px] font-medium text-primary">{form.followUp1Days} days</span>
                    </div>
                    <Slider
                      min={1}
                      max={14}
                      step={1}
                      value={[form.followUp1Days]}
                      onValueChange={([v]) => setForm(f => ({ ...f, followUp1Days: v }))}
                      data-testid="slider-followup-1"
                    />
                    <p className="text-[11.5px] text-muted-foreground">After initial request, wait {form.followUp1Days} days before first reminder</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12.5px]">Second Follow-Up</Label>
                      <span className="text-[13px] font-medium text-primary">{form.followUp2Days} days</span>
                    </div>
                    <Slider
                      min={form.followUp1Days + 1}
                      max={30}
                      step={1}
                      value={[form.followUp2Days]}
                      onValueChange={([v]) => setForm(f => ({ ...f, followUp2Days: v }))}
                      data-testid="slider-followup-2"
                    />
                    <p className="text-[11.5px] text-muted-foreground">After first follow-up, wait until day {form.followUp2Days} for second reminder</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12.5px]">Maximum Follow-Ups</Label>
                      <span className="text-[13px] font-medium text-primary">{form.maxFollowUps}</span>
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[form.maxFollowUps]}
                      onValueChange={([v]) => setForm(f => ({ ...f, maxFollowUps: v }))}
                      data-testid="slider-max-followups"
                    />
                    <p className="text-[11.5px] text-muted-foreground">Stop after {form.maxFollowUps} total follow-ups with no response</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Widget */}
        <TabsContent value="widget">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-[15px]">Website Review Widget</CardTitle>
              <CardDescription className="text-[12.5px]">Embed a reviews widget on your website. Paste the code below into your site's HTML.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pb-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Minimum Stars to Display</Label>
                  <Select value={String(form.widgetMinStars)} onValueChange={v => setForm(f => ({ ...f, widgetMinStars: parseInt(v) }))}>
                    <SelectTrigger data-testid="select-min-stars"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4+ stars</SelectItem>
                      <SelectItem value="5">5 stars only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Number of Reviews</Label>
                  <Select value={String(form.widgetCount)} onValueChange={v => setForm(f => ({ ...f, widgetCount: parseInt(v) }))}>
                    <SelectTrigger data-testid="select-widget-count"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3,5,6,8,10].map(n => <SelectItem key={n} value={String(n)}>{n} reviews</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Layout</Label>
                <Select value={form.widgetLayout} onValueChange={v => setForm(f => ({ ...f, widgetLayout: v }))}>
                  <SelectTrigger className="w-40" data-testid="select-widget-layout"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Embed Code</Label>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-muted/60 border border-border text-[11.5px] font-mono overflow-x-auto text-foreground whitespace-pre-wrap break-all">
                    {widgetCode}
                  </pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-7 gap-1.5 text-[11px]"
                    onClick={handleCopyWidget}
                    data-testid="button-copy-widget"
                  >
                    {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="text-[12px] text-muted-foreground">
                  <strong>API endpoint:</strong>{" "}
                  <code className="text-[11.5px] font-mono bg-background px-1 py-0.5 rounded border border-border">
                    GET /api/widget/my-business/reviews
                  </code>
                  {" "}— Returns filtered reviews for your widget.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Social Auto-Post */}
        <TabsContent value="social">
          <div className="space-y-4">

            {/* Social Media Profiles */}
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-[15px]">Social Media Profiles</CardTitle>
                <CardDescription className="text-[12.5px]">Add your business profile links for each platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {[
                  { label: "Facebook", key: "facebookProfileUrl", placeholder: "https://www.facebook.com/yourbusiness" },
                  { label: "Instagram", key: "instagramUrl", placeholder: "https://www.instagram.com/yourbusiness" },
                  { label: "LinkedIn", key: "linkedinUrl", placeholder: "https://www.linkedin.com/company/yourbusiness" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[12px] text-muted-foreground w-24 flex-shrink-0">{label}</span>
                    <Input
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="flex-1 text-[13px]"
                    />
                    {(form as any)[key] && (
                      <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => window.open((form as any)[key], "_blank")}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Connected Accounts */}
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-[15px]">Connected Accounts</CardTitle>
                <CardDescription className="text-[12.5px]">
                  Connect your Facebook Page and LinkedIn Company Page to auto-post when a 4 or 5 star review is received.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pb-5">
                {/* Facebook row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-medium">Facebook</p>
                      {settings?.facebookPageAccessToken ? (
                        <p className="text-[12px] text-green-600 font-medium">Connected</p>
                      ) : (
                        <p className="text-[12px] text-muted-foreground">Not connected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {settings?.facebookPageAccessToken ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[12px] text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={async () => {
                          await fetch("/api/social/facebook", { method: "DELETE" });
                          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
                        }}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[12px]"
                        onClick={() => window.location.href = "/auth/facebook"}
                      >
                        Connect Facebook
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Instagram row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-medium">Instagram</p>
                      {settings?.facebookPageAccessToken ? (
                        <p className="text-[12px] text-green-600 font-medium">Connected via Facebook</p>
                      ) : (
                        <p className="text-[12px] text-muted-foreground">Connects automatically with Facebook</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* LinkedIn row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-700 flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-medium">LinkedIn</p>
                      {settings?.linkedinAccessToken ? (
                        <p className="text-[12px] text-green-600 font-medium">Connected</p>
                      ) : (
                        <p className="text-[12px] text-muted-foreground">Not connected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {settings?.linkedinAccessToken ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[12px] text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={async () => {
                          await fetch("/api/social/linkedin", { method: "DELETE" });
                          queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
                        }}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[12px]"
                        onClick={() => window.location.href = "/auth/linkedin"}
                      >
                        Connect LinkedIn
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Auto-post toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13.5px] font-medium">Auto-Post Reviews</p>
                    <p className="text-[12px] text-muted-foreground">Automatically post to connected accounts when a 4 or 5 star review is received</p>
                  </div>
                  <Switch
                    checked={form.socialPostEnabled}
                    onCheckedChange={v => setForm(f => ({ ...f, socialPostEnabled: v }))}
                  />
                </div>

                {/* Message template */}
                {form.socialPostEnabled && (
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px]">Post Message Template</Label>
                    <Input
                      value={form.socialPostMessage}
                      onChange={e => setForm(f => ({ ...f, socialPostMessage: e.target.value }))}
                      placeholder="⭐ We just received a {stars}★ review! Thank you {customer_name}!"
                    />
                    <p className="text-[11.5px] text-muted-foreground">
                      Use <code className="bg-muted px-1 rounded text-[11px]">{"{stars}"}</code> and <code className="bg-muted px-1 rounded text-[11px]">{"{customer_name}"}</code> as placeholders.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
