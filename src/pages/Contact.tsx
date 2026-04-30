import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Send, Plane, Hotel, Map, FileText, Wallet, CalendarDays, Users, Car, Train, Camera, Utensils, ShieldCheck, MessageSquare, HelpCircle, CreditCard, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CONTACT_EMAIL = "support@ketravelan.com";

const helpTopics = [
  { label: "Flight", icon: Plane },
  { label: "Hotel", icon: Hotel },
  { label: "DIY Trip", icon: Map },
  { label: "Visa", icon: FileText },
  { label: "Budget", icon: Wallet },
  { label: "Planning", icon: CalendarDays },
  { label: "Group Trip", icon: Users },
  { label: "Transport", icon: Car },
  { label: "Train / Bus", icon: Train },
  { label: "Activities", icon: Camera },
  { label: "Food", icon: Utensils },
  { label: "Travel Insurance", icon: ShieldCheck },
  { label: "Payment", icon: CreditCard },
  { label: "International", icon: Globe },
  { label: "Feedback", icon: MessageSquare },
  { label: "Other", icon: HelpCircle },
];

export default function Contact() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    destination: "",
    travelDate: "",
    message: "",
  });
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `[Ketravelan] ${selectedTopic ? `[${selectedTopic}] ` : ""}Trip Inquiry from ${form.name}`
    );
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nDestination: ${form.destination}\nTravel Date: ${form.travelDate}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

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
          <span className="text-sm font-medium text-black/60">Contact</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 lg:px-10 pb-20 safe-bottom">
        {/* SECTION 1 — Hero */}
        <section className="pt-16 pb-14 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-black leading-tight">
            Contact Us
          </h1>
          <p className="mt-4 text-base sm:text-lg text-black/50 max-w-lg mx-auto leading-relaxed">
            Need help planning your trip? Send us an email and our team will assist you.
          </p>
        </section>

        {/* SECTION 2+3 — Desktop: side by side | Mobile: stacked */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-8 mb-14">
          {/* Email Card */}
          <div className="lg:col-span-2 mb-10 lg:mb-0">
            <div className="rounded-2xl border border-black/10 shadow-sm bg-white p-8 flex flex-col items-center text-center gap-5 h-full justify-center">
              <div className="h-12 w-12 rounded-full border border-black/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black">Email Support</h2>
                <p className="mt-1 text-sm text-black/50 leading-relaxed">
                  For any DIY trip inquiry, contact us via email.
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-2 inline-block text-sm font-medium text-black underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 bg-black text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-black/80 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                Send Email
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-black/10 shadow-sm bg-white p-8">
              <h2 className="text-lg font-semibold text-black mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-black/50 uppercase tracking-wide">Full Name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Ahmad Rizal"
                      className="w-full h-11 px-4 rounded-xl border border-black/15 bg-white text-sm text-black placeholder:text-black/30 outline-none focus:border-black transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-black/50 uppercase tracking-wide">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="you@email.com"
                      className="w-full h-11 px-4 rounded-xl border border-black/15 bg-white text-sm text-black placeholder:text-black/30 outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-black/50 uppercase tracking-wide">Destination</label>
                    <input
                      name="destination"
                      value={form.destination}
                      onChange={handleChange}
                      placeholder="Langkawi, Malaysia"
                      className="w-full h-11 px-4 rounded-xl border border-black/15 bg-white text-sm text-black placeholder:text-black/30 outline-none focus:border-black transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-black/50 uppercase tracking-wide">Travel Date</label>
                    <input
                      name="travelDate"
                      type="date"
                      value={form.travelDate}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl border border-black/15 bg-white text-sm text-black outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-black/50 uppercase tracking-wide">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Tell us about your trip..."
                    className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white text-sm text-black placeholder:text-black/30 outline-none focus:border-black transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-11 bg-black text-white text-sm font-medium rounded-full hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* SECTION 4 — Help Topics */}
        <section className="mb-14">
          <h2 className="text-sm font-medium text-black/40 uppercase tracking-wide mb-4">Help Topics</h2>
          <div className="flex flex-wrap gap-2">
            {helpTopics.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedTopic(selectedTopic === label ? null : label)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  selectedTopic === label
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-black/20 hover:border-black/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 5 — Footer */}
        <section className="border-t border-black/[0.07] pt-10 text-center">
          <p className="text-sm text-black/40">Need help?</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-1 inline-block text-sm font-medium text-black hover:underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </section>
      </div>
      </div>
    </div>
  );
}
