import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: string | File | null;
  fileName?: string;
}

export function PDFViewer({ file, fileName = "document.pdf" }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setLoading(false);
  };

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) =>
      Math.min(Math.max(1, prevPageNumber + offset), numPages)
    );
  };

  const changeScale = (delta: number) => {
    setScale((prevScale) => Math.min(Math.max(0.5, prevScale + delta), 2.0));
  };

  const handleDownload = () => {
    if (typeof file === "string") {
      // If file is a URL, create a download link
      const link = document.createElement("a");
      link.href = file;
      link.download = fileName;
      link.click();
    } else if (file instanceof File) {
      // If file is a File object, create a blob URL
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!file) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">No PDF to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pageNumber} of {numPages || "..."}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeScale(-0.1)}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeScale(0.1)}
                disabled={scale >= 2.0}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Download Button */}
            <Button variant="default" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Display */}
      <Card>
        <CardContent className="p-4 bg-gray-100 dark:bg-gray-900">
          <div className="flex justify-center">
            {loading && (
              <div className="py-16">
                <p className="text-muted-foreground">Loading PDF...</p>
              </div>
            )}
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="py-16">
                  <p className="text-muted-foreground">Loading document...</p>
                </div>
              }
              error={
                <div className="py-16 text-center">
                  <p className="text-red-600">Failed to load PDF</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please try again or contact support
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
              />
            </Document>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
