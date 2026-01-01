// Shared markdown renderer for chat messages
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type CodeProps = {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

const markdownComponents: Components = {
  p: ({ node, ...props }) => (
    <p
      className="text-inherit leading-relaxed whitespace-pre-wrap"
      {...props}
    />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc ml-4 space-y-1 leading-relaxed" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal ml-4 space-y-1 leading-relaxed" {...props} />
  ),
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  a: ({ node, ...props }) => (
    <a className="underline underline-offset-2 font-medium" {...props} />
  ),
  code: ({ inline, className, children, ...props }: CodeProps) => {
    if (inline) {
      return (
        <code
          className="rounded bg-zinc-800/10 px-1.5 py-0.5 text-xs font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-900/80 px-3 py-2 text-xs font-mono text-zinc-100">
        <code {...props}>{children}</code>
      </pre>
    );
  },
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-2 border-current/40 pl-3 leading-relaxed opacity-90"
      {...props}
    />
  ),
};

export function MessageMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-2 break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
