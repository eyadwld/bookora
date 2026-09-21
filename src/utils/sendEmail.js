import { Resend } from "resend";
import { config } from "dotenv";

import { ApiError } from "./ApiError.js";

config();

let resendClient = null;

const getClient = () => {
  const apiKey = process.env.RESEND_KEY;

  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

const FROM = process.env.RESEND_FROM || "Bookora <onboarding@resend.dev>";
const TO = process.env.ADMIN_EMAIL;

const isEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const sendEmail = async ({ recipient, subject, html }) => {
  if (!isEmail(recipient)) {
    throw ApiError(400, "Invalid email address");
  }

  const client = getClient();

  if (!client) {
    console.warn(
      `Email skipped (no RESEND_API_KEY): to=${recipient} subject=${subject}`,
    );

    return {
      skipped: true,
    };
  }

  try {
    const result = await client.emails.send({
      from: FROM,
      to: TO,
      subject,
      html,
    });

    if (result.error) {
      console.warn("[Resend API Error]:", result.error);

      return {
        skipped: true,
        error: result.error,
      };
    }

    return result;
  } catch (error) {
    console.warn("[Email Send Error]:", error?.message || error);

    return {
      skipped: true,
      error: error?.message || "Email sending failed",
    };
  }
};

/**
 * Welcome email.
 */
export const sendWelcomeEmail = (email, name = "") =>
  sendEmail({
    recipient: email,
    subject: "Welcome to Bookora!",
    html: `
            <strong>
                Hi ${name || "reader"}, you successfully signed up!
            </strong>
        `,
  });

/**
 * Email verification OTP.
 */
export const sendOtpEmail = (email, otp) => {
  sendEmail({
    recipient: email,
    subject: "Verify your email — Bookora",
    html: `
            <p>Your Bookora verification code is:</p>

            <h2 style="letter-spacing: 4px;">
                ${otp}
            </h2>

            <p>
                This code expires in 10 minutes.
                If you didn't request it, ignore this email.
            </p>
        `,
  });

  console.log("OTP email result:", result);
};

/**
 * Password reset OTP.
 */
export const sendPasswordResetEmail = (email, otp) =>
  sendEmail({
    recipient: email,
    subject: "Your Bookora password reset code",
    html: `
            <p>Your Bookora password reset code is:</p>

            <h2 style="letter-spacing: 4px;">
                ${otp}
            </h2>

            <p>
                This code expires in 10 minutes.
                If you didn't request it, ignore this email.
            </p>
        `,
  });

/**
 * Order confirmation email.
 */
export const sendOrderConfirmationEmail = ({ email, order }) => {
  const itemsList = order.items
    ? order.items
        .map(
          (item) => `
                    <li>
                        <b>${item.title}</b>
                        × ${item.quantity}
                        — $${Number(item.subTotal || 0).toFixed(2)}
                    </li>
                `,
        )
        .join("")
    : "";

  return sendEmail({
    recipient: email,
    subject: `Order Confirmed #${order._id.toString().slice(-6)} — Bookora`,
    html: `
            <h2>Thank you for your order!</h2>

            <p>
                Your payment was successful and your order
                is now being processed.
            </p>

            <p>
                <strong>Order ID:</strong>
                ${order._id}
            </p>

            <p>
                <strong>Total:</strong>
                $${Number(order.total || 0).toFixed(2)}
            </p>

            <h3>Items:</h3>

            <ul>
                ${itemsList}
            </ul>

            <p>
                We'll notify you as soon as your books are shipped!
            </p>
        `,
  });
};

export const sendEmailToOwner = async ({ to, ownerEmail, subject, html }) => {
  const recipient = to || ownerEmail;

  return sendEmail({
    recipient,
    subject,
    html,
  });
};
