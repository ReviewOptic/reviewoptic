import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { Save, ExternalLink, Copy, Check, Globe, Bell, FileCode, Star, Share2, Upload, X, Trash2, UserPlus, Mic, Video } from "lucide-react";
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
  const { user } = useAuth();
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
    country: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ownerName: settings.ownerName || [user?.firstName, user?.lastName].filter(Boolean).join(" "),
        businessName: settings.businessName || user?.companyName || "",
        businessEmail: settings.businessEmail || user?.email || "",
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

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!form.businessEmail) return;
    if (!form.country && !user?.isAdmin) { toast({ title: "Please select your country before saving", variant: "destructive" }); return; }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSaveStatus("saving");
    debounceTimer.current = setTimeout(() => mutation.mutate(), 1500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [form]);

  const widgetCode = `<script src="https://reviewoptic.app/widget.js" data-account-id="${user?.accountId}" data-theme="light"></script>`;

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

      <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "business"}>
        <div className="mb-6 overflow-x-auto">
          <TabsList className="inline-flex w-max h-auto">
            <TabsTrigger value="business" className="text-[12.5px] whitespace-nowrap" data-testid="tab-business">Business</TabsTrigger>
            <TabsTrigger value="platforms" className="text-[12.5px] whitespace-nowrap" data-testid="tab-platforms">Review Platforms</TabsTrigger>
            <TabsTrigger value="followup" className="text-[12.5px] whitespace-nowrap" data-testid="tab-followup">Follow-Ups</TabsTrigger>
            <TabsTrigger value="widget" className="text-[12.5px] whitespace-nowrap" data-testid="tab-widget">Widget</TabsTrigger>
            <TabsTrigger value="social" className="text-[12.5px] whitespace-nowrap" data-testid="tab-social">Social</TabsTrigger>
            <TabsTrigger value="notifications" className="text-[12.5px] whitespace-nowrap" data-testid="tab-notifications">Insight Emails</TabsTrigger>
            <TabsTrigger value="team" className="text-[12.5px] whitespace-nowrap" data-testid="tab-team">Team</TabsTrigger>
          </TabsList>
        </div>

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
                  <Label className="text-[12.5px]">Company Name</Label>
                  <Input
                    value={form.businessName}
                    onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                    placeholder="Clean Pro Services"
                    data-testid="input-business-name"
                  />
                </div>
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
                  <p className="text-[11.5px] text-muted-foreground">This is set from your account email and cannot be changed here.</p>
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
                      <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => window.open((form as any)[key], "_blank")}>
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
              <p className="text-[12.5px] text-muted-foreground">
                The widget displays your average star rating and total number of ratings collected through ReviewOptic. Paste the code below anywhere in your website's HTML.
              </p>
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

        {/* Notifications */}
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <TeamTab />
        </TabsContent>

      </Tabs>

    </div>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const [frequency, setFrequency] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/notification-prefs", { credentials: "include" })
      .then(r => r.json())
      .then(d => setFrequency(d.insightEmailFrequency || "weekly"));
  }, []);

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

  return (
    <Card className="border-card-border">
      <CardHeader>
        <CardTitle className="text-[15px]">Email Reports</CardTitle>
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
