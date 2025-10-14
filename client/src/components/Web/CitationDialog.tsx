import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { OGDialog, OGDialogContent, Button } from '@librechat/client';
import { X, FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocalize } from '~/hooks';
import type { SourceData } from './SourceHovercard';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CitationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  source: SourceData & {
    fileName?: string;
    fileId?: string;
    page?: number;
    text?: string;
    metadata?: {
      storageType?: string;
      type?: string;
      mimeType?: string;
      start_char?: number;
      end_char?: number;
      // Optional normalized bounding boxes per match (origin: top-left, [0..1])
      boxes?: Array<{ x: number; y: number; width: number; height: number }>;
    };
  };
}

export default function CitationDialog({ isOpen, onOpenChange, source }: CitationDialogProps) {
  const localize = useLocalize();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [pageBounds, setPageBounds] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  // Memoize normalized boxes from metadata if present
  const normalizedBoxes = useMemo(() => source?.metadata?.boxes ?? [], [source?.metadata?.boxes]);

  // Check if the file is a PDF
  const isPDF = useCallback(() => {
    const fileName = source.fileName || source.title || '';
    const mimeType = source.metadata?.mimeType || '';
    return (
      fileName.toLowerCase().endsWith('.pdf') ||
      mimeType === 'application/pdf' ||
      source.metadata?.type === 'pdf'
    );
  }, [source]);

  // Fetch PDF file when dialog opens
  useEffect(() => {
    // Closure-scoped variable to track this effect's blob URL
    let localPdfUrl: string | null = null;
    const ac = new AbortController();
    let active = true;

    if (isOpen && isPDF() && source.link) {
      setIsLoading(true);
      setError(null);

      // Always fetch the blob to ensure we have a valid reference
      fetch(source.link, { signal: ac.signal })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch PDF');
          }
          return response.blob();
        })
        .then((blob) => {
          if (!active || ac.signal.aborted) return;
          // Create a new blob URL each time the dialog opens
          const url = URL.createObjectURL(blob);
          localPdfUrl = url;
          setPdfUrl(url);
          setIsLoading(false);
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          console.error('Error loading PDF:', err);
          setError('Failed to load PDF');
          setIsLoading(false);
        });
    } else if (!isOpen) {
      // Clear the PDF URL when dialog closes
      setPdfUrl(null);
    }

    // Cleanup: revoke the blob URL when dialog closes or component unmounts
    return () => {
      active = false;
      ac.abort();
      if (localPdfUrl && localPdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPdfUrl);
        localPdfUrl = null;
      }
    };
  }, [isOpen, source.link, isPDF]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Navigate to the cited page if available, otherwise start at page 1
    const targetPage = source.page && source.page > 0 && source.page <= numPages ? source.page : 1;
    setPageNumber(targetPage);

    // Set search text for highlighting if available
    if (source.text || source.snippet) {
      // Extract a meaningful search phrase (first 50 chars or first sentence)
      const textToHighlight = source.text || source.snippet || '';
      const searchPhrase = textToHighlight.substring(0, 100).trim();
      setSearchText(searchPhrase);
    }
  };

  // Highlight and select text in the PDF for the current page
  const applyHighlights = useCallback(() => {
    if (
      (!searchText &&
        (source?.metadata?.start_char == null || source?.metadata?.end_char == null)) ||
      !pdfUrl
    ) {
      return;
    }
    const textLayer = viewerRef.current?.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return;

    // Clear any previous highlights
    const previousHighlights = textLayer.querySelectorAll('span[data-highlighted="true"]');
    previousHighlights.forEach((span) => {
      (span as HTMLElement).style.backgroundColor = '';
      (span as HTMLElement).style.borderRadius = '';
      span.removeAttribute('data-highlighted');
    });

    const spans = Array.from(textLayer.querySelectorAll('span')) as HTMLElement[];
    let matchedSpans: HTMLElement[] = [];

    // Prefer exact char range highlight when provided
    const startChar = source?.metadata?.start_char;
    const endChar = source?.metadata?.end_char;
    if (
      typeof startChar === 'number' &&
      typeof endChar === 'number' &&
      endChar > startChar &&
      spans.length > 0
    ) {
      // Build cumulative char positions over text spans
      let offset = 0;
      const ranges: Array<{ span: HTMLElement; start: number; end: number }> = [];
      for (const span of spans) {
        const text = span.textContent || '';
        const start = offset;
        const end = start + text.length;
        ranges.push({ span, start, end });
        offset = end;
      }
      matchedSpans = ranges
        .filter((r) => !(r.end <= startChar || r.start >= endChar))
        .map((r) => r.span);
    }

    // Fallback to fuzzy phrase search when no char range match
    if (matchedSpans.length === 0 && searchText) {
      const phrase = searchText.toLowerCase();
      const tokens = phrase.split(/\s+/).filter((w) => w.length > 3);
      matchedSpans = spans.filter((span) => {
        const text = (span.textContent || '').toLowerCase();
        return tokens.some((word) => text.includes(word));
      });
    }

    // Apply highlight styling
    let firstMatchSpan: HTMLElement | null = null;
    matchedSpans.forEach((htmlSpan) => {
      htmlSpan.style.backgroundColor = 'rgba(255, 235, 59, 0.48)';
      htmlSpan.style.borderRadius = '2px';
      htmlSpan.style.padding = '2px 0';
      htmlSpan.setAttribute('data-highlighted', 'true');
      if (!firstMatchSpan) firstMatchSpan = htmlSpan;
    });

    // Scroll to first match and use native selection
    if (firstMatchSpan && matchedSpans.length > 0) {
      firstMatchSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.setStartBefore(matchedSpans[0]);
          range.setEndAfter(matchedSpans[matchedSpans.length - 1]);
          selection.addRange(range);
        }
      } catch (e) {
        console.debug('Could not create text selection:', e);
      }
    }
  }, [searchText, pdfUrl, source?.metadata?.start_char, source?.metadata?.end_char]);

  useEffect(() => {
    // Re-apply highlights when inputs change for the current page
    applyHighlights();
  }, [applyHighlights, pageNumber]);

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF document:', error);
    setError('Failed to load PDF document');
  };

  const handlePreviousPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  };

  const renderContent = () => {
    if (!isPDF()) {
      // Render text content for non-PDF files
      return (
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {source.snippet ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-secondary p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                  {source.snippet}
                </p>
              </div>

              {source.title && source.title !== source.attribution && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-text-secondary">{source.title}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-3 h-12 w-12 text-text-tertiary" />
              <p className="text-sm text-text-secondary">
                {localize('com_ui_no_content') || 'No content available'}
              </p>
            </div>
          )}
        </div>
      );
    }

    // Render PDF viewer
    return (
      <div className="flex flex-col">
        {/* PDF Controls */}
        <div className="flex items-center justify-between border-b border-border-medium p-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePreviousPage}
              disabled={pageNumber <= 1}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-secondary">
              {pageNumber} / {numPages || '?'}
            </span>
            <Button
              onClick={handleNextPage}
              disabled={pageNumber >= (numPages || 1)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-secondary">{Math.round(scale * 100)}%</span>
            <Button
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="max-h-[60vh] overflow-auto bg-gray-100 p-4 dark:bg-gray-900">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-text-secondary">
                {localize('com_ui_loading_pdf') || 'Loading PDF...'}
              </p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-12 w-12 text-text-tertiary" />
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
          )}
          {!isLoading && !error && pdfUrl && (
            <div className="flex justify-center">
              <div ref={viewerRef} className="relative">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-text-secondary">
                        {localize('com_ui_loading_document') || 'Loading document...'}
                      </p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-lg"
                    onRenderSuccess={() => {
                      // Measure canvas bounds in CSS pixels relative to wrapper
                      const wrapper = viewerRef.current;
                      const canvas = wrapper?.querySelector(
                        '.react-pdf__Page__canvas',
                      ) as HTMLCanvasElement | null;
                      if (wrapper && canvas) {
                        const canvasRect = canvas.getBoundingClientRect();
                        const wrapperRect = wrapper.getBoundingClientRect();
                        setPageBounds({
                          left: canvasRect.left - wrapperRect.left,
                          top: canvasRect.top - wrapperRect.top,
                          width: canvasRect.width,
                          height: canvasRect.height,
                        });
                      }
                      // Trigger highlights once the page is rendered
                      requestAnimationFrame(() => applyHighlights());
                    }}
                  />
                </Document>

                {/* Overlay absolute-positioned normalized highlight boxes if provided */}
                {pageBounds &&
                  normalizedBoxes?.length > 0 &&
                  (!source.page || source.page === pageNumber) && (
                    <div
                      className="pointer-events-none absolute"
                      style={{
                        left: pageBounds.left,
                        top: pageBounds.top,
                        width: pageBounds.width,
                        height: pageBounds.height,
                      }}
                    >
                      {normalizedBoxes.map((b, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${Math.max(0, Math.min(1, b.x)) * 100}%`,
                            top: `${Math.max(0, Math.min(1, b.y)) * 100}%`,
                            width: `${Math.max(0, Math.min(1, b.width)) * 100}%`,
                            height: `${Math.max(0, Math.min(1, b.height)) * 100}%`,
                            background: 'rgba(255, 226, 76, 0.35)',
                            outline: '2px solid rgba(175, 140, 0, 0.8)',
                            borderRadius: '2px',
                          }}
                        />
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <OGDialog open={isOpen} onOpenChange={onOpenChange}>
      <OGDialogContent
        showCloseButton={false}
        className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg bg-surface-primary"
        overlayClassName="bg-black/50 z-50"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-medium p-4">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-text-secondary" />
              <h2 className="text-lg font-semibold text-text-primary">
                {source.fileName ||
                  source.attribution ||
                  source.title ||
                  localize('com_citation_source')}
              </h2>
            </div>
          </div>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-surface-hover"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border-medium p-4">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {localize('com_ui_close')}
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
