import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do DIY trips work?",
    answer:
      "DIY trips are created by travelers, not agencies. Users can create a trip, make it public, allow others to join, chat together, plan activities, and manage shared expenses — all in one place.",
  },
  {
    question: "Can I join if I'm traveling solo?",
    answer:
      "Yes. Ketravelan is designed for solo travelers. You can join open trips, meet like-minded people, and travel together while keeping plans and costs transparent.",
  },
  {
    question: "How does expense tracking work?",
    answer:
      "Any group member can log shared expenses. The system automatically calculates each person's share and clearly shows who paid upfront and who still owes.",
  },
  {
    question: "What if someone pays upfront for the group?",
    answer:
      "Payments made on behalf of the group are tracked automatically. This keeps responsibilities clear and helps manage cash flow without awkward money conversations.",
  },
  {
    question: "How does settlement work at the end of the trip?",
    answer:
      "All expenses are offset and consolidated into a single net amount. Each person settles once instead of paying line by line — simple, fair, and transparent.",
  },
  {
    question: "Does Ketravelan hold my money?",
    answer:
      "No. Ketravelan does not hold funds. Payments happen directly between travelers. The app only tracks and clarifies who owes what.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          Everything you need to know before starting or joining a DIY trip.
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`faq-${index}`}
            className="border border-border/50 rounded-lg px-4 data-[state=open]:bg-muted/30"
          >
            <AccordionTrigger className="text-sm sm:text-base font-medium text-foreground hover:no-underline py-3 sm:py-4">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-3 sm:pb-4">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
