import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/vectorStore";

// In-memory document metadata store (shared with upload route in production, use DB)
// For now, we'll handle deletion through the vector store directly

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Delete from vector store
    await deleteDocument(documentId);

    return NextResponse.json({
      success: true,
      message: `Document ${documentId} deleted successfully`,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: `Failed to delete document: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// GET - List all documents (basic version using vector store search)
export async function GET() {
  try {
    // In a production app, you'd query a database for document metadata
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: "Use the upload endpoint GET to list documents",
      documents: [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list documents: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

