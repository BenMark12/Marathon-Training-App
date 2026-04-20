import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let cached: Resend | null = null;

function getClient(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set — configure it before sending email.",
    );
  }
  cached = new Resend(apiKey);
  return cached;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Watto <plans@watto.app>";
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const client = getClient();
  const { data, error } = await client.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error || !data) {
    const message = error?.message ?? "Resend returned no data";
    throw new Error(`Resend send failed: ${message}`);
  }
  return { id: data.id };
}
