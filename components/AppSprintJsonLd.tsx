export default function AppSprintJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "App Sprint",
    description:
      "A 6-week program to build and launch your own mobile app using Expo, React Native, and AI tools. Includes weekly group calls, 1-on-1 support, and a private Discord community of 51+ makers.",
    url: "https://tap-and-swipe.com/app-sprint",
    provider: {
      "@type": "Organization",
      name: "Tap & Swipe",
      url: "https://tap-and-swipe.com",
    },
    instructor: {
      "@type": "Person",
      name: "Arthur",
      url: "https://www.youtube.com/@ArthurBuildsStuff",
    },
    courseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      duration: "P6W",
      courseWorkload: "PT10H per week",
    },
    offers: {
      "@type": "Offer",
      price: "127",
      priceCurrency: "EUR",
      availability: "https://schema.org/LimitedAvailability",
      url: "https://tap-and-swipe.com/app-sprint#pricing",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      bestRating: "5",
      ratingCount: "7",
    },
    teaches: [
      "Mobile app development with Expo and React Native",
      "App design and UI/UX",
      "App monetization strategies",
      "App Store Optimization (ASO)",
      "Marketing and launching mobile apps",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
