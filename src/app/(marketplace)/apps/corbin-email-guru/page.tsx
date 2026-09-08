"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Mail,
  Send,
  Upload,
  CalendarDays,
  Link as LinkIcon,
  Users,
  CheckCircle,
  Settings,
  Clock,
  Loader2,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const canUseLocalStorage = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const saveToLocalStorage = <T,>(key: string, value: T) => {
  try {
    if (canUseLocalStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`Failed to persist ${key}`, error);
  }
};

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    if (!canUseLocalStorage) return defaultValue;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  } catch (error) {
    console.warn(`Falling back to default for ${key}`, error);
    return defaultValue;
  }
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
};

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

type TokenState = {
  google?: boolean;
  outlook?: boolean;
};

const SAMPLE_TEMPLATE = `Subject: {{Company}} × NICE — Quick win on AI-powered CX

Hi {{FirstName}},

Corbin here — your friendly *Corbin Email Guru*. We help teams like {{Company}} automate agent workflows, boost CSAT, and cut handle time with NICE's agentic automation.

Would a quick 15 minutes {{BestDay}} work to see how we:
• Cut AHT by 12–25% with real-time guidance
• Deflect low-value contacts with intent-driven self-service
• Lift FCR using AI knowledge suggestions

If you're not the right person, mind pointing me their way? Either way — Enjoy the Day!

— Corbin`;

const SAMPLE_CONTACTS: Contact[] = [
  { id: "1", firstName: "Erik", lastName: "D.", company: "Dick's Sporting Goods", email: "erik@example.com" },
  { id: "2", firstName: "Geoff", lastName: "H.", company: "Dick's Sporting Goods", email: "geoff@example.com" },
  { id: "3", firstName: "Alyssa", lastName: "L.", company: "Stitch Fix", email: "alyssa@example.com" },
  { id: "4", firstName: "Michael", lastName: "E.", company: "Nextlink", email: "michael@example.com" },
];

const TOKEN_KEY = "corbin-email-guru:tokens";
const CONTACTS_KEY = "corbin-email-guru:contacts";
const TEMPLATE_KEY = "corbin-email-guru:template";
const CADENCE_KEY = "corbin-email-guru:cadence";

const PLACEHOLDERS = ["FirstName", "LastName", "Company", "BestDay"] as const;

const getUid = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

export default function Page() {
  const tokenState = loadFromLocalStorage<TokenState>(TOKEN_KEY, {});
  const [googleConnected, setGoogleConnected] = useState<boolean>(!!tokenState.google);
  const [outlookConnected, setOutlookConnected] = useState<boolean>(!!tokenState.outlook);
  const [isConnecting, setIsConnecting] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(() => loadFromLocalStorage(CONTACTS_KEY, SAMPLE_CONTACTS));
  const [search, setSearch] = useState("");

  const [template, setTemplate] = useState(() => loadFromLocalStorage(TEMPLATE_KEY, SAMPLE_TEMPLATE));
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const cadenceDefaults = loadFromLocalStorage(CADENCE_KEY, { freq: "WEEKLY" as Frequency, steps: 3 });
  const [frequency, setFrequency] = useState<Frequency>(cadenceDefaults.freq);
  const [steps, setSteps] = useState<number>(cadenceDefaults.steps);
  const [sendTime, setSendTime] = useState("09:00");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiInstruction, setAiInstruction] = useState("");
  const [aiEditing, setAiEditing] = useState(false);

  useEffect(() => {
    saveToLocalStorage(TEMPLATE_KEY, template);
  }, [template]);

  useEffect(() => {
    saveToLocalStorage(CONTACTS_KEY, contacts);
  }, [contacts]);

  useEffect(() => {
    saveToLocalStorage(CADENCE_KEY, { freq: frequency, steps });
  }, [frequency, steps]);

  const visibleContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const term = search.toLowerCase();
    return contacts.filter((contact) =>
      [contact.firstName, contact.lastName, contact.company, contact.email]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [contacts, search]);

  const applyTemplate = (contact: Contact) => {
    const subjectMatch = template.match(/^Subject:\s*(.*)$/m);
    let subject = subjectMatch ? subjectMatch[1] : "";
    let body = template.replace(/^Subject:.*\r?\n?/, "");

    const tokenMap: Record<string, string> = {
      FirstName: contact.firstName || "there",
      LastName: contact.lastName || "",
      Company: contact.company || "your team",
      BestDay: "next week",
    };

    Object.entries(tokenMap).forEach(([key, value]) => {
      subject = subject.replaceAll(`{{${key}}}`, value);
      body = body.replaceAll(`{{${key}}}`, value);
    });

    return { subject, body };
  };

  const handleConnect = async (provider: "google" | "outlook") => {
    setIsConnecting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const nextTokens: TokenState = loadFromLocalStorage(TOKEN_KEY, {});
      if (provider === "google") {
        nextTokens.google = true;
        setGoogleConnected(true);
      } else {
        nextTokens.outlook = true;
        setOutlookConnected(true);
      }
      saveToLocalStorage(TOKEN_KEY, nextTokens);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    const parsed: Contact[] = rows.map((row) => {
      const [email = "", firstName = "", lastName = "", company = ""] = row.split(",");
      return {
        id: getUid(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
      };
    });
    setContacts((prev) => [...prev, ...parsed]);
  };

  const buildPreview = () => {
    const first = visibleContacts[0];
    if (!first) {
      setPreview("No contacts selected.");
      return;
    }
    const { subject, body } = applyTemplate(first);
    setPreview(`To: ${first.email}\nSubject: ${subject}\n\n${body}`);
  };

  const handleSend = async () => {
    if (!googleConnected && !outlookConnected) {
      window.alert("Connect Gmail or Outlook first.");
      return;
    }
    setSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      window.alert(`Queued ${visibleContacts.length} emails. Check the Dashboard for status.`);
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!googleConnected && !outlookConnected) {
      window.alert("Connect Gmail or Outlook first.");
      return;
    }
    const when = startDate instanceof Date && !Number.isNaN(startDate.valueOf()) ? startDate : new Date();
    window.alert(`Scheduled ${steps} touches starting ${format(when, "PPP")} at ${sendTime} (${frequency}).`);
  };

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      { id: getUid(), firstName: "", lastName: "", company: "", email: "" },
    ]);
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts((prev) => prev.map((contact) => (contact.id === id ? { ...contact, [field]: value } : contact)));
  };

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
  };

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) return;
    setAiEditing(true);
    try {
      const response = await fetch("/api/ai/edit-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, instruction: aiInstruction }),
      });
      if (response.ok) {
        const data = (await response.json()) as { template?: string };
        if (data.template?.trim()) {
          setTemplate(data.template);
        }
      }
    } catch (error) {
      console.error("AI edit failed", error);
    } finally {
      setAiEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Corbin Email Guru</h1>
            <p className="text-slate-600">Automated, on-brand outreach for NICE accounts — powered by you.</p>
          </div>
          <Badge variant="secondary" className="text-base">
            Persona: Corbin Email Guru
          </Badge>
        </div>
      </motion.header>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="compose">
            <Mail className="mr-2 h-4 w-4" /> Compose
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users className="mr-2 h-4 w-4" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <CalendarDays className="mr-2 h-4 w-4" /> Cadence
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <CheckCircle className="mr-2 h-4 w-4" /> Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Compose Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PLACEHOLDERS.map((placeholder) => (
                  <Badge key={placeholder} variant="outline">
                    {`{{${placeholder}}}`}
                  </Badge>
                ))}
              </div>
              <Label htmlFor="template-editor">Template</Label>
              <Textarea
                id="template-editor"
                className="min-h-[280px]"
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" onClick={buildPreview}>
                      <Send className="mr-2 h-4 w-4" /> Preview First Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Preview</DialogTitle>
                    </DialogHeader>
                    <pre className="max-h-[50vh] overflow-auto rounded-md bg-slate-50 p-3 text-sm whitespace-pre-wrap">
                      {preview}
                    </pre>
                    <DialogFooter className="flex justify-end">
                      <Button onClick={handleSend} disabled={sending}>
                        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send to Visible Contacts
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <Clock className="mr-2 h-4 w-4" /> Schedule
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 space-y-3">
                    <div>
                      <Label>Start Date</Label>
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Send Time</Label>
                        <Input type="time" value={sendTime} onChange={(event) => setSendTime(event.target.value)} />
                      </div>
                      <div>
                        <Label>Frequency</Label>
                        <Select value={frequency} onValueChange={(value) => setFrequency(value as Frequency)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Weekly" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Steps</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={steps}
                        onChange={(event) => setSteps(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
                      />
                    </div>
                    <Button onClick={handleSchedule}>
                      <CalendarDays className="mr-2 h-4 w-4" /> Schedule Cadence
                    </Button>
                  </PopoverContent>
                </Popover>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Wand2 className="mr-2 h-4 w-4" /> AI Edit with ChatGPT
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>AI Edit</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="ai-instruction">Instruction</Label>
                      <Textarea
                        id="ai-instruction"
                        placeholder="Make it shorter and more direct. Keep {{Company}} and {{FirstName}} tokens."
                        value={aiInstruction}
                        onChange={(event) => setAiInstruction(event.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAiEdit} disabled={aiEditing || !aiInstruction.trim()}>
                        {aiEditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Apply AI Edit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="shadow-lg md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Contacts</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Input placeholder="Search…" value={search} onChange={(event) => setSearch(event.target.value)} className="w-56" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Import CSV
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleImport(file);
                        event.target.value = "";
                      }
                    }}
                  />
                  <Button onClick={addContact}>
                    <Users className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">First</th>
                        <th className="p-3 text-left">Last</th>
                        <th className="p-3 text-left">Company</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleContacts.map((contact) => (
                        <tr key={contact.id} className="border-t">
                          <td className="p-2">
                            <Input value={contact.email} onChange={(event) => updateContact(contact.id, "email", event.target.value)} />
                          </td>
                          <td className="p-2">
                            <Input value={contact.firstName} onChange={(event) => updateContact(contact.id, "firstName", event.target.value)} />
                          </td>
                          <td className="p-2">
                            <Input value={contact.lastName} onChange={(event) => updateContact(contact.id, "lastName", event.target.value)} />
                          </td>
                          <td className="p-2">
                            <Input value={contact.company} onChange={(event) => updateContact(contact.id, "company", event.target.value)} />
                          </td>
                          <td className="p-2">
                            <Button variant="ghost" onClick={() => removeContact(contact.id)}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  CSV format: <code>email,firstName,lastName,company</code>
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Personalization Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PLACEHOLDERS.map((placeholder) => (
                  <div key={placeholder} className="flex items-center gap-2">
                    <Checkbox id={`ph-${placeholder}`} checked disabled />
                    <Label htmlFor={`ph-${placeholder}`}>{`{{${placeholder}}}`}</Label>
                  </div>
                ))}
                <p className="text-xs text-slate-500">Use these tokens in your template. We’ll auto-merge per contact.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Cadence Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <Label>Start Date</Label>
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
              </div>
              <div className="space-y-3">
                <Label>Send Time</Label>
                <Input type="time" value={sendTime} onChange={(event) => setSendTime(event.target.value)} />
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value as Frequency)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Weekly" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Label>Number of Steps</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={steps}
                  onChange={(event) => setSteps(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
                />
                <Button onClick={handleSchedule}>
                  <CalendarDays className="mr-2 h-4 w-4" /> Save Cadence
                </Button>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Compliance Checklist</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>Honor opt-outs and include an unsubscribe footer.</li>
                  <li>Respect provider send limits and warm-up new domains.</li>
                  <li>Set a business address in the footer (CAN-SPAM).</li>
                  <li>Throttle sends to avoid spam detection.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Connect Email Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <Image src="https://www.google.com/favicon.ico" alt="Google" width={20} height={20} className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Gmail (Google Workspace)</div>
                      <div className="text-xs text-slate-500">Scopes: gmail.send</div>
                    </div>
                  </div>
                  <Button
                    disabled={isConnecting}
                    variant={googleConnected ? "secondary" : "default"}
                    onClick={() => void handleConnect("google")}
                  >
                    {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                    {googleConnected ? "Connected" : "Connect"}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <Image src="https://www.microsoft.com/favicon.ico" alt="Microsoft" width={20} height={20} className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Outlook (Microsoft 365)</div>
                      <div className="text-xs text-slate-500">Permission: Mail.Send</div>
                    </div>
                  </div>
                  <Button
                    disabled={isConnecting}
                    variant={outlookConnected ? "secondary" : "default"}
                    onClick={() => void handleConnect("outlook")}
                  >
                    {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                    {outlookConnected ? "Connected" : "Connect"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  You will be redirected to the provider to grant access. Tokens are stored server-side (not in this demo).
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Footer & Opt-out</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label>Business Address</Label>
                <Input placeholder="123 Main St, Austin, TX 78701" />
                <Label>Unsubscribe Instructions</Label>
                <Input placeholder="Reply “STOP” or click unsubscribe" />
                <Label>CC/BCC</Label>
                <Input placeholder="cc1@nice.com, bcc1@nice.com" />
                <p className="text-xs text-slate-500">We’ll append this footer to every email to keep you compliant.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Send Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Stat label="Queued" value={visibleContacts.length.toString()} />
                <Stat label="Sent" value="–" />
                <Stat label="Opens" value="–" />
                <Stat label="Replies" value="–" />
              </div>
              <p className="mt-4 text-xs text-slate-500">Hook this up to /api/stats to reflect real-time metrics from Gmail/Graph webhooks.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <footer className="mt-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Corbin Email Guru — Enjoy the Day.
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}
