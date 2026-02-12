export default function FaqJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is this program for me?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "This is for you if you dream of building your own app but have no idea where to start. If you want to become financially independent through your own ideas, you're ready to learn even the boring stuff, and you want to build something real instead of just dreaming.",
        },
      },
      {
        "@type": "Question",
        name: "Who should NOT join?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "If you expect AI to do all the work while you sit back and watch, this isn't for you. Same if you're not willing to do the parts that aren't fun, if freedom and flexibility aren't priorities for you, or if you expect magic results without putting in the work.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to know how to code?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "If you already know how to code, you'll move faster. If you use AI tools like Cursor or Claude Code, that works great too. You don't need to be an expert, but you need to be willing to get your hands dirty and learn as you go.",
        },
      },
      {
        "@type": "Question",
        name: "What do I need to start?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A code editor (IDE), an AI coding tool, an Apple Developer account, and ideally a Mac (it makes everything easier). If you want to earn money from your app, you'll also need a business structure depending on your country.",
        },
      },
      {
        "@type": "Question",
        name: "How long before my app is live?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It depends on you. Some people speed run it in a few weeks, others take their time over a few months. The roadmap is there, the community is there, you set the pace.",
        },
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
