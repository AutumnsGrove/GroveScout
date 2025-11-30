// Scout - Email Service using Resend
import { Resend } from 'resend';

const FROM_EMAIL = 'Scout <noreply@scout.grove.place>';

export function createResendClient(apiKey: string): Resend {
	return new Resend(apiKey);
}

// Search completed email
export async function sendSearchCompletedEmail(
	resend: Resend,
	to: string,
	data: {
		searchQuery: string;
		resultCount: number;
		resultsUrl: string;
	}
): Promise<void> {
	await resend.emails.send({
		from: FROM_EMAIL,
		to,
		subject: `Scout found ${data.resultCount} items for you!`,
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Scout found some great deals!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Your search for <strong>"${escapeHtml(data.searchQuery)}"</strong> is complete.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        We found <strong>${data.resultCount} products</strong> that match your criteria and curated the top picks for you.
      </p>
      <a href="${data.resultsUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Your Results
      </a>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
        Happy shopping!<br>— The Scout Team
      </p>
    </div>
  </div>
</body>
</html>
		`.trim()
	});
}

// Search failed email
export async function sendSearchFailedEmail(
	resend: Resend,
	to: string,
	data: {
		searchQuery: string;
		reason?: string;
	}
): Promise<void> {
	await resend.emails.send({
		from: FROM_EMAIL,
		to,
		subject: 'Your Scout search needs attention',
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: #fef3c7; padding: 32px; text-align: center;">
      <h1 style="color: #92400e; margin: 0; font-size: 24px;">Search Couldn't Complete</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        We ran into an issue while searching for <strong>"${escapeHtml(data.searchQuery)}"</strong>.
      </p>
      ${data.reason ? `<p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px; padding: 12px; background: #f9fafb; border-radius: 6px;">Reason: ${escapeHtml(data.reason)}</p>` : ''}
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Don't worry — your credit has been refunded. Try searching again with different terms or adjusting your preferences.
      </p>
      <a href="https://scout.grove.place/search/new" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Try Again
      </a>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
        Need help? Reply to this email.<br>— The Scout Team
      </p>
    </div>
  </div>
</body>
</html>
		`.trim()
	});
}

// Welcome email
export async function sendWelcomeEmail(
	resend: Resend,
	to: string,
	data: {
		name?: string;
	}
): Promise<void> {
	const greeting = data.name ? `Hey ${escapeHtml(data.name)}` : 'Welcome';

	await resend.emails.send({
		from: FROM_EMAIL,
		to,
		subject: 'Welcome to Scout!',
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Scout!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">
        ${greeting} — we're excited to help you find great deals without the stress.
      </p>
      <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Here's how Scout works:
      </p>
      <div style="margin-bottom: 24px;">
        <div style="display: flex; margin-bottom: 16px;">
          <div style="background: #eef2ff; color: #6366f1; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; flex-shrink: 0; margin-right: 12px;">1</div>
          <div>
            <strong style="color: #374151;">Describe what you want</strong>
            <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Tell us in plain English — no filters needed</p>
          </div>
        </div>
        <div style="display: flex; margin-bottom: 16px;">
          <div style="background: #eef2ff; color: #6366f1; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; flex-shrink: 0; margin-right: 12px;">2</div>
          <div>
            <strong style="color: #374151;">We search for you</strong>
            <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">Our AI agents scour the web for deals</p>
          </div>
        </div>
        <div style="display: flex;">
          <div style="background: #eef2ff; color: #6366f1; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: 600; flex-shrink: 0; margin-right: 12px;">3</div>
          <div>
            <strong style="color: #374151;">Get your top picks</strong>
            <p style="color: #6b7280; margin: 4px 0 0; font-size: 14px;">We curate the 5 best options, no decision fatigue</p>
          </div>
        </div>
      </div>
      <a href="https://scout.grove.place/profile" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Set Up Your Profile
      </a>
      <p style="color: #9ca3af; font-size: 14px; margin: 20px 0 0;">
        Pro tip: Fill out your profile with sizes and preferences for better results!
      </p>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
        Questions? Just reply to this email.<br>— The Scout Team
      </p>
    </div>
  </div>
</body>
</html>
		`.trim()
	});
}

// Subscription confirmed email
export async function sendSubscriptionConfirmedEmail(
	resend: Resend,
	to: string,
	data: {
		planName: string;
		credits: number;
	}
): Promise<void> {
	await resend.emails.send({
		from: FROM_EMAIL,
		to,
		subject: `You're on the ${data.planName} plan!`,
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Confirmed!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        You're now on the <strong>${escapeHtml(data.planName)}</strong> plan!
      </p>
      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="color: #166534; font-size: 14px; margin: 0 0 4px;">Credits added to your account</p>
        <p style="color: #166534; font-size: 36px; font-weight: 700; margin: 0;">${data.credits}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Your credits renew each billing cycle. Unused credits don't roll over, so use them while you've got them!
      </p>
      <a href="https://scout.grove.place/search/new" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Start Searching
      </a>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
        Manage your subscription anytime in Settings.<br>— The Scout Team
      </p>
    </div>
  </div>
</body>
</html>
		`.trim()
	});
}

// Credit pack purchased email
export async function sendCreditPackPurchasedEmail(
	resend: Resend,
	to: string,
	data: {
		credits: number;
		totalCredits: number;
	}
): Promise<void> {
	await resend.emails.send({
		from: FROM_EMAIL,
		to,
		subject: `${data.credits} credits added to your account!`,
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Credits Added!</h1>
    </div>
    <div style="padding: 32px;">
      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="color: #166534; font-size: 14px; margin: 0 0 4px;">+${data.credits} credits</p>
        <p style="color: #166534; font-size: 36px; font-weight: 700; margin: 0;">${data.totalCredits} total</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Your credit pack has been added to your account. Each search uses 1 credit.
      </p>
      <a href="https://scout.grove.place/search/new" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Start Searching
      </a>
    </div>
    <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">
        Thanks for supporting Scout!<br>— The Scout Team
      </p>
    </div>
  </div>
</body>
</html>
		`.trim()
	});
}

// Helper to escape HTML
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
