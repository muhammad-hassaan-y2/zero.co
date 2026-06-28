import 'server-only';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export function sesConfigured() {
  return Boolean(process.env.AWS_REGION && process.env.SES_FROM_EMAIL);
}

export async function sendSalesEmail(input: { to: string; subject: string; body: string }) {
  if (!sesConfigured()) {
    throw new Error('SES is not configured. Set AWS_REGION and SES_FROM_EMAIL to send real approved emails.');
  }

  const client = new SESv2Client({ region: process.env.AWS_REGION });
  const response = await client.send(new SendEmailCommand({
    FromEmailAddress: process.env.SES_FROM_EMAIL!,
    Destination: { ToAddresses: [input.to] },
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: input.body, Charset: 'UTF-8' },
        },
      },
    },
  }));

  return response.MessageId || 'ses-message-sent';
}
