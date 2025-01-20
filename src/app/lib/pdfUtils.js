// app/lib/pdfUtils.js
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
    let yOffset = 10;
    const xOffset = 10;
    const lineHeight = 6;

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
                            newTextParts.push(textOrBlock)
                        }
                    });
                    textParts = newTextParts;
                });

                textParts.forEach(textOrBlock => {
                    if (typeof textOrBlock === 'string') {
                        const text = textOrBlock.trim()
                        if (text) {
                            pdf.text(`${message.role === 'user' ? 'User' : 'Gemini'}: ${text}`, xOffset, yOffset);
                            yOffset += lineHeight;

                            if (yOffset > pdf.internal.pageSize.height - 10) {
                                pdf.addPage();
                                yOffset = 10;
                            }
                        }

                    } else {
                        const codeLines = textOrBlock.code.trim().split('\n')
                        pdf.setFont('courier', 'normal')
                        codeLines.forEach(line => {
                            pdf.text(line, xOffset, yOffset);
                            yOffset += lineHeight;

                            if (yOffset > pdf.internal.pageSize.height - 10) {
                                pdf.addPage();
                                yOffset = 10;
                            }
                        })
                        pdf.setFont('helvetica', 'normal')
                        yOffset += lineHeight; // Space after code block
                        if (yOffset > pdf.internal.pageSize.height - 10) {
                            pdf.addPage();
                            yOffset = 10;
                        }
                    }

                })

            } else {

                const text = part.text.trim()
                if (text) {
                    pdf.text(`${message.role === 'user' ? 'User' : 'Gemini'}: ${text}`, xOffset, yOffset);
                    yOffset += lineHeight;

                    if (yOffset > pdf.internal.pageSize.height - 10) {
                        pdf.addPage();
                        yOffset = 10;
                    }
                }

                yOffset += 2;
            }
        })
    });
    pdf.save("gemini_chat_history.pdf");
};