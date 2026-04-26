import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Download, Sparkles } from "lucide-react";

export const Route = createFileRoute("/signup/$code")({
  head: ({ params }) => ({
    meta: [
      { title: "Sign up — Boys & Girls Club" },
      { name: "description", content: "Quick sign-up — takes 30 seconds. Show your QR code at the Club!" },
      { property: "og:title", content: "Sign up for the Club" },
      { property: "og:description", content: "Quick sign-up — show your QR at the door." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { code } = Route.useParams();
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentContact, setParentContact] = useState("");
  const [grade, setGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupId, setSignupId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Decode optional staff_user_id from the code: format is `<staffUserId>` or `kit_<random>` etc.
  // We'll just store `code` as kit_code; staff_user_id is parsed if it looks like a UUID.
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

  const submit = async () => {
    if (!childName.trim() || !parentName.trim()) {
      toast.error("Please fill in child and parent name");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("signups")
        .insert({
          child_name: childName.trim().slice(0, 120),
          parent_name: parentName.trim().slice(0, 120),
          parent_contact: parentContact.trim().slice(0, 200) || null,
          grade: grade.trim().slice(0, 40) || null,
          notes: notes.trim().slice(0, 500) || null,
          kit_code: code,
          staff_user_id: looksLikeUuid ? code : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      setSignupId(data.id);

      // Build QR with check-in URL
      const checkInUrl = `${window.location.origin}/signup/check-in/${data.id}`;
      const url = await QRCode.toDataURL(checkInUrl, { width: 512, margin: 2, color: { dark: "#004B87", light: "#FFFFFF" } });
      setQrDataUrl(url);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (qrDataUrl && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current!;
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d")!.drawImage(img, 0, 0);
      };
      img.src = qrDataUrl;
    }
  }, [qrDataUrl]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `signup-${(signupId ?? "").slice(0, 8)}.png`;
    a.click();
  };

  if (signupId && qrDataUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--bgckc-green,142_85%_38%))] text-white shadow-warm">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl text-ink">You're signed up!</h1>
          <p className="mt-2 text-muted-foreground">
            Show this QR code at the front desk on your first visit. Staff will check {childName} in.
          </p>

          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-warm">
            <img src={qrDataUrl} alt="Your sign-up QR code" className="mx-auto h-64 w-64" />
            <p className="mt-3 text-xs text-muted-foreground">Sign-up ID: {signupId.slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={downloadQr} className="rounded-full" size="lg">
              <Download className="mr-2 h-4 w-4" /> Download QR code
            </Button>
            <Link to="/" className="text-sm text-muted-foreground underline">Back to home</Link>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Quick sign-up
          </div>
          <h1 className="mt-3 font-display text-3xl text-ink">Welcome to the Club!</h1>
          <p className="mt-2 text-muted-foreground">Takes 30 seconds. You'll get a QR code to show at the front desk.</p>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div>
            <Label htmlFor="child">Child's name *</Label>
            <Input id="child" value={childName} onChange={(e) => setChildName(e.target.value)} className="mt-1.5" placeholder="Jordan Lee" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="parent">Parent / guardian name *</Label>
            <Input id="parent" value={parentName} onChange={(e) => setParentName(e.target.value)} className="mt-1.5" placeholder="Alex Lee" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="contact">Phone or email (so staff can reach you)</Label>
            <Input id="contact" value={parentContact} onChange={(e) => setParentContact(e.target.value)} className="mt-1.5" placeholder="(555) 123-4567" maxLength={200} />
          </div>
          <div>
            <Label htmlFor="grade">Grade or age</Label>
            <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="mt-1.5" placeholder="6th grade" maxLength={40} />
          </div>
          <div>
            <Label htmlFor="notes">Anything we should know? (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={3} placeholder="Allergies, interests, etc." maxLength={500} />
          </div>
          <Button onClick={submit} disabled={submitting || !childName.trim() || !parentName.trim()} size="lg" className="w-full rounded-full shadow-warm">
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating QR...</>
            ) : (
              <>Get my QR code</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
