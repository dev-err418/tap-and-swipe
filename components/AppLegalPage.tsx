import { readFileSync } from "fs";
import { join } from "path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface AppLegalPageProps {
  appName: string;
  appSlug: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  contentPath: string;
}

export default function AppLegalPage({
  appName,
  appSlug,
  primaryColor,
  backgroundColor,
  textColor,
  mutedColor,
  contentPath,
}: AppLegalPageProps) {
  const filePath = join(process.cwd(), contentPath);
  const content = readFileSync(filePath, "utf-8");

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="mb-4 mt-6 text-2xl font-bold first:mt-0" style={{ color: textColor }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 text-xl font-bold" style={{ color: primaryColor }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-lg font-semibold" style={{ color: textColor }}>
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed" style={{ color: mutedColor }}>
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mb-4 list-disc space-y-1 pl-5" style={{ color: mutedColor }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 list-decimal space-y-1 pl-5" style={{ color: mutedColor }}>
        {children}
      </ol>
    ),
    li: ({ children }) => <li style={{ color: mutedColor }}>{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline transition-colors hover:opacity-80"
        style={{ color: primaryColor }}
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className="my-4 border-l-2 pl-4 italic"
        style={{ borderColor: `${primaryColor}40`, color: `${mutedColor}cc` }}
      >
        {children}
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold" style={{ color: textColor }}>
        {children}
      </strong>
    ),
    hr: () => <hr className="my-6" style={{ borderColor: `${mutedColor}30` }} />,
  };

  return (
    <main
      className="flex min-h-screen flex-col px-4 py-8"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="mx-auto w-full max-w-2xl flex-1">
        <header className="mb-8">
          <a
            href={`/${appSlug}`}
            className="inline-flex items-center text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: primaryColor }}
          >
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {appName}
          </a>
        </header>

        <article className="prose-custom">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </ReactMarkdown>
        </article>
      </div>

      <footer className="mt-12 w-full text-center text-sm" style={{ color: mutedColor }}>
        <p className="font-semibold" style={{ color: textColor }}>TAP &amp; SWIPE</p>
        <p className="mt-1">
          <a href={`/${appSlug}/privacy`} className="underline hover:opacity-70">Privacy</a>
          {" · "}
          <a href={`/${appSlug}/terms`} className="underline hover:opacity-70">Terms</a>
          {" · "}
          <a href={`/${appSlug}/support`} className="underline hover:opacity-70">Support</a>
        </p>
      </footer>
    </main>
  );
}
