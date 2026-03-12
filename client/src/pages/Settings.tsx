import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Save, ExternalLink, Copy, Check, Globe, Bell, FileCode, Star } from "lucide-react";
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
  const [form, setForm] = useState({
    ownerName: "",
    businessName: "",
    businessEmail: "",
    googleReviewLink: "",
    facebookReviewLink: "",
    defaultChannel: "email",
    followUpEnabled: true,
    followUp1Days: 3,
    followUp2Days: 7,
    maxFollowUps: 2,
    widgetMinStars: 4,
    widgetCount: 5,
    widgetLayout: "grid",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        ownerName: settings.ownerName || "",
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        googleReviewLink: settings.googleReviewLink || "",
        facebookReviewLink: settings.facebookReviewLink || "",
        defaultChannel: settings.defaultChannel || "email",
        followUpEnabled: settings.followUpEnabled ?? true,
        followUp1Days: settings.followUp1Days ?? 3,
        followUp2Days: settings.followUp2Days ?? 7,
        maxFollowUps: settings.maxFollowUps ?? 2,
        widgetMinStars: settings.widgetMinStars ?? 4,
        widgetCount: settings.widgetCount ?? 5,
        widgetLayout: settings.widgetLayout || "grid",
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", "/api/settings", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

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
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-1.5" data-testid="button-save-settings">
          <Save className="w-3.5 h-3.5" />
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="text-[12.5px]" data-testid="tab-business">Business</TabsTrigger>
          <TabsTrigger value="platforms" className="text-[12.5px]" data-testid="tab-platforms">Review Platforms</TabsTrigger>
          <TabsTrigger value="followup" className="text-[12.5px]" data-testid="tab-followup">Follow-Ups</TabsTrigger>
          <TabsTrigger value="widget" className="text-[12.5px]" data-testid="tab-widget">Widget</TabsTrigger>
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
                  <Label className="text-[12.5px]">Business Email</Label>
                  <Input
                    type="email"
                    value={form.businessEmail}
                    onChange={e => setForm(f => ({ ...f, businessEmail: e.target.value }))}
                    placeholder="hello@mybusiness.com"
                    data-testid="input-business-email"
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
            <CardContent className="space-y-5 pb-5">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Google Business Review Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.googleReviewLink}
                    onChange={e => setForm(f => ({ ...f, googleReviewLink: e.target.value }))}
                    placeholder="https://g.page/r/..."
                    className="flex-1"
                    data-testid="input-google-link"
                  />
                  {form.googleReviewLink && (
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => window.open(form.googleReviewLink, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-[11.5px] text-muted-foreground">Find this in your Google Business Profile dashboard → Get more reviews</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Facebook Page Review Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.facebookReviewLink}
                    onChange={e => setForm(f => ({ ...f, facebookReviewLink: e.target.value }))}
                    placeholder="https://www.facebook.com/..."
                    className="flex-1"
                    data-testid="input-facebook-link"
                  />
                  {form.facebookReviewLink && (
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => window.open(form.facebookReviewLink, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
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
      </Tabs>
    </div>
  );
}
