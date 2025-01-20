import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const extractCodeBlocks = (text) => {
    const codeBlocks = [];
    const lines = text.split('\n');
    let inCodeBlock = false;
    let currentBlock = '';
    let currentLanguage = '';

    for (const line of lines) {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                codeBlocks.push({ language: currentLanguage, code: currentBlock });
                currentBlock = '';
                currentLanguage = '';
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
                currentLanguage = line.substring(3).trim();
            }
        } else if (inCodeBlock) {
            currentBlock += line + '\n';
        }
    }

    return codeBlocks;
};

const renderTextWithFormatting = (text) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
            // Bold text
            return <strong key={index}>{line.slice(2, -2)}</strong>;
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            // List items
            return <li key={index}>{line.slice(2)}</li>;
        } else if (line.startsWith('### ')) {
            // H3 header
            return <h3 key={index}>{line.slice(4)}</h3>;
        } else if (line.startsWith('## ')) {
            // H2 header
            return <h2 key={index}>{line.slice(3)}</h2>;
        } else if (line.startsWith('# ')) {
            // H1 header
            return <h1 key={index}>{line.slice(2)}</h1>;
        } else {
            // Regular text
            return <p key={index} style={{ margin: '0.5em 0' }}>{line}</p>;
        }
    });
};

export default function MessageContent({ message }) {
    const renderMessageContent = (message) => {
        return message.parts.map((part, partIndex) => {
            const codeBlocks = extractCodeBlocks(part.text);

            if (codeBlocks.length === 0) {
                return (
                    <div key={partIndex} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {renderTextWithFormatting(part.text)}
                    </div>
                );
            }

            let textParts = [part.text];
            codeBlocks.forEach((block) => {
                const newTextParts = [];
                textParts.forEach((textOrBlock) => {
                    if (typeof textOrBlock === 'string') {
                        const splitParts = textOrBlock.split('```' + block.language + '\n' + block.code + '```');
                        splitParts.forEach((splitPart, index) => {
                            if (index < splitParts.length - 1) {
                                newTextParts.push(splitPart, block);
                            } else {
                                newTextParts.push(splitPart);
                            }
                        });
                    } else {
                        newTextParts.push(textOrBlock);
                    }
                });
                textParts = newTextParts;
            });

            return textParts.map((textOrBlock, index) => {
                if (typeof textOrBlock === 'string') {
                    return (
                        <div key={`${partIndex}-${index}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {renderTextWithFormatting(textOrBlock)}
                        </div>
                    );
                } else {
                    return (
                        <SyntaxHighlighter key={`${partIndex}-${index}`} language={textOrBlock.language} style={atomDark}>
                            {textOrBlock.code.trim()}
                        </SyntaxHighlighter>
                    );
                }
            });
        });
    };

    return renderMessageContent(message);
}