export const siteConfig = {
  name: "KinderCare",
  description:
    "Find the perfect daycare for your child. Browse thousands of licensed daycares, read reviews, and book tours online.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    twitter: "https://twitter.com/kindercare",
    facebook: "https://facebook.com/kindercare",
    instagram: "https://instagram.com/kindercare",
  },
  creator: "KinderCare Team",
  keywords: [
    "daycare",
    "childcare",
    "preschool",
    "child care near me",
    "daycare near me",
    "early childhood education",
    "babysitter",
    "nursery",
  ],
};

export type SiteConfig = typeof siteConfig;
