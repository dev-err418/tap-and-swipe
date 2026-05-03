export const SITE_URL = "https://tap-and-swipe.com";

export const AUTHOR_NAME = "Arthur Spalanzani";

export const AUTHOR_SAME_AS = [
  "https://www.youtube.com/@ArthurBuildsStuff",
  "https://www.linkedin.com/in/arthur-spalanzani/",
  "https://x.com/arthursbuilds",
] as const;

export const PUBLISHER_NAME = "Tap & Swipe";
export const PUBLISHER_LOGO = `${SITE_URL}/icon.png`;

export const authorJsonLd = {
  "@type": "Person",
  name: AUTHOR_NAME,
  url: AUTHOR_SAME_AS[0],
  sameAs: [...AUTHOR_SAME_AS],
} as const;

export const publisherJsonLd = {
  "@type": "Organization",
  name: PUBLISHER_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: PUBLISHER_LOGO },
} as const;
