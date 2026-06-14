import "server-only";

export interface SendEmailPayload {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

/**
 * Sends a transactional email using the Brevo SMTP API.
 */
export async function sendEmailViaBrevo(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Namaste Indian Restaurant";

  if (!apiKey) {
    return {
      success: false,
      errorMessage: "Brevo API key is not configured in environment variables."
    };
  }

  if (!senderEmail) {
    return {
      success: false,
      errorMessage: "Brevo sender email is not configured in environment variables."
    };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: payload.toEmail,
            name: payload.toName || payload.toEmail
          }
        ],
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        ...(payload.textContent ? { textContent: payload.textContent } : {})
      })
    });


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || `HTTP error ${response.status}: ${response.statusText}`;
      return {
        success: false,
        errorMessage: errorMsg
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      messageId: responseData.messageId
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err.message || "An unexpected error occurred during SMTP call."
    };
  }
}
