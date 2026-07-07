import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileUp,
  Headphones,
  Menu,
  Mic2,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Volume2,
  Zap,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navLinks = ["Product", "How it works", "Pricing", "Customers", "FAQ"];

const candidates = [
  {
    name: "Manya Takkar",
    initials: "MT",
    role: "Frontend Developer",
    status: "AI screen complete",
    score: 91,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    name: "Aarav Mehta",
    initials: "AM",
    role: "Product Engineer",
    status: "Live call in progress",
    score: 82,
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  {
    name: "Riya Shah",
    initials: "RS",
    role: "Growth Analyst",
    status: "Scheduling panel",
    score: 76,
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
  },
];

const proof = [
  { value: "64%", label: "less recruiter time spent on first screens" },
  { value: "3.8x", label: "more candidates screened per open role" },
  { value: "12 min", label: "median time from import to scorecard" },
];

const logos = ["Northstar", "LatticeWorks", "BrightHire", "Rampway", "Folio"];

const steps = [
  {
    title: "Import candidates",
    text: "Upload resumes, paste LinkedIn notes, or sync a CSV of applicants and role requirements.",
    icon: FileUp,
  },
  {
    title: "AI voice screen",
    text: "Ivy calls candidates, explains the process, asks role-specific questions, and captures transcript context.",
    icon: PhoneCall,
  },
  {
    title: "Review scorecards",
    text: "Recruiters get rubric-based fit scores, strengths, risks, evidence, and full transcripts for review.",
    icon: ClipboardCheck,
  },
  {
    title: "Schedule interviews",
    text: "Qualified candidates move into coordinated next steps with recommended interviewer focus areas.",
    icon: CalendarCheck,
  },
];

const features = [
  {
    title: "Adaptive follow-ups",
    text: "Ivy asks concise follow-up questions when a candidate gives a promising but incomplete answer.",
    icon: Sparkles,
  },
  {
    title: "Structured scorecards",
    text: "Every screen is evaluated against role-specific criteria, not vibes or inconsistent notes.",
    icon: BarChart3,
  },
  {
    title: "Transcript review",
    text: "See the exact call transcript, summary, and evidence behind each recommendation.",
    icon: Headphones,
  },
  {
    title: "Scheduling handoff",
    text: "Move strong candidates into the next interview stage with context for the hiring panel.",
    icon: CalendarCheck,
  },
  {
    title: "Human-in-the-loop",
    text: "Ivy assists recruiters and never pretends to be the final hiring authority.",
    icon: ShieldCheck,
  },
  {
    title: "Fast role setup",
    text: "Generate screening questions from a job description, hiring rubric, or recruiter notes.",
    icon: Zap,
  },
];

const useCases = [
  {
    title: "Recruiting teams",
    text: "Standardize first screens across roles while keeping recruiters focused on relationship-building.",
    icon: UsersRound,
  },
  {
    title: "Agencies",
    text: "Screen more inbound talent and deliver sharper shortlists to clients with evidence-rich summaries.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Startups",
    text: "Run consistent early-stage screening without hiring a large recruiting ops team.",
    icon: Sparkles,
  },
  {
    title: "High-volume hiring",
    text: "Keep candidate response times low when job posts receive hundreds of applications.",
    icon: Building2,
  },
];

const faqs = [
  {
    question: "Does Ivy make hiring decisions automatically?",
    answer:
      "No. Ivy produces an AI-assisted screening summary, scorecard, and transcript so recruiters can review evidence and decide next steps.",
  },
  {
    question: "What does the voice interview feel like for candidates?",
    answer:
      "Ivy introduces itself, explains the process, asks one question at a time, allows natural answers, and records a transcript for recruiter review.",
  },
  {
    question: "Can recruiters customize the rubric?",
    answer:
      "Yes. The screening plan can be based on job descriptions, required skills, seniority, knockout criteria, and team-specific evaluation notes.",
  },
  {
    question: "What if the voice transcript is imperfect?",
    answer:
      "The MVP is designed around transcript visibility, correction, manual submission, and typed fallback so recruiters can keep quality high.",
  },
];

const footerColumns: { title: string; links: string[] }[] = [
  {
    title: "Product",
    links: ["Voice agent", "Scorecards", "Scheduling", "Integrations"],
  },
  {
    title: "Company",
    links: ["Customers", "Careers", "Blog", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Security", "Terms", "DPA"],
  },
  {
    title: "Social",
    links: ["LinkedIn", "X", "GitHub", "YouTube"],
  },
];

function LogoMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
      <Mic2 className="size-4" />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Badge variant="secondary" className="mb-4 rounded-full px-3">
        {eyebrow}
      </Badge>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-600">{text}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen max-w-[100vw] overflow-x-hidden bg-white text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-screen max-w-none items-center justify-between px-4 sm:px-6 lg:px-8 xl:max-w-7xl">
          <a href="#" className="flex items-center gap-3">
            <LogoMark />
            <span className="text-sm font-semibold tracking-tight">Ivy Recruiter</span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" className="h-9 px-3">
              Log in
            </Button>
            <Button className="h-9 gap-2 rounded-lg px-4">
              Start free
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }
            >
              <Menu className="size-5" />
              <span className="sr-only">Open navigation</span>
            </SheetTrigger>
            <SheetContent className="w-[min(86vw,360px)]">
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-3">
                  <LogoMark />
                  Ivy Recruiter
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-1 px-4">
                {navLinks.map((link) => (
                  <a
                    key={link}
                    href={`#${link.toLowerCase().replaceAll(" ", "-")}`}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                  >
                    {link}
                  </a>
                ))}
              </div>
              <div className="mt-auto grid gap-2 border-t p-4">
                <Button variant="outline">Log in</Button>
                <Button>Start free</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section id="product" className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(24,24,27,0.09),transparent_34%),linear-gradient(180deg,#fafafa_0%,#ffffff_58%)]" />
        <div className="mx-auto grid w-screen max-w-none grid-cols-[minmax(0,1fr)] items-center gap-10 overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 xl:max-w-7xl xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
          <div className="min-w-0 max-w-full sm:max-w-2xl">
            <Badge variant="secondary" className="mb-5 rounded-full px-3 py-1">
              <Volume2 className="mr-1 size-3.5" />
              AI voice screening built for high-signal hiring
            </Badge>
            <h1 className="max-w-[12ch] text-balance text-[2.3rem] font-semibold leading-[1.07] tracking-[-0.035em] text-zinc-950 sm:max-w-2xl sm:text-5xl lg:text-[3.35rem] xl:text-[3.45rem] xl:leading-[1.02]">
              A recruiter voice agent that screens candidates before your team
              spends time interviewing.
            </h1>
            <p className="mt-5 max-w-full text-pretty text-base leading-7 text-zinc-600 sm:max-w-xl sm:text-lg">
              Upload resumes or a candidate list. Ivy runs polished first-round
              voice screens, scores every conversation against your hiring
              rubric, and hands recruiters a clear shortlist with transcripts
              and next steps.
            </p>
            <div className="mt-7 flex w-full max-w-full flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 w-full gap-2 rounded-lg sm:w-auto">
                Start free
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-11 w-full gap-2 rounded-lg sm:w-auto">
                See product tour
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-zinc-950" />
                No credit card
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-zinc-950" />
                Candidate-friendly calls
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-zinc-950" />
                Recruiter review built in
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full min-w-0 max-w-[calc(100vw-2rem)] sm:max-w-3xl xl:max-w-none">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-zinc-950/[0.04] blur-2xl" />
            <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border-zinc-200 bg-white/95 shadow-2xl shadow-zinc-950/10">
              <div className="flex items-center justify-between border-b bg-zinc-50/80 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <Badge variant="outline" className="hidden rounded-full bg-white sm:inline-flex">
                  Live screening workspace
                </Badge>
              </div>
              <CardContent className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="min-w-0 space-y-3">
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                      <p className="text-sm font-medium">Candidate queue</p>
                      <Badge variant="secondary" className="rounded-full">
                        18 active
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {candidates.map((candidate) => (
                        <div
                          key={candidate.name}
                          className="rounded-lg border bg-zinc-50/60 p-3 transition hover:bg-white hover:shadow-sm"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{candidate.initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {candidate.name}
                                </p>
                                <p className="truncate text-xs text-zinc-500">
                                  {candidate.role}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 text-sm font-semibold">
                              {candidate.score}%
                            </span>
                          </div>
                          <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
                            <span
                              className={`max-w-[9.5rem] rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${candidate.tone}`}
                            >
                              {candidate.status}
                            </span>
                            <div className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 sm:block sm:w-20">
                              <div
                                className="h-full rounded-full bg-zinc-950"
                                style={{ width: `${candidate.score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-zinc-950 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">AI call status</p>
                        <p className="text-xs text-zinc-400">Aarav Mehta - live</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        08:42
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-8 items-end gap-1.5">
                      {[35, 62, 44, 76, 58, 86, 49, 70].map((height, index) => (
                        <span
                          key={index}
                          className="rounded-full bg-white/80"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Screening scorecard</p>
                        <p className="text-xs text-zinc-500">
                          Frontend Developer - Senior
                        </p>
                      </div>
                      <Badge className="rounded-full">Strong fit</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ["Technical depth", "94"],
                        ["Communication", "88"],
                        ["Role alignment", "91"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-xs text-zinc-500">{label}</p>
                          <p className="mt-1 text-xl font-semibold">{value}%</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <div className="flex items-center gap-2">
                      <Mic2 className="size-4 text-zinc-500" />
                      <p className="text-sm font-medium">Transcript summary</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      Candidate gave a concrete React performance example:
                      reduced dashboard render time by memoizing chart data,
                      splitting route bundles, and adding profiler checks before
                      release.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">React</Badge>
                      <Badge variant="secondary">Performance</Badge>
                      <Badge variant="secondary">Ownership</Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-emerald-50/70 p-4 ring-1 ring-emerald-100">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 size-5 text-emerald-700" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-950">
                          Next-step recommendation
                        </p>
                        <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                          Move to technical interview. Ask about tradeoffs in
                          bundle splitting and how they measure perceived speed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="customers" className="border-y bg-zinc-50/70">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-medium text-zinc-500">
                Built for teams that need faster, more consistent screening.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {logos.map((logo) => (
                  <span
                    key={logo}
                    className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-zinc-500 shadow-sm"
                  >
                    {logo}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {proof.map((item) => (
                <div key={item.value} className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-1 text-sm leading-5 text-zinc-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="How it works"
          title="From applicant pile to recruiter-ready shortlist."
          text="Ivy turns candidate content into consistent voice screens, structured scorecards, and next-step recommendations."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Card key={step.title} className="rounded-2xl transition hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                    <step.icon className="size-4" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-300">
                    0{index + 1}
                  </span>
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription className="leading-6">{step.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-zinc-950 py-16 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <Badge className="mb-4 bg-white/10 text-white hover:bg-white/15">
                Product capabilities
              </Badge>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                A complete first-screen workflow, not another notes tool.
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-300">
                Ivy handles the repetitive first conversation while preserving
                the evidence recruiters need to make thoughtful decisions.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.07]"
                >
                  <feature.icon className="size-5 text-zinc-200" />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="Use cases"
          title="Designed for every team drowning in first screens."
          text="Whether you hire ten people a year or screen thousands of applicants, Ivy keeps the process moving with consistency."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {useCases.map((useCase) => (
            <Card key={useCase.title} className="rounded-2xl transition hover:shadow-lg">
              <CardHeader className="flex-row gap-4 space-y-0">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                  <useCase.icon className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {useCase.text}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="overflow-hidden rounded-3xl border bg-[linear-gradient(135deg,#18181b_0%,#27272a_55%,#3f3f46_100%)] p-6 text-white shadow-2xl shadow-zinc-950/15 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <Badge className="mb-4 bg-white/10 text-white hover:bg-white/15">
                Start free
              </Badge>
              <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Screen your next role with Ivy before adding another scheduling
                call to your calendar.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
                Free trial includes candidate imports, AI screening plan
                generation, voice-screen mock runs, and recruiter scorecards.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" className="h-11 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100">
                  Start free
                </Button>
                <Button size="lg" variant="outline" className="h-11 rounded-lg border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  Talk to sales
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-sm text-zinc-300">Pilot plan</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-semibold">$0</span>
                <span className="pb-1 text-sm text-zinc-300">for your first role</span>
              </div>
              <Separator className="my-5 bg-white/15" />
              <div className="space-y-3 text-sm text-zinc-200">
                {[
                  "Import up to 50 candidates",
                  "Generate role-specific rubric",
                  "Review transcripts and scorecards",
                  "Export recruiter-ready summaries",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-y bg-zinc-50/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full px-3">
              FAQ
            </Badge>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Questions recruiters ask before letting AI call candidates.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Ivy is designed to make first screens more consistent while
              keeping recruiters in control of candidate decisions.
            </p>
          </div>
          <Accordion className="rounded-2xl border bg-white p-3 shadow-sm">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger className="px-3 py-4 text-base hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-3 text-zinc-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark />
                <span className="text-sm font-semibold">Ivy Recruiter</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600">
                AI voice screening for recruiters who want faster first screens,
                clearer evidence, and better candidate handoffs.
              </p>
              <AvatarGroup className="mt-5">
                <Avatar><AvatarFallback>HR</AvatarFallback></Avatar>
                <Avatar><AvatarFallback>TA</AvatarFallback></Avatar>
                <Avatar><AvatarFallback>HM</AvatarFallback></Avatar>
                <AvatarGroupCount>+8</AvatarGroupCount>
              </AvatarGroup>
            </div>
            <div className="grid gap-8 sm:grid-cols-4">
              {footerColumns.map(({ title, links }) => (
                <div key={title}>
                  <p className="text-sm font-semibold">{title}</p>
                  <div className="mt-4 grid gap-3">
                    {links.map((link) => (
                      <a
                        key={link}
                        href="#"
                        className="text-sm text-zinc-500 transition hover:text-zinc-950"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator className="my-8" />
          <div className="flex flex-col gap-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Ivy Recruiter. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <Star className="size-4" />
              Built for human-led hiring teams.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
