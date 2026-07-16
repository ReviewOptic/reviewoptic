export const COOKIE_CONSENT_KEY = "ro_cookie_consent";
export const COOKIE_CONSENT_EVENT = "ro-cookie-consent-changed";

export function hasAnalyticsConsent() {
  return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
}

export function setCookieConsent(value: "accepted" | "declined") {
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}
