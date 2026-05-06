"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    if (!ref.current || typeof navigator === "undefined") return;
    const text = ref.current.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative mb-4">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="absolute top-2 right-2 inline-flex items-center justify-center rounded-md border border-black/10 bg-white/85 px-1.5 py-1 text-black/50 backdrop-blur transition-colors hover:bg-white hover:text-black cursor-pointer"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre
        ref={ref}
        className="overflow-x-auto rounded-xl bg-black/[0.06] p-4 pr-12"
      >
        {children}
      </pre>
    </div>
  );
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-black mb-4 mt-6 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-black mb-3 mt-5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-black mb-2 mt-4">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-black leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 text-black mb-4 space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 text-black mb-4 space-y-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-black">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-black underline underline-offset-2 hover:text-black/70 transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-black/15 pl-4 my-4 text-black/50 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const text = Array.isArray(children)
      ? children.join("")
      : String(children ?? "");
    const isBlock = !!className?.includes("language-") || text.includes("\n");
    if (isBlock) {
      return <code className="font-mono text-sm text-black/80">{children}</code>;
    }
    return (
      <code className="bg-black/[0.06] rounded px-1.5 py-0.5 text-sm text-black/80 font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  img: ({ src, alt, width, height }) => (
    <img
      src={src}
      alt={alt || ""}
      width={width}
      height={height}
      loading="lazy"
      className="rounded-xl max-w-full my-4 border border-black/10"
      style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
    />
  ),
  hr: () => <hr className="border-black/10 my-6" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm text-black">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left px-3 py-2 border-b border-black/10 text-black font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-black/5">{children}</td>
  ),
};

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-custom">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
