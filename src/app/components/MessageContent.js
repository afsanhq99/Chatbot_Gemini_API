import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Fragment } from 'react';

const MessageContent = ({ message }) => {
    // Escape HTML entities to prevent XSS
    const escapeHTML = (str) => str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);

    // Helper function to render a single line with markdown formatting
    const renderLine = (line, key) => {
        let processedLine = escapeHTML(line)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold (**text**)
            .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic (*text*)

        // Headers (H1-H3)
        if (line.startsWith('### ')) return <h3 key={key} dangerouslySetInnerHTML={{ __html: processedLine.slice(4) }} />;
        if (line.startsWith('## ')) return <h2 key={key} dangerouslySetInnerHTML={{ __html: processedLine.slice(3) }} />;
        if (line.startsWith('# ')) return <h1 key={key} dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />;

        // Lists
        if (/^(\*|-)\s/.test(line)) return <li key={key} dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />;

        return <div key={key} className="my-2" dangerouslySetInnerHTML={{ __html: processedLine }} />;
    };

    // Splits text into code blocks and normal text
    const parseMessageParts = (text) => {
        const regex = /```(\w*)\n([\s\S]*?)```/g;
        let parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [fullMatch, language, code] = match;

            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
            }

            parts.push({ type: 'code', language: language || 'plaintext', code: code.trim() });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push({ type: 'text', content: text.substring(lastIndex) });
        }

        return parts;
    };

    return (
        <>
            {message.parts.map((part, partIndex) => {
                const parsedParts = parseMessageParts(part.text);

                return (
                    <Fragment key={partIndex}>
                        {parsedParts.map((p, index) =>
                            p.type === 'text' ? (
                                p.content.split('\n').map((line, lineIndex) => renderLine(line, `${partIndex}-${index}-${lineIndex}`))
                            ) : (
                                <SyntaxHighlighter key={`${partIndex}-${index}`} language={p.language} style={atomDark}>
                                    {p.code}
                                </SyntaxHighlighter>
                            )
                        )}
                    </Fragment>
                );
            })}
        </>
    );
};

export default MessageContent;
