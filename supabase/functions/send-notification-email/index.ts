/* eslint-disable @typescript-eslint/no-explicit-any */
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
// Fix for TypeScript: declare Deno global
declare const Deno: any;

// @ts-expect-error - Deno npm specifier not recognized by TypeScript
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDKuAmaopvElCbEZZ7nprLFsxwEjRDUB5wtn65ahW9BANcGh35Qo1j6sGLPT41mx/aHbm0E6IDtQECycwKhgpIlNDDkxdYA3bjeioyEECBsXwWq2TJY+bK3JEidH3LXoSp4gzyWVoRD0lHWVZJof9vX8gbpHpwLU0vuwvWA8LJehQIDAQAB'))

interface EmailRequest {
  email: string;
  userName: string;
  notificationTitle: string;
  notificationMessage: string;
  actionUrl?: string;
}

serve(async (req: Request) => {
  try {
    const { email, userName, notificationTitle, notificationMessage, actionUrl } = await req.json() as EmailRequest

    const { data, error } = await resend.emails.send({
      from: 'Ketravelan <onboarding@resend.dev>',
      to: [email],
      subject: notificationTitle,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${notificationTitle}</h2>
          <p style="color: #666; font-size: 16px;">Hi ${userName},</p>
          <p style="color: #666; font-size: 16px;">${notificationMessage}</p>
          ${actionUrl ? `
            <a href="https://yourdomain.com${actionUrl}" 
               style="display: inline-block; margin-top: 20px; padding: 12px 24px; 
                      background-color: #007bff; color: white; text-decoration: none; 
                      border-radius: 6px;">
              View Details
            </a>
          ` : ''}
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            You received this notification because you're a member of Ketravelan.
          </p>
        </div>
      `,
    })

    if (error) {
      return new Response(JSON.stringify({ error }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ data }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
function serve(handler: (req: Request) => Promise<Response>) {
  if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
    Deno.serve(handler);
  } else {
    throw new Error("Deno.serve is not available in this environment.");
  }
}

