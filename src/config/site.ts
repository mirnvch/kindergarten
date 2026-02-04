export const siteConfig = {
  name: "DocConnect",
  description:
    "Find the perfect healthcare provider. Browse verified doctors, read patient reviews, and book appointments online.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    twitter: "https://twitter.com/docconnect",
    facebook: "https://facebook.com/docconnect",
    instagram: "https://instagram.com/docconnect",
  },
  creator: "DocConnect Team",
  keywords: [
    "doctor",
    "healthcare",
    "medical",
    "doctor near me",
    "clinic near me",
    "telemedicine",
    "appointment",
    "specialist",
  ],
};

export type SiteConfig = typeof siteConfig;
