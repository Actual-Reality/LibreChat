import React from 'react';
import { OGDialog, OGDialogContent, Button } from '@librechat/client';
import { X, FileText, ExternalLink } from 'lucide-react';
import { useLocalize } from '~/hooks';
import type { SourceData } from './SourceHovercard';

interface CitationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  source: SourceData & {
    fileName?: string;
    fileId?: string;
    metadata?: {
      storageType?: string;
    };
  };
}

export default function CitationDialog({ isOpen, onOpenChange, source }: CitationDialogProps) {
  const localize = useLocalize();

  const handleDownload = () => {
    // Trigger download if needed
    if (source.fileId) {
      // This will be handled by the parent component
      onOpenChange(false);
    }
  };

  return (
    <OGDialog open={isOpen} onOpenChange={onOpenChange}>
      <OGDialogContent
        showCloseButton={false}
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg bg-surface-primary"
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
