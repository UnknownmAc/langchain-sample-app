import pdf from "pdf-parse";

export interface PDFDocument {
  id: string;
  filename: string;
  content: string;
  pageCount: number;
  uploadedAt: Date;
}

export interface PDFPage {
  pageNumber: number;
  content: string;
}

/**
 * Load and parse a PDF file from a Buffer
 * 
 * @param buffer - The PDF file buffer
 * @param filename - Original filename for metadata
 * @returns Parsed PDF document with content
 */
export async function loadPDF(
  buffer: Buffer,
  filename: string
): Promise<PDFDocument> {
  try {
    const data = await pdf(buffer);
    
    return {
      id: generateDocId(filename),
      filename,
      content: data.text,
      pageCount: data.numpages,
      uploadedAt: new Date(),
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${(error as Error).message}`);
  }
}

/**
 * Generate a unique document ID
 */
function generateDocId(filename: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const cleanName = filename.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
  return `doc_${cleanName}_${timestamp}_${randomStr}`;
}

/**
 * Extract text by pages from PDF
 * Note: pdf-parse returns all text combined, this is a simplified version
 */
export async function loadPDFWithPages(
  buffer: Buffer,
  filename: string
): Promise<{ document: PDFDocument; pages: PDFPage[] }> {
  const data = await pdf(buffer);
  
  // Split by form feed character or approximate by content length
  const pageTexts = data.text.split(/\f/);
  
  const pages: PDFPage[] = pageTexts.map((content, index) => ({
    pageNumber: index + 1,
    content: content.trim(),
  }));

  const document: PDFDocument = {
    id: generateDocId(filename),
    filename,
    content: data.text,
    pageCount: data.numpages,
    uploadedAt: new Date(),
  };

  return { document, pages };
}

