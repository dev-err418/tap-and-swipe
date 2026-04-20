"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-black mb-4 mt-6 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-[#FF9500] mb-3 mt-5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-black mb-2 mt-4">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-black/60 leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 text-black/60 mb-4 space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 text-black/60 mb-4 space-y-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-black/60">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#FF9500] underline hover:text-[#FF9500]/80 transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#FF9500]/40 pl-4 my-4 text-black/50 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block bg-black/[0.06] rounded-xl p-4 text-sm text-black/70 overflow-x-auto mb-4 font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-black/[0.06] rounded px-1.5 py-0.5 text-sm text-[#FF9500]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mb-4">{children}</pre>,
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
      <table className="w-full text-sm text-black/60">{children}</table>
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
