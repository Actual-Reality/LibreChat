import React, { useState, useEffect, useCallback } from 'react';
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
    metadata?: {
      storageType?: string;
      type?: string;
      mimeType?: string;
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
    if (isOpen && isPDF() && source.link) {
      setIsLoading(true);
      setError(null);
      
      // If the link is already a blob URL or data URL, use it directly
      if (source.link.startsWith('blob:') || source.link.startsWith('data:')) {
        setPdfUrl(source.link);
        setIsLoading(false);
      } else {
        // Otherwise, fetch the file
        fetch(source.link)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to fetch PDF');
            }
            return response.blob();
          })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setIsLoading(false);
          })
          .catch(err => {
            console.error('Error loading PDF:', err);
            setError('Failed to load PDF');
            setIsLoading(false);
          });
      }
    }

    // Cleanup blob URL when dialog closes
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, source.link, isPDF]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF document:', error);
    setError('Failed to load PDF document');
  };

  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(numPages || 1, prev + 1));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
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
                No content available
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
            <span className="text-sm text-text-secondary">
              {Math.round(scale * 100)}%
            </span>
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
              <p className="text-sm text-text-secondary">Loading PDF...</p>
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
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center py-12">
                    <p className="text-sm text-text-secondary">Loading document...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              </Document>
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
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-text-secondary" />
              <h2 className="text-lg font-semibold text-text-primary">
                {source.attribution || source.title || localize('com_citation_source')}
              </h2>
            </div>
            {source.fileName && (
              <p className="text-sm text-text-secondary">
                {source.fileName}
              </p>
            )}
            {source.metadata?.storageType && (
              <p className="text-xs text-text-tertiary">
                {source.metadata.storageType}
              </p>
            )}
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
