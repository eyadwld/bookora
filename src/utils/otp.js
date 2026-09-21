import * as OTPAuth from "otpauth";

const ISSUER = "Bookora";
const DIGITS = 6;
const PERIOD_SECONDS = 600; // OTP valid 10 minutes
const WINDOW = 1; // accept ±1 step for clock drift

const buildTotp = (secretBase32, label) =>
  new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

// Create a fresh per-user secret (store base32 string in DB).
export const createOtpSecret = () => new OTPAuth.Secret({ size: 20 }).base32;

// Generate the current 6-digit token for a secret.
export const generateOtpToken = (secretBase32, label = "user") =>
  buildTotp(secretBase32, label).generate();

// Returns true when token is valid for the secret (current ±1 step).
export const verifyOtpToken = (secretBase32, token, label = "user") => {
  if (!secretBase32 || !token) return false;
  try {
    return (
      buildTotp(secretBase32, label).validate({ token, window: WINDOW }) !==
      null
    );
  } catch {
    return false;
  }
};

export default { createOtpSecret, generateOtpToken, verifyOtpToken };
