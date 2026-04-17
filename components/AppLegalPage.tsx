import { readFileSync } from "fs";
import { join } from "path";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface AppLegalPageProps {
  appName: string;
  appSlug: string;
  contentPath: string;
  showSupportLink?: boolean;
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 text-xl font-semibold text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 font-semibold text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-2 leading-relaxed text-muted-foreground">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-6 text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline transition-opacity hover:opacity-70"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  hr: () => <hr className="my-6 border-border" />,
};

export default function AppLegalPage({
  appName,
  appSlug,
  contentPath,
  showSupportLink = true,
}: AppLegalPageProps) {
  const filePath = join(process.cwd(), contentPath);
  const content = readFileSync(filePath, "utf-8");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <header className="mb-10">
        <a
          href={`/${appSlug}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-opacity hover:opacity-70"
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {appName}
        </a>
      </header>

      <article className="space-y-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
          {content}
        </ReactMarkdown>
      </article>

      <footer className="mt-16 w-full text-center text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">TAP &amp; SWIPE</p>
        <p className="mt-1">
          <a href={`/${appSlug}/privacy`} className="underline hover:opacity-70">Privacy</a>
          {" · "}
          <a href={`/${appSlug}/terms`} className="underline hover:opacity-70">Terms</a>
          {showSupportLink && (
            <>
              {" · "}
              <a href={`/${appSlug}/support`} className="underline hover:opacity-70">Support</a>
            </>
          )}
        </p>
      </footer>
    </div>
  );
}
