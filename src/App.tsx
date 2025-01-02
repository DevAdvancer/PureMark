import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sun, Moon, Download, Copy, Layout, Github, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
});

const defaultMarkdown = `# Welcome to PureMark

## Features
- 📝 Real-time preview
- 🌓 Dark/Light mode
- 💾 Download your markdown
- 📋 Copy to clipboard
- ✨ Beautiful UI

## Example
\`\`\`python
print("Hello Coders!!")
\`\`\`

> Try editing this markdown to see the preview update in real-time!
`;

function App() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  interface TocItem {
    level: number;
    text: string;
    page: number;
  }

  const handlePdfExport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;
    let currentPage = 1;
    const toc: TocItem[] = [];

    // Add custom font
    doc.addFont('helvetica', 'normal');
    doc.addFont('helvetica', 'bold');

    // Function to add a new page
    const addNewPage = () => {
      doc.addPage();
      currentPage++;
      currentY = margin;
      // Add page number
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    // Function to process text blocks with proper wrapping
    const addTextBlock = (text: string, fontSize: number, fontStyle: string = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);

      lines.forEach((line: string) => {
        if (currentY > pageHeight - margin) {
          addNewPage();
        }
        doc.text(line, margin, currentY);
        currentY += fontSize * 0.5;
      });
      currentY += fontSize * 0.3;
    };

    // Create title page
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Markdown Document', pageWidth / 2, currentY, { align: 'center' });
    currentY += 40;

    // Add date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' });

    // Add new page for TOC
    addNewPage();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Table of Contents', margin, currentY);
    currentY += 20;

    // Parse markdown and generate content
    const tokens = marked.lexer(markdown);
    let tocY = currentY;  // Save position for TOC

    // Add new page for content
    addNewPage();

    tokens.forEach((token: marked.Token) => {
      if (token.type === 'heading') {
        // Add to TOC
        toc.push({
          level: token.depth,
          text: token.text,
          page: currentPage
        });

        // Add heading to content
        const fontSize = 20 - token.depth * 2;
        addTextBlock(token.text, fontSize, 'bold');
      }
      else if (token.type === 'paragraph') {
        addTextBlock(token.text, 12);
      }
      else if (token.type === 'code') {
        currentY += 10;
        doc.setFillColor(245, 245, 245);
        const codeLines = token.text.split('\n');
        const codeHeight = codeLines.length * 14;
        doc.rect(margin - 5, currentY - 5, pageWidth - 2 * margin + 10, codeHeight + 10, 'F');

        doc.setFont('courier', 'normal');
        doc.setFontSize(10);
        codeLines.forEach((line: string) => {
          if (currentY > pageHeight - margin) {
            addNewPage();
          }
          doc.text(line, margin, currentY);
          currentY += 14;
        });
        doc.setFont('helvetica', 'normal');
        currentY += 10;
      }
      else if (token.type === 'list') {
        token.items.forEach((item: any) => {
          if (currentY > pageHeight - margin) {
            addNewPage();
          }
          doc.setFontSize(12);
          doc.text('• ', margin, currentY);
          addTextBlock(item.text, 12);
        });
      }
    });

    // Go back and fill in TOC
    doc.setPage(2);
    currentY = tocY;
    toc.forEach((item) => {
      const indent = (item.level - 1) * 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.text}`, margin + indent, currentY);
      doc.text(`${item.page}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 15;
    });

    // Save the PDF
    doc.save('markdown-document.pdf');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Github className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PureMark</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Toggle Preview"
            >
              <Layout className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Copy to Clipboard"
            >
              <Copy className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Download Markdown"
            >
              <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={handlePdfExport}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Export to PDF"
            >
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="h-[calc(100vh-12rem)]">
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-full p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent resize-none font-mono"
              placeholder="Write your markdown here..."
            />
          </div>
          {showPreview && (
            <div className="h-[calc(100vh-12rem)] overflow-auto">
              <div
                className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© {new Date().getFullYear()} PureMark. All rights reserved. Made By DevAdvancer</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
