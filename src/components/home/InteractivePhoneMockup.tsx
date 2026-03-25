import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, MapPin, Users, Search, Plus, Pin, DollarSign, TrendingUp, TrendingDown, Wallet, Paperclip, Send, MoreVertical, ArrowRight, Upload, FileText, QrCode } from "lucide-react";
import duitnowQR from "@/assets/duitnow-sample-qr.png";
import { mockMessages, mockMembers, mockExpenses } from "@/data/mockData";
import { Progress } from "@/components/ui/progress";

type TabType = "chat" | "expenses" | "notes";
type ExpenseSubTab = "breakdown" | "expenses" | "settle" | "qr";

// Category emoji map matching actual implementation
const categoryEmojiMap: Record<string, string> = {
  "Transport": "🚗",
  "Food & Drinks": "🍴",
  "Accommodation": "🏨",
  "Activities": "🎫",
  "Shopping": "🛍️",
  "Other": "📦",
};

const categoryBreakdown = [
  { category: "Transport", amount: 770, percentage: 30, color: "bg-stat-blue", emoji: "🚗" },
  { category: "Food & Drinks", amount: 560, percentage: 22, color: "bg-stat-orange", emoji: "🍴" },
  { category: "Accommodation", amount: 1200, percentage: 47, color: "bg-purple-500", emoji: "🏨" },
  { category: "Activities", amount: 180, percentage: 7, color: "bg-stat-green", emoji: "🎫" },
];

const mockNotes = [
  { id: "1", title: "Packing List", content: "Sunscreen, Swimsuit, Comfortable shoes...", pinned: true, time: "2h ago" },
  { id: "2", title: "Restaurant Recommendations", content: "Wonderland Food Store - Laksa...", pinned: false, time: "1d ago" },
  { id: "3", title: "Emergency Contacts", content: "Trip Leader: Ahmad - 012-345-6789", pinned: true, time: "3d ago" },
];

export function InteractivePhoneMockup() {
  const [activeTab, setActiveTab] = useState<TabType>("chat");

  const tabs: { label: string; value: TabType }[] = [
    { label: "Chat", value: "chat" },
    { label: "Expenses", value: "expenses" },
    { label: "Notes", value: "notes" },
  ];

  return (
    <div className="relative mx-auto w-[340px] sm:w-[380px] lg:w-[420px]">
      {/* Floating Screen with shadow */}
      <div className="relative bg-background rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-2xl border border-border/30 h-[460px] sm:h-[500px] lg:h-[540px] flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border/50 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center">
              <ChevronLeft className="h-3 w-3 text-muted-foreground" />
            </div>
            
            {/* Circular Trip Image */}
            <div className="h-7 w-7 rounded-full overflow-hidden border border-border/50 shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200" 
                alt="Langkawi" 
                className="h-full w-full object-cover" 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-foreground truncate text-[11px]">Langkawi Island Adventure</h1>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <MapPin className="h-2 w-2 shrink-0" />
                <span className="truncate">Langkawi, Malaysia</span>
                <span>•</span>
                <Users className="h-2 w-2 shrink-0" />
                <span>{mockMembers.length}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation - matches SegmentedControl styling */}
          <div className="flex p-0.5 mt-2 bg-secondary rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex-1 py-1.5 px-1.5 text-[9px] font-medium rounded-lg transition-all",
                  activeTab === tab.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && <MockChatContent />}
          {activeTab === "expenses" && <MockExpensesContent />}
          {activeTab === "notes" && <MockNotesContent />}
        </div>
      </div>
    </div>
  );
}

// Create a map of member data for quick lookup
const memberMap = mockMembers.reduce((acc, member) => {
  acc[member.id] = member;
  return acc;
}, {} as Record<string, typeof mockMembers[0]>);

function MockChatContent() {
  const currentUserId = "1";

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 space-y-2">
        {mockMessages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          const isSystem = msg.type === "system";
          const sender = memberMap[msg.senderId];

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-[8px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={cn("flex gap-1.5", isOwn ? "justify-end" : "justify-start")}
            >
              {/* Avatar for other users (WhatsApp style) */}
              {!isOwn && (
                <div className="h-5 w-5 rounded-full bg-muted overflow-hidden shrink-0 mt-3">
                  {sender?.imageUrl ? (
                    <img src={sender.imageUrl} alt={msg.senderName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground font-semibold text-[8px]">
                      {msg.senderName.charAt(0)}
                    </div>
                  )}
                </div>
              )}
              
              <div className={cn("flex flex-col gap-0.5", isOwn && "items-end")}>
                {!isOwn && (
                  <span className="text-[8px] text-muted-foreground ml-2">
                    {msg.senderName}
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[85%] px-2.5 py-1.5 rounded-2xl",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  )}
                >
                  <p className="text-[10px]">{msg.content}</p>
                </div>
                <span className={cn(
                  "text-[7px] text-muted-foreground",
                  isOwn ? "mr-1" : "ml-2"
                )}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border/50 bg-card px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors">
            <Paperclip className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="flex-1 bg-secondary rounded-full px-2.5 py-1">
            <span className="text-[9px] text-muted-foreground">Type a message...</span>
          </div>
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
            <Send className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockExpensesContent() {
  const [subTab, setSubTab] = useState<ExpenseSubTab>("breakdown");
  const totalCost = mockExpenses.reduce((sum, e) => sum + e.amount, 0);

  const subTabs: { label: string; value: ExpenseSubTab }[] = [
    { label: "Summary", value: "breakdown" },
    { label: "All Expenses", value: "expenses" },
    { label: "Settlement", value: "settle" },
    { label: "QR", value: "qr" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      <div className="px-2 py-2 space-y-2">
        {/* Header */}
        <div>
          <h2 className="text-[11px] font-semibold text-foreground">Trip Expenses Overview</h2>
          <p className="text-[8px] text-muted-foreground">See where the money went and who's settled.</p>
        </div>

        {/* Stat Cards - matching actual TripHub layout: 1 full-width + 2 columns */}
        <div className="space-y-1.5">
          {/* Full width highlight card */}
          <StatCardMini 
            icon={Wallet} 
            title="Your Total Expenses" 
            value="RM 680" 
            color="green" 
            subtitle="Your share of all trip costs"
          />
          {/* Two column layout */}
          <div className="grid grid-cols-2 gap-1.5">
            <StatCardMini 
              icon={TrendingUp} 
              title="You're Owed" 
              value="RM 85" 
              color="orange" 
              description="Net from others"
            />
            <StatCardMini 
              icon={TrendingDown} 
              title="You Owe" 
              value="RM 120" 
              color="red" 
              description="Net to others"
            />
          </div>
        </div>

        {/* Sub Tabs - Matches ScrollableTabBar styling */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          {subTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSubTab(tab.value)}
              className={cn(
                "flex-1 py-1.5 px-1 text-[8px] font-medium rounded-lg whitespace-nowrap transition-all text-center",
                subTab === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub Tab Content */}
        {subTab === "breakdown" && <BreakdownContent totalCost={totalCost} />}
        {subTab === "expenses" && <ExpensesListContent />}
        {subTab === "settle" && <SettleContent />}
        {subTab === "qr" && <QRContent />}
      </div>
    </div>
  );
}

function BreakdownContent({ totalCost }: { totalCost: number }) {
  return (
    <>
      {/* Total Trip Spend - Summary card */}
      <StatCardMini 
        icon={DollarSign} 
        title="Total Trip Spend" 
        value={`RM ${totalCost.toLocaleString()}`} 
        color="blue" 
        description="All group expenses"
        variant="summary"
      />

      {/* Category Breakdown */}
      <div className="bg-card border border-border/50 rounded-xl p-2 space-y-1.5">
        <h3 className="text-[9px] font-semibold text-foreground">Spending by Category</h3>
        {categoryBreakdown.map((item) => (
          <div key={item.category} className="space-y-0.5">
            <div className="flex items-center justify-between text-[8px]">
              <span className="text-foreground flex items-center gap-1">
                <span>{item.emoji}</span> {item.category}
              </span>
              <span className="text-muted-foreground">RM {item.amount} ({item.percentage}%)</span>
            </div>
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Per Person */}
      <div className="bg-card border border-border/50 rounded-xl p-2 space-y-1">
        <h3 className="text-[9px] font-semibold text-foreground">Upfront Payment per Person</h3>
        <p className="text-sm font-bold text-primary">RM {Math.round(totalCost / mockMembers.length).toLocaleString()}</p>
        {mockMembers.slice(0, 3).map((member, index) => {
          const contribution = [850, 680, 450][index] || 500;
          const percentage = Math.round((contribution / totalCost) * 100);
          return (
            <div key={member.id} className="space-y-0.5">
              <div className="flex items-center justify-between text-[8px]">
                <span className="text-foreground">{member.name}</span>
                <span className="text-muted-foreground">RM {contribution} ({percentage}%)</span>
              </div>
              <div className="h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ExpensesListContent() {
  // Mock expense data with payment status - matches ExpenseCard
  const expenses = mockExpenses.slice(0, 3).map((expense, i) => ({
    ...expense,
    paymentProgress: [100, 50, 25][i],
    yourShare: Math.round(expense.amount / 4),
    shareStatus: ["settled", "pending", "pending"][i] as "settled" | "pending",
  }));

  return (
    <div className="space-y-1.5">
      {expenses.map((expense) => {
        const emoji = categoryEmojiMap[expense.category] || "📦";
        return (
          <div key={expense.id} className="bg-card border border-border/50 rounded-xl p-2 space-y-1.5 cursor-pointer hover:border-primary/50 transition-all">
            {/* Header: Title and Amount */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="text-[9px] font-semibold text-foreground truncate">{expense.title}</h4>
                <p className="text-[7px] text-muted-foreground">Paid by {expense.paidBy} · {expense.date}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="text-[10px] font-semibold text-foreground">RM {expense.amount}</span>
                <MoreVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>

            {/* Group Settlement Progress - Matches ExpenseCard */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[7px] font-medium",
                  expense.paymentProgress === 100 ? "text-stat-green" : "text-muted-foreground"
                )}>
                  Group settlement: {expense.paymentProgress}%
                </span>
              </div>
              <Progress value={expense.paymentProgress} className="h-1" />
            </div>

            {/* Personal Share Row - Matches ExpenseCard */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[7px] font-medium text-foreground">Your share:</span>
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-semibold">RM {expense.yourShare}</span>
                <span className={cn(
                  "text-[6px] px-1.5 py-0.5 rounded-full font-medium",
                  expense.shareStatus === "settled" 
                    ? "bg-success/10 text-success" 
                    : "bg-warning/10 text-warning"
                )}>
                  {expense.shareStatus === "settled" ? "Settled" : "Pending"}
                </span>
              </div>
            </div>

            {/* Action Button - Matches ExpenseCard */}
            <button className={cn(
              "w-full py-1.5 rounded-lg text-[8px] font-medium flex items-center justify-center gap-1 transition-all",
              expense.shareStatus === "pending"
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}>
              {expense.shareStatus === "pending" ? (
                <>
                  <Upload className="h-2.5 w-2.5" />
                  View & Settle
                </>
              ) : (
                <>
                  <FileText className="h-2.5 w-2.5" />
                  View Details
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SettleContent() {
  // Settlement data matching SettlementCard component
  const settlements = [
    { from: mockMembers[1], to: mockMembers[0], amount: 120, status: "pending" as const },
    { from: mockMembers[0], to: mockMembers[2], amount: 85, status: "settled" as const },
  ];

  return (
    <div className="space-y-1.5">
      {settlements.map((s, i) => (
        <div key={i} className="bg-card border border-border/50 rounded-xl p-2 space-y-2 cursor-pointer hover:border-primary/50 transition-all">
          {/* From → To - Matches SettlementCard layout */}
          <div className="flex items-center justify-between gap-1.5">
            {/* From User */}
            <div className="flex items-center gap-1 min-w-0">
              <div className="h-6 w-6 rounded-full bg-muted overflow-hidden shrink-0">
                {s.from.imageUrl ? (
                  <img src={s.from.imageUrl} alt={s.from.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[8px] font-medium">{s.from.name.charAt(0)}</div>
                )}
              </div>
              <span className="text-[7px] font-medium text-foreground truncate max-w-[50px]">{s.from.name}</span>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />

            {/* To User */}
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[7px] font-medium text-foreground truncate max-w-[50px] text-right">{s.to.name}</span>
              <div className="h-6 w-6 rounded-full bg-muted overflow-hidden shrink-0">
                {s.to.imageUrl ? (
                  <img src={s.to.imageUrl} alt={s.to.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[8px] font-medium">{s.to.name.charAt(0)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Amount - Centered like SettlementCard */}
          <div className="text-center">
            <p className="text-base font-bold text-foreground">RM {s.amount}</p>
            <p className="text-[7px] text-muted-foreground">Net amount owed</p>
          </div>

          {/* Status Badge - Centered */}
          <div className="flex justify-center">
            <span className={cn(
              "text-[7px] px-2 py-0.5 rounded-full font-medium",
              s.status === "settled" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            )}>
              {s.status === "settled" ? "Settled" : "Pending"}
            </span>
          </div>

          {/* Actions - Matches SettlementCard */}
          <div className="flex flex-col gap-1 pt-1.5 border-t border-border/50">
            {s.status === "pending" ? (
              <>
                <button className="w-full py-1.5 rounded-lg text-[7px] font-medium flex items-center justify-center gap-1 border border-border bg-card hover:bg-secondary transition-all">
                  <QrCode className="h-2.5 w-2.5" />
                  View QR
                </button>
                <button className="w-full py-1.5 rounded-lg text-[7px] font-medium flex items-center justify-center gap-1 bg-foreground text-background hover:bg-foreground/90 transition-all">
                  <Upload className="h-2.5 w-2.5" />
                  Upload Receipt
                </button>
              </>
            ) : (
              <button className="w-full py-1.5 rounded-lg text-[7px] font-medium flex items-center justify-center gap-1 border border-border bg-card hover:bg-secondary transition-all">
                <FileText className="h-2.5 w-2.5" />
                View Details
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function QRContent() {
  const [qrView, setQrView] = useState<"myqr" | "others">("myqr");

  return (
    <div className="space-y-2">
      {/* QR View Toggle - Matches actual SegmentedControl */}
      <div className="flex p-0.5 bg-secondary rounded-xl">
        <button
          onClick={() => setQrView("myqr")}
          className={cn(
            "flex-1 py-1.5 px-2 text-[8px] font-medium rounded-lg transition-all text-center",
            qrView === "myqr"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          My QR
        </button>
        <button
          onClick={() => setQrView("others")}
          className={cn(
            "flex-1 py-1.5 px-2 text-[8px] font-medium rounded-lg transition-all text-center",
            qrView === "others"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Others' QR
        </button>
      </div>

      {qrView === "myqr" ? (
        /* Your QR - Matches YourQRSection */
        <div className="bg-card border border-border/50 rounded-xl p-3">
          <h3 className="text-[9px] font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <QrCode className="h-3 w-3" />
            Your QR Code
          </h3>
          <div className="flex justify-center">
            <img 
              src={duitnowQR} 
              alt="DuitNow QR Code" 
              className="w-28 h-28 rounded-xl border border-border bg-white p-1 object-contain"
            />
          </div>
          <div className="flex gap-1.5 mt-2">
            <button className="flex-1 py-1.5 rounded-lg text-[7px] font-medium border border-border bg-card hover:bg-secondary transition-all">
              Replace
            </button>
            <button className="flex-1 py-1.5 rounded-lg text-[7px] font-medium border border-border bg-card hover:bg-secondary text-destructive transition-all">
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* Members QR */
        <div className="bg-card border border-border/50 rounded-xl p-2 space-y-1.5">
          <h3 className="text-[9px] font-semibold text-foreground">Members' QR Codes</h3>
          {mockMembers.slice(0, 3).map((member) => (
            <div key={member.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
              <div className="h-6 w-6 rounded-full bg-muted overflow-hidden shrink-0">
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[8px] font-medium">{member.name.charAt(0)}</div>
                )}
              </div>
              <span className="flex-1 text-[8px] text-foreground font-medium truncate">{member.name}</span>
              <button className="text-[7px] text-primary font-medium px-2 py-1 rounded-md hover:bg-primary/10 transition-all">
                View QR
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MockNotesContent() {
  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide px-2 py-2 space-y-2">
      {/* Search & Add - Matches TripNotes */}
      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground" />
          <div className="w-full pl-6 pr-2 py-1.5 rounded-xl bg-secondary text-[8px] text-muted-foreground">
            Search notes...
          </div>
        </div>
        <button className="bg-primary text-primary-foreground px-2 py-1.5 rounded-xl flex items-center gap-0.5 text-[8px] font-medium">
          <Plus className="h-2.5 w-2.5" />
          New
        </button>
      </div>

      {/* Pinned Notes - Matches TripNotes */}
      <div className="space-y-1.5">
        <h3 className="text-[8px] font-medium text-muted-foreground flex items-center gap-1">
          <Pin className="h-2.5 w-2.5" />
          Pinned
        </h3>
        {mockNotes.filter(n => n.pinned).map((note) => (
          <NoteCardMini key={note.id} note={note} />
        ))}
      </div>

      {/* Other Notes */}
      <div className="space-y-1.5">
        <h3 className="text-[8px] font-medium text-muted-foreground">All Notes</h3>
        {mockNotes.filter(n => !n.pinned).map((note) => (
          <NoteCardMini key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}

function NoteCardMini({ note }: { note: { id: string; title: string; content: string; pinned: boolean; time: string } }) {
  return (
    <div className="bg-card border border-border/50 rounded-xl p-2 hover:border-primary/30 transition-all cursor-pointer active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h4 className="text-[9px] font-semibold text-foreground truncate">
              {note.title}
            </h4>
            {note.pinned && (
              <Pin className="h-2.5 w-2.5 text-primary fill-primary shrink-0" />
            )}
          </div>
          <p className="text-[7px] text-muted-foreground line-clamp-2 mt-0.5">
            {note.content}
          </p>
          <p className="text-[6px] text-muted-foreground/70 mt-1">{note.time}</p>
        </div>
        <button className="h-5 w-5 rounded-md hover:bg-secondary flex items-center justify-center shrink-0">
          <MoreVertical className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function StatCardMini({ 
  icon: Icon, 
  title, 
  value, 
  color,
  subtitle,
  description,
  variant
}: { 
  icon: React.ElementType; 
  title: string; 
  value: string; 
  color: "blue" | "green" | "orange" | "red";
  subtitle?: string;
  description?: string;
  variant?: "highlight" | "summary";
}) {
  const iconColors = {
    blue: "text-stat-blue",
    green: "text-stat-green",
    orange: "text-stat-orange",
    red: "text-stat-red",
  };

  return (
    <div className={cn(
      "bg-card border border-border/50 rounded-xl p-2 space-y-0.5",
      variant === "highlight" && "bg-stat-green/5 border-stat-green/20"
    )}>
      <div className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3 shrink-0", iconColors[color])} />
        <p className="text-[7px] text-muted-foreground truncate">{title}</p>
      </div>
      <p className="text-[11px] font-bold text-foreground">{value}</p>
      {subtitle && (
        <p className="text-[6px] text-muted-foreground">{subtitle}</p>
      )}
      {description && (
        <p className="text-[6px] text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
