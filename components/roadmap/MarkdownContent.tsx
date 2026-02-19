"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-[#f1ebe2] mb-4 mt-6 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-[#f4cf8f] mb-3 mt-5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-[#f1ebe2] mb-2 mt-4">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[#c9c4bc] leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 text-[#c9c4bc] mb-4 space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 text-[#c9c4bc] mb-4 space-y-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-[#c9c4bc]">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#f4cf8f] underline hover:text-[#f4cf8f]/80 transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#f4cf8f]/40 pl-4 my-4 text-[#c9c4bc]/80 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block bg-black/30 rounded-xl p-4 text-sm text-[#c9c4bc] overflow-x-auto mb-4 font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-white/10 rounded px-1.5 py-0.5 text-sm text-[#f4cf8f] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mb-4">{children}</pre>,
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ""}
      className="rounded-xl max-w-full my-4 border border-white/10"
    />
  ),
  hr: () => <hr className="border-white/10 my-6" />,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm text-[#c9c4bc]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left px-3 py-2 border-b border-white/10 text-[#f1ebe2] font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-white/5">{children}</td>
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
