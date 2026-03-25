import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Map,
  Users,
  Receipt,
  MessageSquare,
  StickyNote,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const diyFeatures = [
  {
    icon: Map,
    title: "Plan Your Own Route",
    desc: "Build a custom itinerary from scratch. Choose your own destinations, set your own pace, and travel your way.",
  },
  {
    icon: Users,
    title: "Invite Your Crew",
    desc: "Create a trip group, add friends, and plan together in one shared space. No more chaotic group chats.",
  },
  {
    icon: Receipt,
    title: "Split Expenses Effortlessly",
    desc: "Log shared costs, track who paid what, and get automatic net settlements  so money never gets awkward.",
  },
  {
    icon: MessageSquare,
    title: "Group Chat Built-In",
    desc: "Discuss plans, share updates, and coordinate in a dedicated trip chat  all in context, right where you need it.",
  },
  {
    icon: StickyNote,
    title: "Trip Notes",
    desc: "Save packing lists, hotel addresses, local tips, and anything else your group needs to remember.",
  },
];

const stats = [
  { value: "100%", label: "DIY controlled" },
  { value: "0 RM", label: "platform fee" },
  { value: "∞", label: "trip possibilities" },
];

export default function About() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white text-black flex flex-col" style={{ WebkitOverflowScrolling: "touch" }}>
      {/* Top nav — safe-top pushes it below the iOS notch/Dynamic Island */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-black/[0.07] safe-top">
        <div className="max-w-5xl mx-auto px-5 lg:px-10 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(isAuthenticated ? "/settings" : "/")}
            className="h-8 w-8 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-black/50">About Ketravelan</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 lg:px-10 pb-24 safe-bottom">

        {/* Hero */}
        <section className="pt-16 pb-14">
          {/* Logo + badge — centered */}
          <div className="flex justify-center mb-6">
            <img src="/ketravelan_logo.png" alt="Ketravelan" className="h-20 sm:h-24 w-auto object-contain" />
          </div>
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/10 text-base font-semibold text-black/60">
              <Sparkles className="h-4 w-4" />
              DIY Trip Platform
            </div>
          </div>
          {/* Heading + body — left aligned */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black leading-[1.1]">
            Your trip,<br />Your rules.
          </h1>
          <p className="mt-6 text-lg text-black/50 leading-relaxed">
            Ketravelan is built for travellers who want full control plan your own route, split costs with friends,
            and manage everything in one clean app.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to={isAuthenticated ? "/create" : "/auth"}
              className="inline-flex items-center justify-center gap-2 bg-black text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-black/80 transition-colors"
            >
              Start a DIY Trip
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 border border-black/15 text-black text-sm font-medium px-6 py-3 rounded-full hover:border-black/40 transition-colors"
            >
              Browse Trips
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-4 py-10 border-y border-black/[0.07] mb-14">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold tracking-tight text-black">{s.value}</p>
              <p className="text-xs text-black/40 mt-1">{s.label}</p>
            </div>
          ))}
        </section>

        {/* What is DIY Trip */}
        <section className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-black/30 mb-4">What is a DIY Trip?</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-black leading-snug mb-5">
            Take charge of your trip.<br />Plan it your way with ease.
          </h2>
          <p className="text-base text-black/50 leading-relaxed">
            A DIY Trip on Ketravelan means you create the entire journey yourself. No package deals, no fixed schedules,
            no hidden fees. You decide where to go, who to bring, and how much to spend.
            We just give you the tools to make it smooth.
          </p>
        </section>

        {/* Features  2 col grid on desktop */}
        <section className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-black/30 mb-6">Everything You Need</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {diyFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-4 p-5 rounded-2xl border border-black/[0.08] hover:border-black/20 transition-colors bg-white"
              >
                <div className="h-10 w-10 rounded-xl border border-black/10 flex items-center justify-center shrink-0 bg-black/[0.03]">
                  <Icon className="h-5 w-5 text-black" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">{title}</p>
                  <p className="text-sm text-black/50 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works  2 col on desktop */}
        <section className="mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-black/30 mb-6">How It Works</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-black/[0.07] rounded-2xl overflow-hidden border border-black/[0.07]">
            {[
              { step: "01", title: "Create a Trip", desc: "Set a destination, dates, and trip name. Takes 30 seconds." },
              { step: "02", title: "Invite Friends", desc: "Share the trip link or invite by username. Everyone joins your trip group." },
              { step: "03", title: "Plan Together", desc: "Chat, add notes, track expenses  all inside the trip hub." },
              { step: "04", title: "Settle Up", desc: "After the trip, Ketravelan shows who owes who. One tap to settle." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-6 bg-white">
                <span className="text-xs font-bold text-black/20 w-8 shrink-0 pt-0.5">{step}</span>
                <div>
                  <p className="text-sm font-semibold text-black">{title}</p>
                  <p className="text-sm text-black/50 mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-14 rounded-2xl bg-black text-white p-8 sm:p-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold leading-snug mb-3">
            Ready to plan your first<br />DIY trip?
          </h2>
          <p className="text-sm text-white/50 mb-7">
            Free to use. No booking fees. Just you and your travel squad.
          </p>
          <Link
            to={isAuthenticated ? "/create" : "/auth"}
            className="inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-7 py-3 rounded-full hover:bg-white/90 transition-colors"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* Company Info */}
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-black/30 mb-5">Built By</p>
          <div className="rounded-2xl border border-black/10 p-6 space-y-2">
            <p className="text-base font-bold text-black">Rekasaksa Solutions Sdn. Bhd.</p>
            <p className="text-xs text-black/40">202501029027 / 1630439-K · Malaysia</p>
            <p className="text-sm text-black/50 leading-relaxed pt-1">
              A technology company focused on building reliable, scalable digital platforms for modern users.
            </p>
          </div>
        </section>

        {/* Bottom */}
        <div className="border-t border-black/[0.07] pt-8 text-center">
          <p className="text-xs text-black/30">
            © {new Date().getFullYear()} Rekasaksa Solutions Sdn. Bhd. All rights reserved.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
