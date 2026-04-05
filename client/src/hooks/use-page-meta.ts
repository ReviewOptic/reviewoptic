import { useEffect } from "react";

const DEFAULT_TITLE = "Review Request Software for Local Businesses | ReviewOptic";
const DEFAULT_DESCRIPTION =
  "Send review requests via email, SMS & WhatsApp — ReviewOptic follows up on autopilot. Collect more 5-star Google reviews for your local business.";
const BASE_URL = "https://www.reviewoptic.com";

export function usePageMeta(title: string, description: string, canonical?: string) {
  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMetaProperty("og:title", title);
    setMetaProperty("og:description", description);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    if (canonical) {
      setMetaProperty("og:url", BASE_URL + canonical);
      setCanonical(BASE_URL + canonical);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta("name", "description", DEFAULT_DESCRIPTION);
      setMetaProperty("og:title", DEFAULT_TITLE);
      setMetaProperty("og:description", DEFAULT_DESCRIPTION);
      setMeta("name", "twitter:title", DEFAULT_TITLE);
      setMeta("name", "twitter:description", DEFAULT_DESCRIPTION);
    };
  }, [title, description, canonical]);
}

function setMeta(attr: string, key: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function setMetaProperty(property: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function setCanonical(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}
