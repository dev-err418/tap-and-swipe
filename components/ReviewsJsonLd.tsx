export default function ReviewsJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "App Sprint",
    description:
      "A complete program to build and launch your own mobile app in weeks, not months.",
    url: "https://tap-and-swipe.com/app-sprint",
    brand: {
      "@type": "Brand",
      name: "Tap & Swipe",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      bestRating: "5",
      worstRating: "1",
      ratingCount: "7",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "JX_Op" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "This is by far the best small community for people wanting to build apps I have been in the community for about 5 days or so I am still in the early stages of building my app but Arthur has helped every step of the way have been on multiple 1on1 calls also there was a full roadmap to get started and everyone is always building their own thing or helping each other so very like minded couldn't recommend it enough",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Luka" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "I have been in this community for few days, and overall experience is great. Arthur is very enthusiastic and really helpful, and other members are also nice, willing to help each other improve. I never paid for community before, but this one is definitely worth it. Changing your mind and to pivot is a difficult task to do, and I definitely needed more experienced people to teach me correct approaches. Shortly, this community is awesome, and looking forward to see how it grows.",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "jesse" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "If you're wanting to build apps this is the clear best community that provides step by step instructions, constant advice and a like minded community.",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Hnythng" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "Finally found a community where I can share progress and get feedback or ask questions and get answers from someone that is at another level in the app game, joining this group has been the best investment for my personal app development",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Ilya" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "Found a lot of useful materials and a very supportive community",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "user1a1a586904" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "Three days in and I already submitted my first app. Arthur's insane... constant feedback, always jumping on 1:1s, sharing value nonstop. 100% recommend the community, no-code or dev.",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "raphael adouane" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "This Discord guide is complete and covers everything needed to ship your first app. Arthur is super helpful and always there to share his expertise. Highly recommended for aspiring app creators! (The community is also a huge plus for feedback).",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
