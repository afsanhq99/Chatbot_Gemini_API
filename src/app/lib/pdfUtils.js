import { jsPDF } from 'jspdf';

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

export const generateChatPDF = (chatHistory) => {
    const pdf = new jsPDF();
    let yOffset = 20; // Initial Y offset
    const xOffset = 10; // Initial X offset
    const lineHeight = 8; // Line height for regular text
    const codeLineHeight = 6; // Line height for code blocks
    const pageHeight = pdf.internal.pageSize.height;

    // Set default font and size
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);

    // Add a title to the PDF
    pdf.setFontSize(18);
    pdf.setTextColor(33, 150, 243); // Blue color for the title
    pdf.text('Chat History', xOffset, yOffset);
    yOffset += 20; // Add space after the title

    // Reset font size and color for the chat content
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0); // Black color for the content

    chatHistory.forEach((message) => {
        message.parts.forEach((part) => {
            const codeBlocks = extractCodeBlocks(part.text);

            if (codeBlocks.length > 0) {
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

                textParts.forEach((textOrBlock) => {
                    if (typeof textOrBlock === 'string') {
                        const text = textOrBlock.trim();
                        if (text) {
                            // Set user or model color
                            pdf.setTextColor(message.role === 'user' ? 33 : 76, 175, 80); // Blue for user, green for model
                            pdf.text(`${message.role === 'user' ? 'You:' : 'Gemini:'}`, xOffset, yOffset);
                            pdf.setTextColor(0, 0, 0); // Reset to black for the message text
                            pdf.text(text, xOffset + 20, yOffset, { maxWidth: 180, align: 'left' });
                            yOffset += lineHeight;

                            if (yOffset > pageHeight - 20) {
                                pdf.addPage();
                                yOffset = 20;
                            }
                        }
                    } else {
                        // Code block styling
                        pdf.setFont('courier', 'normal');
                        pdf.setTextColor(0, 0, 0); // Black for code
                        const codeLines = textOrBlock.code.trim().split('\n');
                        codeLines.forEach((line) => {
                            pdf.text(line, xOffset + 10, yOffset, { maxWidth: 180, align: 'left' });
                            yOffset += codeLineHeight;

                            if (yOffset > pageHeight - 20) {
                                pdf.addPage();
                                yOffset = 20;
                            }
                        });
                        pdf.setFont('helvetica', 'normal'); // Reset font
                        yOffset += lineHeight; // Add space after code block

                        if (yOffset > pageHeight - 20) {
                            pdf.addPage();
                            yOffset = 20;
                        }
                    }
                });
            } else {
                const text = part.text.trim();
                if (text) {
                    // Set user or model color
                    pdf.setTextColor(message.role === 'user' ? 33 : 76, 175, 80); // Blue for user, green for model
                    pdf.text(`${message.role === 'user' ? 'You:' : 'Gemini:'}`, xOffset, yOffset);
                    pdf.setTextColor(0, 0, 0); // Reset to black for the message text
                    pdf.text(text, xOffset + 20, yOffset, { maxWidth: 180, align: 'left' });
                    yOffset += lineHeight;

                    if (yOffset > pageHeight - 20) {
                        pdf.addPage();
                        yOffset = 20;
                    }
                }

                yOffset += 2; // Add small space between messages
            }
        });
    });

    // Save the PDF
    pdf.save('gemini_chat_history.pdf');
};