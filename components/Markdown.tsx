"use client";

import { memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { highlightLanguage, languageForFence } from "@/lib/highlight";

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const fence = className?.replace(/^language-/, "");
  const language = languageForFence(fence);
  const code = String(children ?? "").replace(/\n$/, "");
  const html = highlightLanguage(language, code);
  return (
    <pre className="my-3 overflow-auto border border-line bg-canvas px-3 py-2 font-mono text-[12px] leading-5">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }) {
            const inline = !className;
            if (inline) {
              return (
                <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[12px]" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" className="underline hover:text-fg">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
