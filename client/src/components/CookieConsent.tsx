import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "ro_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 pointer-events-auto">
        <p className="text-sm text-gray-600 flex-1 leading-relaxed">
          We use essential cookies to keep you logged in and make the app work. We don't use tracking or advertising cookies.{" "}
          <a href="/privacy" className="underline text-gray-700 hover:text-gray-900" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={decline} className="text-xs">
            Decline
          </Button>
          <Button size="sm" onClick={accept} className="text-xs">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
