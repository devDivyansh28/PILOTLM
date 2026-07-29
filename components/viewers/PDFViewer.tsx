"use client";

import React from "react";
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  src: string;
  title: string;
  onClose: () => void;
  citation?: {
    page?: number;
    bbox?: [number, number, number, number];
  };
}

export function PDFViewer({ src, title, onClose, citation }: PDFViewerProps) {
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [pageNumber, setPageNumber] = React.useState(citation?.page || 1);
  const [scale, setScale] = React.useState(1.5);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [pageDimensions, setPageDimensions] = React.useState({ width: 0, height: 0 });

  const onDocumentLoadSuccess = ({ numPages: np }: { numPages: number }) => {
    setNumPages(np);
    if (citation?.page && citation.page <= np) {
      setPageNumber(citation.page);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setPageNumber(page);
    }
  };

  const goToPage = (page: number) => handlePageChange(page);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-background ${fullscreen ? "" : ""}`}>
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h2 className="text-lg font-semibold truncate max-w-[300px]">{title}</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded px-2 py-1">
            <Button variant="ghost" size="icon" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">
              {pageNumber} / {numPages || "?"}
            </span>
            <Button variant="ghost" size="icon" onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= (numPages || 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
            <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums w-8 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.min(3, s + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
          >
            <Download className="h-3 w-3" /> Download
          </a>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" style={{ background: "#666" }}>
        <div className="relative bg-white shadow-lg" style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
          <Document
            file={src}
            onLoadSuccess={onDocumentLoadSuccess}
            options={{ enableXfa: true }}
          >
            <Page
              pageNumber={pageNumber}
              width={pageNumber ? undefined : 800}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onRenderSuccess={(page) => {
                const vp = page.getViewport({ scale: 1 });
                setPageDimensions({ width: vp.width, height: vp.height });
              }}
            />
          </Document>

          {citation?.bbox && pageNumber === citation.page && pageDimensions.width > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={pageDimensions.width}
              height={pageDimensions.height}
              viewBox={`0 0 ${pageDimensions.width} ${pageDimensions.height}`}
            >
              <rect
                x={citation.bbox[0]}
                y={citation.bbox[1]}
                width={citation.bbox[2] - citation.bbox[0]}
                height={citation.bbox[3] - citation.bbox[1]}
                fill="rgba(255, 200, 0, 0.25)"
                stroke="rgba(255, 200, 0, 0.8)"
                strokeWidth={2}
                rx={2}
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
