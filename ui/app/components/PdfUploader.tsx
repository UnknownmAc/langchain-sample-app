"use client";

import { useState, useRef } from "react";
import styles from "./PdfUploader.module.css";

interface UploadedDocument {
  id: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
  uploadedAt: Date;
}

interface PdfUploaderProps {
  onUploadComplete?: (doc: UploadedDocument) => void;
}

export default function PdfUploader({ onUploadComplete }: PdfUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus({ type: "error", message: "Please upload a PDF file" });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadStatus({
        type: "success",
        message: `✓ ${file.name} uploaded (${data.document.chunkCount} chunks)`,
      });

      const newDoc: UploadedDocument = {
        ...data.document,
        uploadedAt: new Date(data.document.uploadedAt),
      };

      setDocuments((prev) => [...prev, newDoc]);
      onUploadComplete?.(newDoc);
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: (error as Error).message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDelete = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        setUploadStatus({ type: "success", message: "Document deleted" });
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: `Failed to delete: ${(error as Error).message}`,
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>📚 Study Materials</h3>
        <span className={styles.badge}>{documents.length} docs</span>
      </div>

      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${
          isUploading ? styles.uploading : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf"
          className={styles.fileInput}
        />

        {isUploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinner}></div>
            <p>Processing PDF...</p>
          </div>
        ) : (
          <div className={styles.dropzoneContent}>
            <span className={styles.uploadIcon}>📄</span>
            <p>Drop PDF here or click to upload</p>
            <span className={styles.hint}>Max 10MB</span>
          </div>
        )}
      </div>

      {uploadStatus.type && (
        <div
          className={`${styles.status} ${
            uploadStatus.type === "error" ? styles.error : styles.success
          }`}
        >
          {uploadStatus.message}
        </div>
      )}

      {documents.length > 0 && (
        <div className={styles.documentList}>
          {documents.map((doc) => (
            <div key={doc.id} className={styles.documentItem}>
              <div className={styles.docInfo}>
                <span className={styles.docIcon}>📕</span>
                <div className={styles.docDetails}>
                  <span className={styles.docName}>{doc.filename}</span>
                  <span className={styles.docMeta}>
                    {doc.pageCount} pages • {doc.chunkCount} chunks
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className={styles.deleteBtn}
                title="Delete document"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

