import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { Save, ExternalLink, Copy, Check, Globe, Bell, FileCode, Star, Share2, Upload, X, Trash2, UserPlus, Mic, Video, Gift, Zap, QrCode, Download, RefreshCw } from "lucide-react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TimePicker } from "@/components/ui/time-picker";
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
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState(
    new URLSearchParams(window.location.search).get("tab") || "business"
  );
  const { data: settings, isLoading } = useQuery<SettingsType>({ queryKey: ["/api/settings"] });
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const isDirtyRef = useRef(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [fbManual, setFbManual] = useState(() => new URLSearchParams(window.location.search).get("fbmanual") === "1");
  const [fbPageUrl, setFbPageUrl] = useState("");
  const [fbPageLoading, setFbPageLoading] = useState(false);

  const connectFbPage = async () => {
    if (!fbPageUrl.trim()) return;
    setFbPageLoading(true);
    try {
      const res = await apiRequest("POST", "/api/social/facebook/page", { pageUrl: fbPageUrl });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Couldn't connect Page", description: data.error, variant: "destructive" });
      } else {
        setFbManual(false);
        setFbPageUrl("");
        queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
        toast({ title: "Facebook Page connected!" });
      }
    } finally {
      setFbPageLoading(false);
    }
  };

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
    followUp3Days: 14,
    maxFollowUps: 2,
    widgetMinStars: 4,
    widgetCount: 5,
    widgetLayout: "grid",
    defaultSendTime: "",
    socialPostEnabled: false,
    socialPostMessage: "⭐ We just received a {stars}★ review! Thank you {customer_name}!",
    country: "",
  });
  const formRef = useRef(form);

  useEffect(() => {
    if (settings) {
      setForm({
        ownerName: settings.ownerName || [user?.firstName, user?.lastName].filter(Boolean).join(" "),
        businessName: settings.businessName || user?.companyName || "",
        businessEmail: settings.businessEmail || user?.email || "",
        websiteUrl: settings.websiteUrl || "",
        logoUrl: settings.logoUrl || "",
        logoPosition: settings.logoPosition || "left",
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
        followUp3Days: Math.max(settings.followUp3Days ?? 0, (settings.followUp2Days ?? 7) + 7),
        maxFollowUps: settings.maxFollowUps ?? 2,
        widgetMinStars: settings.widgetMinStars ?? 4,
        widgetCount: settings.widgetCount ?? 5,
        widgetLayout: settings.widgetLayout || "grid",
        defaultSendTime: settings.defaultSendTime || "",
        socialPostEnabled: settings.socialPostEnabled ?? false,
        socialPostMessage: settings.socialPostMessage || "⭐ We just received a {stars}★ review! Thank you {customer_name}!",
        country: settings.country || "",
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

  // Track form changes so we can auto-save on exit
  useEffect(() => { formRef.current = form; isDirtyRef.current = true; }, [form]);

  // Auto-save silently when user navigates away (only if form is valid)
  useEffect(() => {
    return () => {
      const f = formRef.current;
      if (!isDirtyRef.current) return;
      if (!f.businessEmail || (!f.ownerName.trim() && !f.businessName.trim())) return;
      apiRequest("PATCH", "/api/settings", f).catch(() => {});
    };
  }, []);

  function handleSave() {
    if (!form.businessEmail) { toast({ title: "Business email is required", variant: "destructive" }); return; }
    if (!form.ownerName.trim() && !form.businessName.trim()) { toast({ title: "Please enter at least your name or company name", variant: "destructive" }); return; }
    if (!form.country && !user?.isAdmin) { toast({ title: "Please select your country before saving", variant: "destructive" }); return; }
    setSaveStatus("saving");
    mutation.mutate();
  }

  const widgetCode = `<script src="https://reviewoptic.app/widget.js" data-account-id="${user?.accountId}" data-theme="light"></script>`;

  const handleCopyWidget = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Embed code copied!" });
  };

  if (isLoading) return (
    <div className="px-6 py-7 max-w-5xl mx-auto space-y-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
    </div>
  );

  return (
    <div className="px-6 py-7 max-w-5xl mx-auto">
      <div className="flex items-center justify-between -mx-6 -mt-7 px-6 py-5 mb-6 bg-primary/[0.07] border-b border-primary/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">Configure your ReviewOptic account</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && <span className="text-green-600 flex items-center gap-1 text-[12.5px]"><Check className="w-3.5 h-3.5" /> Saved</span>}
          <Button size="sm" onClick={handleSave} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? <><Save className="w-3.5 h-3.5 mr-1.5 animate-pulse" /> Saving…</> : <><Save className="w-3.5 h-3.5 mr-1.5" /> Save</>}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={tab => { setActiveTab(tab); navigate(`/settings?tab=${tab}`, { replace: true }); }}>
        <div className="flex flex-col gap-4 md:flex-row md:gap-6 md:items-start">
          <TabsList className="flex flex-row flex-wrap h-auto md:flex-col md:w-44 md:shrink-0 bg-muted/50 rounded-xl p-1.5 gap-0.5">
            <TabsTrigger value="business" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-business">Business</TabsTrigger>
            <TabsTrigger value="platforms" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-platforms">Review Platforms</TabsTrigger>
            <TabsTrigger value="followup" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-followup">Follow-Ups</TabsTrigger>
            <TabsTrigger value="widget" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-widget">Widget</TabsTrigger>
            <TabsTrigger value="social" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-social">Social</TabsTrigger>
            <TabsTrigger value="notifications" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="team" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-team">
              <span className="flex items-center gap-1.5">
                Team
                {user?.planType === "lite" && <span className="text-[10px] font-semibold bg-background text-muted-foreground px-1.5 py-0.5 rounded">Pro</span>}
              </span>
            </TabsTrigger>
            <TabsTrigger value="referral" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-referral">Referral</TabsTrigger>
            <TabsTrigger value="integrations" className="whitespace-nowrap md:w-full md:justify-start text-[12.5px] px-3 py-2 rounded-lg" data-testid="tab-integrations">Integrations</TabsTrigger>
          </TabsList>
          <div className="flex-1 min-w-0">

        {/* Business Info */}
        <TabsContent value="business">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-[15px]">Business Information</CardTitle>
              <CardDescription className="text-[12.5px]">This info is used in your message templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pb-5">
              <div className="space-y-1">
                <p className="text-[11.5px] text-muted-foreground">At least company name or your name is required</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px]">Company Name</Label>
                    <Input
                      value={form.businessName}
                      onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                      placeholder="Clean Pro Services"
                      data-testid="input-business-name"
                      className={!form.ownerName.trim() && !form.businessName.trim() ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12.5px]">Your Name</Label>
                    <Input
                      value={form.ownerName}
                      onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                      placeholder="e.g. Sarah"
                      data-testid="input-owner-name"
                      className={!form.ownerName.trim() && !form.businessName.trim() ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                  </div>
                </div>
                {!form.ownerName.trim() && !form.businessName.trim() && (
                  <p className="text-[11.5px] text-destructive">At least company name or your name is required</p>
                )}
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
                          className={`px-2.5 py-1 rounded text-[12px] font-medium border transition-colors ${cropAspect === a.value ? "bg-selected text-selected-foreground border-selected" : "border-border text-muted-foreground hover:text-foreground"}`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative h-40 sm:h-56 rounded-lg overflow-hidden border border-border bg-muted/30">
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                  <Label className="text-[12.5px]">Business Email</Label>
                  <Input
                    type="email"
                    value={form.businessEmail}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                    data-testid="input-business-email"
                  />
                  <ChangeEmailButton />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Password</Label>
                  <ChangePasswordButton email={form.businessEmail || user?.email || ""} />
                </div>
                {!user?.isAdmin && <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Country <span className="text-destructive">*</span></Label>
                  <select
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select your country</option>
                    {["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>}
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
                      <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => {
                        const raw = (form as any)[key].trim();
                        window.open(raw.startsWith("http") ? raw : `https://${raw}`, "_blank");
                      }}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
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
                    <p className="text-[11.5px] text-muted-foreground">Send the first follow-up {form.followUp1Days} days after the initial request</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12.5px]">Second Follow-Up</Label>
                      <span className="text-[13px] font-medium text-primary">{form.followUp2Days - form.followUp1Days} days</span>
                    </div>
                    <Slider
                      min={form.followUp1Days + 1}
                      max={30}
                      step={1}
                      value={[form.followUp2Days]}
                      onValueChange={([v]) => setForm(f => ({ ...f, followUp2Days: v }))}
                      data-testid="slider-followup-2"
                    />
                    <p className="text-[11.5px] text-muted-foreground">Send the second follow-up {form.followUp2Days - form.followUp1Days} days after the first follow-up</p>
                  </div>
                  {form.maxFollowUps >= 3 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[12.5px]">Third Follow-Up</Label>
                        <span className="text-[13px] font-medium text-primary">{form.followUp3Days - form.followUp2Days} days</span>
                      </div>
                      <Slider
                        min={form.followUp2Days + 1}
                        max={60}
                        step={1}
                        value={[form.followUp3Days]}
                        onValueChange={([v]) => setForm(f => ({ ...f, followUp3Days: v }))}
                        data-testid="slider-followup-3"
                      />
                      <p className="text-[11.5px] text-muted-foreground">Send the third follow-up {form.followUp3Days - form.followUp2Days} days after the second follow-up</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12.5px]">Maximum Follow-Ups</Label>
                      <span className="text-[13px] font-medium text-primary">{form.maxFollowUps}</span>
                    </div>
                    <Slider
                      min={1}
                      max={3}
                      step={1}
                      value={[form.maxFollowUps]}
                      onValueChange={([v]) => setForm(f => ({ ...f, maxFollowUps: v }))}
                      data-testid="slider-max-followups"
                    />
                    <p className="text-[11.5px] text-muted-foreground">Stop after {form.maxFollowUps} total follow-up{form.maxFollowUps !== 1 ? "s" : ""} with no response</p>
                  </div>
                </>
              )}

              <div className="pt-2 pb-1 rounded-lg bg-muted/50 border border-border px-4 py-3">
                <p className="text-[12.5px] font-medium mb-0.5">Follow-up message templates</p>
                <p className="text-[12px] text-muted-foreground">
                  Customise what each follow-up says in the{" "}
                  <a href="/templates" className="text-primary underline underline-offset-2 hover:text-primary/80">Templates tab</a>.
                  Each channel (Email, SMS, WhatsApp) has its own Follow-up 1, 2 &amp; 3 templates.
                </p>
              </div>

              <div className="pt-4 border-t border-border space-y-1.5">
                <Label className="text-[12.5px]">Default send time</Label>
                <TimePicker
                  value={form.defaultSendTime || "09:00"}
                  onChange={v => setForm(f => ({ ...f, defaultSendTime: v }))}
                />
                <p className="text-[11.5px] text-muted-foreground">When set, the send dialog will pre-select this time for scheduled sends.</p>
              </div>
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
              <p className="text-[12.5px] text-muted-foreground">
                Displays a row of rating cards on your website — customer name, stars, and date. Paste the embed code anywhere in your site's HTML.
              </p>

              {/* Config controls */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Minimum stars</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-[13px]"
                    value={form.widgetMinStars}
                    onChange={e => setForm(f => ({ ...f, widgetMinStars: Number(e.target.value) }))}
                  >
                    <option value={4}>4 stars and above</option>
                    <option value={5}>5 stars only</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Number to show</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-[13px]"
                    value={form.widgetCount}
                    onChange={e => setForm(f => ({ ...f, widgetCount: Number(e.target.value) }))}
                  >
                    {[3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} ratings</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Layout</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-[13px]"
                    value={form.widgetLayout}
                    onChange={e => setForm(f => ({ ...f, widgetLayout: e.target.value }))}
                  >
                    <option value="grid">Grid</option>
                    <option value="carousel">Carousel</option>
                  </select>
                </div>
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
                  Change <code className="text-[11.5px] font-mono bg-background px-1 py-0.5 rounded border border-border">data-theme="light"</code> to <code className="text-[11.5px] font-mono bg-background px-1 py-0.5 rounded border border-border">data-theme="dark"</code> if your website has a dark background.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Social Auto-Post */}
        <TabsContent value="social">
          <div className="space-y-4">

            {/* Connected Accounts */}
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-[15px]">Connected Accounts</CardTitle>
                <CardDescription className="text-[12.5px]">
                  Connect your accounts to auto-post a review card image when a 4 or 5 star rating is received.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pb-5">
                {/* Facebook row */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FaFacebook className="w-8 h-8 flex-shrink-0 text-[#1877F2]" />
                      <div>
                        <p className="text-[13.5px] font-medium">Facebook</p>
                        {settings?.facebookPageAccessToken ? (
                          <p className="text-[12px] text-green-600 font-medium">Connected</p>
                        ) : fbManual ? (
                          <p className="text-[12px] text-amber-600">Enter your Page URL to finish connecting</p>
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
                        <Button variant="outline" size="sm" className="text-[12px]" onClick={() => window.location.href = "/auth/facebook"}>
                          Connect Facebook
                        </Button>
                      )}
                    </div>
                  </div>
                  {fbManual && !settings?.facebookPageAccessToken && (
                    <div className="flex gap-2 items-center pl-11">
                      <Input
                        value={fbPageUrl}
                        onChange={e => setFbPageUrl(e.target.value)}
                        placeholder="https://www.facebook.com/YourPageName"
                        className="text-[12px] h-8"
                        onKeyDown={e => e.key === "Enter" && connectFbPage()}
                        autoFocus
                      />
                      <Button size="sm" className="text-[12px] h-8 shrink-0" onClick={connectFbPage} disabled={fbPageLoading}>
                        {fbPageLoading ? "Connecting…" : "Connect"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border" />

                {/* Instagram row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FaInstagram className="w-8 h-8 flex-shrink-0 text-[#E1306C]" />
                    <div>
                      <p className="text-[13.5px] font-medium">Instagram</p>
                      {(settings as any)?.instagramBusinessAccountId ? (
                        <p className="text-[12px] text-green-600 font-medium">Connected</p>
                      ) : settings?.facebookPageAccessToken ? (
                        <p className="text-[12px] text-amber-600">
                          No Instagram Business account found on your Facebook Page.{" "}
                          <a href="https://www.facebook.com/help/1148909221857370" target="_blank" rel="noopener noreferrer" className="underline">
                            Link your Instagram account to your Page
                          </a>
                          {" "}then disconnect and reconnect Facebook here.
                        </p>
                      ) : (
                        <p className="text-[12px] text-muted-foreground">
                          Connects automatically when you connect Facebook — Instagram's API requires a linked Facebook Page to enable posting.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* LinkedIn row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FaLinkedin className="w-8 h-8 flex-shrink-0 text-[#0A66C2]" />
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
                      <Button variant="outline" size="sm" className="text-[12px]" onClick={() => window.location.href = "/auth/linkedin"}>
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
                      Use <code className="bg-muted px-1 rounded text-[11px]">{"{stars}"}</code> and <code className="bg-muted px-1 rounded text-[11px]">{"{customer_name}"}</code> as placeholders. Customer name shows as initials only (e.g. J. S.) to protect privacy.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <TeamTab />
        </TabsContent>

        {/* Referral */}
        <TabsContent value="referral">
          <ReferralTab />
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

          </div>{/* end flex-1 content column */}
        </div>{/* end flex row */}
      </Tabs>

    </div>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settingsData } = useQuery<any>({ queryKey: ["/api/settings"] });
  const [frequency, setFrequency] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifyRatings, setNotifyRatings] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/user/notification-prefs", { credentials: "include" })
      .then(r => r.json())
      .then(d => setFrequency(d.insightEmailFrequency || "weekly"));
  }, []);

  useEffect(() => {
    if (settingsData) setNotifyRatings(settingsData.notifyRatings ?? true);
  }, [settingsData]);

  const save = async (val: string) => {
    setFrequency(val);
    setSaving(true);
    try {
      await fetch("/api/user/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ insightEmailFrequency: val }),
      });
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveNotifyRatings = async (val: boolean) => {
    setNotifyRatings(val);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notifyRatings: val }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-[15px]">Rating Notifications</CardTitle>
          <CardDescription className="text-[12.5px]">
            Get notified by email when a customer submits a star rating or private feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-[13.5px] font-medium">Email me when a rating is received</p>
              <p className="text-[12px] text-muted-foreground">Sends an instant email to your account address each time a customer rates you</p>
            </div>
            <input
              type="checkbox"
              checked={notifyRatings}
              onChange={e => saveNotifyRatings(e.target.checked)}
              className="w-4 h-4 accent-primary shrink-0"
            />
          </label>
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-[15px]">Insight Email Reports</CardTitle>
          <CardDescription className="text-[12.5px]">
            ReviewOptic sends you a personalised report with your review stats, conversion rate, and AI-generated insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pb-5">
          <div className="space-y-1.5">
            <Label className="text-[12.5px]">Report frequency</Label>
            {frequency === null ? (
              <p className="text-[12.5px] text-muted-foreground">Loading…</p>
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  { value: "weekly", label: "Weekly", desc: "Receive a report every 7 days" },
                  { value: "monthly", label: "Monthly", desc: "Receive a report once a month" },
                  { value: "never", label: "Never", desc: "Opt out — no report emails" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <input
                      type="radio"
                      name="frequency"
                      value={opt.value}
                      checked={frequency === opt.value}
                      onChange={() => save(opt.value)}
                      disabled={saving}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <p className="text-[13.5px] font-medium">{opt.label}</p>
                      <p className="text-[12px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: settings } = useQuery<{ businessName: string }>({ queryKey: ["/api/settings"] });
  const [members, setMembers] = useState<any[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const load = () =>
    fetch("/api/team", { credentials: "include" })
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setMembers(d) : null)
      .catch(() => {});

  useEffect(() => { load(); }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Invitation sent", description: `An invite has been sent to ${email}` });
      setEmail(""); setFirstName(""); setLastName("");
      load();
    } catch (err: any) {
      toast({ title: "Failed to invite", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const revoke = async (memberId: string) => {
    await fetch(`/api/team/${memberId}`, { method: "DELETE", credentials: "include" });
    setConfirmRevoke(null);
    load();
  };

  const toggleActive = async (memberId: string, active: boolean) => {
    await fetch(`/api/team/${memberId}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active }),
    });
    load();
  };

  if (user?.role === "member") {
    return (
      <Card className="border-card-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Only the account owner can manage team members.</p>
        </CardContent>
      </Card>
    );
  }

  if (user?.planType === "lite") {
    return (
      <Card className="border-card-border">
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
            <UserPlus className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[14px] font-semibold">Team members are a Pro feature</p>
            <p className="text-[12.5px] text-muted-foreground mt-1 max-w-xs mx-auto">
              Upgrade to Pro to invite your team and let them log in and send review requests.
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/billing"}
            className="inline-block mt-1 bg-primary text-primary-foreground text-[12.5px] font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Upgrade to Pro
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-[15px]">Invite a team member</CardTitle>
          <CardDescription className="text-[12.5px]">
            They'll receive an email to set their password and join <strong>{settings?.businessName || "your account"}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="space-y-4">
            <div className="flex gap-2">
              <div className="space-y-1.5 flex-1">
                <Label className="text-[12.5px]">First name</Label>
                <Input placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-[12.5px]">Last name</Label>
                <Input placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Email address</Label>
              <Input type="email" placeholder="jane@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Company</Label>
              <Input value={settings?.businessName || ""} disabled className="bg-muted cursor-not-allowed" />
            </div>
            <Button type="submit" disabled={inviting} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {inviting ? "Sending invite…" : "Send invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team members list */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-[15px]">Team members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet. Invite someone above.</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-[13.5px] font-medium">{m.first_name} {m.last_name}</p>
                    <p className="text-[12px] text-muted-foreground">{m.email}</p>
                    <div className="mt-1">
                      {!m.email_verified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Invite pending
                        </span>
                      ) : m.is_active === false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Deactivated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!m.email_verified && (
                      <Button size="sm" variant="outline" className="text-[12px]" onClick={async () => {
                        await fetch(`/api/team/${m.id}/resend-invite`, { method: "POST", credentials: "include" });
                        toast({ title: "Invite resent", description: `A new invite has been sent to ${m.email}` });
                      }}>
                        Resend invite
                      </Button>
                    )}
                    {m.email_verified && (
                      m.is_active === false ? (
                        <Button size="sm" variant="outline" onClick={() => toggleActive(m.id, true)} className="text-green-600 hover:text-green-600">
                          Reactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => toggleActive(m.id, false)} className="text-yellow-600 hover:text-yellow-600">
                          Deactivate
                        </Button>
                      )
                    )}
                    {confirmRevoke === m.id ? (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => revoke(m.id)}>Confirm</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmRevoke(null)}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirmRevoke(m.id)} className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChangeEmailButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!newEmail.includes("@")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      } else {
        toast({ title: "Verification email sent", description: `A verification link has been sent to ${newEmail}. Click it to confirm your new address.` });
        setOpen(false);
        setNewEmail("");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <p className="text-[11.5px] text-muted-foreground">
        Need to correct your email?{" "}
        <button onClick={() => setOpen(true)} className="underline text-primary">Change it here</button>
      </p>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        type="email"
        placeholder="Enter new email address"
        value={newEmail}
        onChange={e => setNewEmail(e.target.value)}
        className="text-[13px]"
        autoFocus
      />
      <Button size="sm" onClick={save} disabled={loading || !newEmail.includes("@")}>
        {loading ? "Saving…" : "Save"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setNewEmail(""); }}>Cancel</Button>
    </div>
  );
}

function ChangePasswordButton({ email }: { email: string }) {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!email) return;
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
    toast({ title: "Password reset email sent", description: `Check ${email} for the reset link.` });
  };

  return sent ? (
    <p className="text-[12.5px] text-green-600 font-medium">Reset link sent — check your email.</p>
  ) : (
    <Button type="button" variant="outline" size="sm" onClick={send} disabled={loading}>
      {loading ? "Sending…" : "Send password reset email"}
    </Button>
  );
}

function ReferralTab() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const { data: settings } = useQuery<SettingsType>({ queryKey: ["/api/settings"] });
  const { data: referralStats } = useQuery<{ count: number }>({ queryKey: ["/api/referrals/stats"] });

  const appUrl = window.location.origin;
  const slug = settings?.businessName
    ? settings.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : user?.accountId?.slice(0, 8) ?? "my-business";
  const referralLink = `${appUrl}/referral/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-card-border">
      <CardHeader>
        <CardTitle className="text-[15px] flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" /> Refer a Business
        </CardTitle>
        <CardDescription className="text-[12.5px]">
          Share ReviewOptic with other business owners and earn a reward when they sign up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center space-y-1">
          <p className="text-[12px] text-muted-foreground uppercase tracking-wide font-medium">Your referral reward</p>
          <p className="text-[15px] font-semibold text-foreground">1 free month for every business you refer</p>
          <p className="text-[12px] text-muted-foreground">When someone signs up and pays using your link, we'll credit one month's fee (based on their plan at sign-up) to your account. Credits stack and apply automatically to your future invoices — including annual ones.</p>
        </div>
        <div className="rounded-xl border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium">Successful referrals</p>
            <p className="text-[12px] text-muted-foreground">Businesses that signed up and paid via your link</p>
          </div>
          <span className="text-[22px] font-bold text-primary">{referralStats?.count ?? 0}</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-medium">Your unique referral link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 h-9 rounded-md border border-input bg-muted/40 px-3 text-[12.5px] text-muted-foreground select-all"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5 shrink-0">
              {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
          </div>
          <p className="text-[11.5px] text-muted-foreground">Anyone who signs up using your link will be tracked to your account.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12.5px] font-medium">Share via</label>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "WhatsApp",
                url: `https://wa.me/?text=${encodeURIComponent(`I've been using ReviewOptic to send review requests and get follow-ups on autopilot — it's been great. Sign up here: ${referralLink}`)}`,
              },
              {
                label: "Facebook",
                url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
              },
              {
                label: "X (Twitter)",
                url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I've been using ReviewOptic to send review requests and follow up on autopilot — really useful for any business. Check it out:`)}&url=${encodeURIComponent(referralLink)}`,
              },
              {
                label: "LinkedIn",
                url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
              },
              {
                label: "Email",
                url: `mailto:?subject=You should try ReviewOptic&body=${encodeURIComponent(`Hi,\n\nI've been using ReviewOptic to send review requests and follow up on autopilot — it's made a real difference. Thought you might find it useful too.\n\nSign up here: ${referralLink}\n\nBest`)}`,
              },
              {
                label: "SMS",
                url: `sms:?body=${encodeURIComponent(`Check out ReviewOptic — send review requests and follow up on autopilot. Sign up here: ${referralLink}`)}`,
              },
            ].map(s => (
              <Button key={s.label} variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(s.url, "_blank")}>
                <Share2 className="w-3.5 h-3.5" /> {s.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { data: webhookData, refetch: refetchWebhook } = useQuery<{ token: string; webhookUrl: string }>({
    queryKey: ["/api/settings/webhook-token"],
    queryFn: async () => {
      const res = await fetch("/api/settings/webhook-token", { credentials: "include" });
      return res.json();
    },
  });

  const accountId = user?.accountId ?? "";
  const qrUrl = accountId ? `/api/public/qr/${accountId}` : null;
  const scanUrl = accountId ? `${window.location.origin}/scan/${accountId}` : "";

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookData?.webhookUrl || "");
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const copyScanUrl = () => {
    navigator.clipboard.writeText(scanUrl);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  const downloadQr = async () => {
    if (!qrUrl) return;
    const res = await fetch(qrUrl);
    const svg = await res.text();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "reviewoptic-qr.svg";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const regenerateToken = async () => {
    if (!confirm("This will invalidate your current webhook URL. Any existing Zapier zaps will need to be updated. Continue?")) return;
    setRegenerating(true);
    await fetch("/api/settings/webhook-token/regenerate", { method: "POST", credentials: "include" }).catch(() => {});
    await refetchWebhook();
    setRegenerating(false);
    toast({ title: "Webhook URL regenerated" });
  };

  return (
    <div className="space-y-6">
      {/* QR Code */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-[15px] flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" /> QR Code
          </CardTitle>
          <CardDescription className="text-[12.5px]">
            Print this on receipts, flyers, or your counter. Customers scan it to rate their experience on the spot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
            {qrUrl && (
              <div className="shrink-0 w-36 h-36 border border-border rounded-xl overflow-hidden bg-white p-2">
                <img src={qrUrl} alt="QR code" className="w-full h-full" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium">Scan link</label>
                <div className="flex gap-2">
                  <input
                    readOnly value={scanUrl}
                    className="flex-1 h-9 rounded-md border border-input bg-muted/40 px-3 text-[12px] text-muted-foreground select-all"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" variant="outline" onClick={copyScanUrl} className="gap-1.5 shrink-0">
                    {qrCopied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={downloadQr} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download QR (SVG)
              </Button>
              <p className="text-[11.5px] text-muted-foreground">
                4–5★ ratings are directed to your review platforms. 1–3★ ratings go to a private feedback form.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zapier Webhook */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-[15px] flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Zapier Webhook
          </CardTitle>
          <CardDescription className="text-[12.5px]">
            Connect any booking system (Acuity, Calendly, Jobber, etc.) to automatically add customers and schedule review requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-medium">Your webhook URL</label>
            <div className="flex gap-2">
              <input
                readOnly value={webhookData?.webhookUrl || "Loading..."}
                className="flex-1 h-9 rounded-md border border-input bg-muted/40 px-3 text-[12px] text-muted-foreground select-all"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <Button size="sm" variant="outline" onClick={copyWebhook} className="gap-1.5 shrink-0">
                {webhookCopied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </Button>
            </div>
            <p className="text-[11.5px] text-muted-foreground">Keep this URL private. Anyone with it can add customers to your account.</p>
          </div>

          <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-3">
            <p className="text-[12.5px] font-semibold">How to use in Zapier</p>
            <ol className="text-[12px] text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Create a new Zap. Set your booking app (e.g. Acuity) as the trigger.</li>
              <li>Add a <strong>Webhooks by Zapier</strong> action → <strong>POST</strong>.</li>
              <li>Paste your webhook URL above into the URL field.</li>
              <li>Set Data Type to <strong>JSON</strong> and map the fields below.</li>
            </ol>
            <div className="rounded-lg bg-background border border-border p-3 font-mono text-[11.5px] space-y-1 text-foreground">
              <p className="text-muted-foreground mb-1">JSON fields:</p>
              <p><span className="text-primary">firstName</span> <span className="text-muted-foreground">— required</span></p>
              <p><span className="text-primary">lastName</span> <span className="text-muted-foreground">— optional</span></p>
              <p><span className="text-primary">email</span> <span className="text-muted-foreground">— required if no phone</span></p>
              <p><span className="text-primary">phone</span> <span className="text-muted-foreground">— required if no email</span></p>
              <p><span className="text-primary">channel</span> <span className="text-muted-foreground">— "email", "sms", or "whatsapp"</span></p>
              <p><span className="text-primary">scheduledSendDate</span> <span className="text-muted-foreground">— optional, ISO format e.g. "2026-04-15T09:00:00"</span></p>
              <p><span className="text-primary">serviceType</span> <span className="text-muted-foreground">— optional</span></p>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              If <strong>scheduledSendDate</strong> is set, the review request fires automatically on that date. If omitted, the customer is added but no request is sent until you trigger it manually.
            </p>
          </div>

          <Button size="sm" variant="ghost" onClick={regenerateToken} disabled={regenerating} className="gap-1.5 text-muted-foreground hover:text-destructive">
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} /> Regenerate webhook URL
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
