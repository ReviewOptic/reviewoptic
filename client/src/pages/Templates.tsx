import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Edit2, Save, X, FileText, Mail, MessageSquare, RefreshCw } from "lucide-react";
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

const MERGE_TAGS = ["{{customer_name}}", "{{business_name}}", "{{service_type}}", "{{review_link}}"];

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5" />,
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5 text-green-500" />,
};

function TemplateEditor({ template, onCancel }: { template: Template; onCancel: () => void }) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [bodyEl, setBodyEl] = useState<HTMLTextAreaElement | null>(null);

  const mutation = useMutation({
    mutationFn: async () => apiRequest("PATCH", `/api/templates/${template.id}`, { subject, body }),
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
    .replace(/{{customer_name}}/g, "Sarah")
    .replace(/{{business_name}}/g, "Clean Pro Services")
    .replace(/{{service_type}}/g, "House Cleaning")
    .replace(/{{review_link}}/g, "https://reviewoptic.app/r/abc123");

  return (
    <div className="space-y-4">
      {template.channel === "email" && (
        <div className="space-y-1.5">
          <Label className="text-[12.5px]">Subject Line</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." className="text-[13px]" data-testid="input-template-subject" />
        </div>
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
      {/* Merge tags */}
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
      {/* Preview */}
      <div className="space-y-1.5">
        <Label className="text-[12px] text-muted-foreground">Preview (sample data):</Label>
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-[12.5px] whitespace-pre-wrap text-foreground">
          {preview}
        </div>
      </div>
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

function TemplateCard({ template }: { template: Template }) {
  const [editing, setEditing] = useState(false);

  return (
    <Card className="border-card-border" data-testid={`template-card-${template.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              {channelIcons[template.channel] || <FileText className="w-3.5 h-3.5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-[14px] font-semibold">{template.name}</CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 capitalize">{template.channel}</Badge>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{template.templateType.replace(/_/g, " ")}</Badge>
              </div>
            </div>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1 flex-shrink-0" onClick={() => setEditing(true)} data-testid={`button-edit-template-${template.id}`}>
              <Edit2 className="w-3 h-3" /> Edit
            </Button>
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
            <p className="text-[11px] text-muted-foreground/60">
              Updated {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Templates() {
  const { data: templates, isLoading } = useQuery<Template[]>({ queryKey: ["/api/templates"] });

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
          Customize the messages sent to your customers. Use merge tags to personalize.
        </p>
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
        <Tabs defaultValue="email">
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
                  <p className="text-[13px]">No {ch} templates found</p>
                </div>
              ) : (
                byChannel[ch].map(t => <TemplateCard key={t.id} template={t} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
