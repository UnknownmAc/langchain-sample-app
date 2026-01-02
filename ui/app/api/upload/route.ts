import { NextRequest, NextResponse } from "next/server";
import { loadPDF } from "@/lib/pdf/loader";
import { processDocumentForVectorStore } from "@/lib/pdf/splitter";
import { addDocuments } from "@/lib/vectorStore";

// Store document metadata in memory (in production, use a database)
const documentMetadata = new Map<
  string,
  { id: string; filename: string; pageCount: number; chunkCount: number; uploadedAt: Date }
>();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Load and parse PDF
    const pdfDoc = await loadPDF(buffer, file.name);

    // Split into chunks and prepare for vector store
    const documents = await processDocumentForVectorStore(
      pdfDoc.content,
      pdfDoc.id,
      pdfDoc.filename
    );

    // Add to vector store
    await addDocuments(documents);

    // Store metadata
    const metadata = {
      id: pdfDoc.id,
      filename: pdfDoc.filename,
      pageCount: pdfDoc.pageCount,
      chunkCount: documents.length,
      uploadedAt: pdfDoc.uploadedAt,
    };
    documentMetadata.set(pdfDoc.id, metadata);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded and processed "${file.name}"`,
      document: metadata,
    });
  } catch (error) {
    console.error("Upload error:", error);
    
    const errorMessage = (error as Error).message;
    
    // Check for Chroma connection error
    if (errorMessage.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { 
          error: "Cannot connect to vector database. Please ensure Chroma is running.",
          details: "Run: docker run -p 8000:8000 chromadb/chroma"
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Failed to process PDF: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all document metadata
export async function GET() {
  const documents = Array.from(documentMetadata.values());
  return NextResponse.json({
    success: true,
    count: documents.length,
    documents,
  });
}

