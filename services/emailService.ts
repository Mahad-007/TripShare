import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

let initialized = false;
if (PUBLIC_KEY) {
  try {
    emailjs.init({ publicKey: PUBLIC_KEY });
    initialized = true;
  } catch {
    initialized = false;
  }
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendInvitationEmail(
  toEmail: string,
  fromName: string,
  tripTitle: string,
  tripDestination: string,
  invitationId?: string
): Promise<SendEmailResult> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    return { ok: false, error: 'Email service is not configured.' };
  }
  if (!initialized) {
    return { ok: false, error: 'Email service failed to initialize.' };
  }

  const appLink = invitationId
    ? `${window.location.origin}/?invite=${encodeURIComponent(invitationId)}`
    : window.location.origin;

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: toEmail,
      from_name: fromName,
      trip_title: tripTitle,
      trip_destination: tripDestination,
      app_link: appLink,
    });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'text' in err
          ? String((err as { text: unknown }).text)
          : 'Unknown error';
    console.error('[emailService] sendInvitationEmail failed:', err);
    return { ok: false, error: message };
  }
}
