import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // You can switch to another theme like 'atom-one-dark'

export const renderMarkdown = (text) => {
  return (
    <div className="prose prose-sm sm:prose lg:prose-lg max-w-none text-slate-800 dark:text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ inline, children, className }) => {
            return inline ? (
              <code className="bg-slate-100 px-1 rounded text-pink-600 text-sm">
                {children}
              </code>
            ) : (
              <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-x-auto text-sm">
                <code className={className}>{children}</code>
              </pre>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
