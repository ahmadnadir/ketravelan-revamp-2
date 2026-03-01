/* eslint-disable @typescript-eslint/no-explicit-any */
// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined } };
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Ketravelan <no-reply@ketravelan.xyz>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ketravelan.xyz";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  const allowedOrigins = new Set([
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ketravelan.xyz",
    "http://10.0.2.2:5173",
    "capacitor://localhost",
  ]);
  const allowOrigin = allowedOrigins.has(origin) ? origin : "*";
  const requestedHeaders = req.headers.get("access-control-request-headers");
  const allowHeaders = requestedHeaders && requestedHeaders.length > 0
    ? requestedHeaders
    : "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, x-requested-with";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Expose-Headers": "content-type, content-length, etag, date",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function escapeHtml(v: string) {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendResendRawEmail(opts: { to: string; subject: string; html: string; text?: string }) {
  const payload: Record<string, unknown> = {
    from: RESEND_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  };
  if (opts.text) payload["text"] = opts.text;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error: ${resp.status} ${text}`);
  }
}

function buildPaymentReminderEmail(opts: {
  memberName: string;
  payerName: string;
  tripName: string;
  expenseName: string;
  amount: string;
  currency: string;
  tripUrl: string;
  logoUrl: string;
}) {
  const brand = "Ketravelan";
  const memberNameEsc = escapeHtml(opts.memberName);
  const payerNameEsc = escapeHtml(opts.payerName);
  const tripNameEsc = escapeHtml(opts.tripName);
  const expenseNameEsc = escapeHtml(opts.expenseName);
  const amountEsc = escapeHtml(opts.amount);
  const currencyEsc = escapeHtml(opts.currency);
  const preheader = `Payment reminder for ${opts.expenseName}`;
  const tripUrlEsc = escapeHtml(opts.tripUrl);
  const logoUrlEsc = escapeHtml(opts.logoUrl);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    `<title>${brand}</title>`,
    '</head>',
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    `<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    '<table role="presentation" width="auto" cellspacing="0" cellpadding="0" align="center">',
    '<tr>',
    `<td style="vertical-align:middle"><img src="${logoUrlEsc}" alt="${brand}" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td>`,
    '</tr>',
    '</table>',
    '</td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb;margin:0 28px" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:28px">',
    `<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">Payment Reminder</h1>`,
    `<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center">`,
    `Hi <strong>${memberNameEsc}</strong>,<br><br>`,
    `This is a friendly reminder that <strong>${payerNameEsc}</strong> is waiting for your payment for the expense "<strong>${expenseNameEsc}</strong>" in the trip <strong>${tripNameEsc}</strong>.<br><br>`,
    `<div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e8f0">`,
    `<div style="font-size:14px;color:#64748b;margin-bottom:4px">Amount Due:</div>`,
    `<div style="font-size:28px;font-weight:700;color:#0f172a">${currencyEsc} ${amountEsc}</div>`,
    `</div>`,
    `Please submit your payment proof to confirm that you've settled this expense.`,
    `</div>`,
      '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">',
      `<a href="${tripUrlEsc}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">View Expense & Pay</a>`,
      '</td></tr></table>',
      '</td></tr>',
      '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
      'Thank you for keeping your trip finances organized!<br><br>',
      'If the button doesn&#39;t work, copy this link:<br>',
      `<a href="${tripUrlEsc}" style="color:#2563eb;word-break:break-all">${tripUrlEsc}</a><br><br>`,
      '<strong>The Ketravelan Crew</strong>',
      '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>'
  ].join('');
}

interface PaymentReminderRequest {
  expenseId: string;
  memberId?: string; // If provided, send to specific member only
  remindAll?: boolean; // If true, send to all members who owe
}

serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  try {
    const body = await req.json() as PaymentReminderRequest;
    if (!body?.expenseId) {
      return new Response(JSON.stringify({ error: "expenseId is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { expenseId, memberId, remindAll } = body;

    // Fetch expense details with trip info
    const { data: expense, error: expenseError } = await admin
      .from('trip_expenses')
      .select(`
        id,
        description,
        amount,
        currency,
        trip_id,
        created_by,
        expense_participants(
          id,
          user_id,
          amount_owed,
          is_paid,
          paid_at
        ),
        expense_payments(
          user_id,
          amount_paid
        )
      `)
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      console.error('Error fetching expense:', expenseError);
      return new Response(JSON.stringify({ error: "Expense not found", details: expenseError?.message }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    console.log('Expense found:', { 
      id: expense.id, 
      description: expense.description,
      participantsCount: expense.expense_participants?.length || 0,
      paymentsCount: expense.expense_payments?.length || 0
    });

    // Fetch trip info
    const { data: trip, error: tripError } = await admin
      .from('trips')
      .select('id, title')
      .eq('id', expense.trip_id)
      .single();

    if (tripError) {
      console.error('Error fetching trip:', tripError);
    }
    console.log('Trip info:', { id: trip?.id, title: trip?.title });

    // Get all unique user IDs (participants + payers)
    const participantIds = expense.expense_participants?.map((p: any) => p.user_id) || [];
    const payerIds = expense.expense_payments?.map((p: any) => p.user_id) || [];
    const allUserIds = [...new Set([...participantIds, ...payerIds])];

    // Fetch all profiles at once
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, username, full_name')
      .in('id', allUserIds);

    // Fetch emails from auth.users for each user
    const userEmails = new Map<string, string>();
    for (const userId of allUserIds) {
      try {
        const { data: userData } = await admin.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          userEmails.set(userId, userData.user.email);
        }
      } catch (err) {
        console.error(`Failed to fetch email for user ${userId}:`, err);
      }
    }

    console.log('Profiles and emails fetched:', {
      requested: allUserIds.length,
      profilesFound: profiles?.length || 0,
      emailsFound: userEmails.size,
      userIds: allUserIds.map(id => ({
        id,
        hasProfile: profiles?.some((p: { id: any; }) => p.id === id),
        hasEmail: userEmails.has(id)
      }))
    });

    // Get the payer (who paid upfront)
    const payerId = expense.expense_payments?.[0]?.user_id;
    const payerProfile = profiles?.find((p: { id: any; }) => p.id === payerId);
    const payerName = payerProfile?.full_name || payerProfile?.username || 'Trip Organizer';

    // Get trip name
    const tripName = trip?.title || 'Your Trip';
    const tripUrl = `${SITE_URL}/trip/${expense.trip_id}?tab=expenses`;

    // Get logo URL
    const logoUrl = `https://ketravelan.xyz/ketravelan_logo.png`;

    // Filter members who haven't paid
    let unpaidParticipants = expense.expense_participants?.filter((participant: any) => !participant.is_paid) || [];

    console.log('Filtering participants:', {
      total: expense.expense_participants?.length || 0,
      unpaid: unpaidParticipants.length,
      memberId,
      remindAll,
      participantDetails: expense.expense_participants?.map((p: any) => ({ 
        user_id: p.user_id, 
        is_paid: p.is_paid,
        amount_owed: p.amount_owed 
      }))
    });

    // If specific member, filter to that member only
    if (memberId && !remindAll) {
      unpaidParticipants = unpaidParticipants.filter((participant: any) => participant.user_id === memberId);
      console.log(`Filtered to specific member ${memberId}:`, unpaidParticipants.length);
    }

    if (unpaidParticipants.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No unpaid members to remind", 
        sent: 0,
        debug: {
          totalParticipants: expense.expense_participants?.length || 0,
          allPaid: expense.expense_participants?.every((p: any) => p.is_paid)
        }
      }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Send emails to all unpaid members
    const results = [];
    for (const participant of unpaidParticipants) {
      const memberProfile = profiles?.find((p: { id: any; }) => p.id === participant.user_id);
      const memberEmail = userEmails.get(participant.user_id);
      const memberName = memberProfile?.full_name || memberProfile?.username || 'Member';

      console.log(`Processing participant ${participant.user_id}:`, {
        hasProfile: !!memberProfile,
        hasEmail: !!memberEmail,
        email: memberEmail ? `${memberEmail.substring(0, 3)}***` : null,
        name: memberName
      });

      if (!memberEmail) {
        console.log(`Skipping member ${participant.user_id} - no email`);
        results.push({ memberId: participant.user_id, email: null, status: 'skipped', reason: 'No email address' });
        continue;
      }

      const formattedAmount = Number(participant.amount_owed).toFixed(2);

      const htmlEmail = buildPaymentReminderEmail({
        memberName,
        payerName,
        tripName,
        expenseName: expense.description,
        amount: formattedAmount,
        currency: expense.currency || 'MYR',
        tripUrl,
        logoUrl,
      });

      try {
        await sendResendRawEmail({
          to: memberEmail,
          subject: `Payment Reminder: ${expense.description} - ${tripName}`,
          html: htmlEmail,
        });

        results.push({ memberId: participant.user_id, email: memberEmail, status: 'sent' });
        console.log(`Sent payment reminder to ${memberEmail}`);
      } catch (err) {
        console.error(`Failed to send email to ${memberEmail}:`, err);
        results.push({ memberId: participant.user_id, email: memberEmail, status: 'failed', error: String(err) });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;

    return new Response(
      JSON.stringify({ 
        message: `Payment reminders sent`, 
        sent: successCount,
        total: results.length,
        results 
      }), 
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('Error in send-payment-reminder:', error);
    return new Response(
      JSON.stringify({ error: String(error) }), 
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
