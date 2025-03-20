// src/client/components/media/MediaUpload.tsx
import React, { useCallback, useState } from "react";

interface MediaUploadProps {
  onUpload: (file: File) => Promise<void>;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  className?: string;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onUpload,
  acceptedTypes = ["image/*", "audio/*", "video/*"],
  maxSize = 100 * 1024 * 1024, // 100MB default
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `File size exceeds ${maxSize / (1024 * 1024)}MB limit`;
      }

      if (
        !acceptedTypes.some((type) => {
          if (type.endsWith("/*")) {
            const baseType = type.slice(0, -2);
            return file.type.startsWith(baseType);
          }
          return file.type === type;
        })
      ) {
        return "File type not accepted";
      }

      return null;
    },
    [maxSize, acceptedTypes],
  );

  const createPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        setIsUploading(true);
        setProgress(0);
        await onUpload(file);
        setProgress(100);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      createPreview(file);
      await handleUpload(file);
    },
    [validateFile, handleUpload],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      createPreview(file);
      await handleUpload(file);
    },
    [validateFile, handleUpload],
  );

  const getMediaIcon = () => {
    if (!preview)
      return (
        <svg className="media-upload-icon" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
          />
        </svg>
      );

    const type = preview.split(";")[0].split("/")[0];
    switch (type) {
      case "image":
        return (
          <svg className="media-upload-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
            />
          </svg>
        );
      case "audio":
        return (
          <svg className="media-upload-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 3v18c-4.97 0-9-4.03-9-9s4.03-9 9-9zm0-2c-6.07 0-11 4.93-11 11s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1zm-1 14h2V7h-2v8z"
            />
          </svg>
        );
      case "video":
        return (
          <svg className="media-upload-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
            />
          </svg>
        );
      default:
        return (
          <svg className="media-upload-icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
            />
          </svg>
        );
    }
  };

  const styles = {
    upload: {
      border: "2px dashed #ccc",
      borderRadius: "8px",
      padding: "24px",
      textAlign: "center" as const,
      backgroundColor: "#fff",
      transition: "all 0.2s ease",
      position: "relative" as const,
      ...(isDragging && {
        borderColor: "#2196f3",
        backgroundColor: "rgba(33, 150, 243, 0.05)",
      }),
    },
    input: {
      display: "none",
    },
    content: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      gap: "16px",
    },
    icon: {
      width: "48px",
      height: "48px",
      color: "#666",
    },
    title: {
      margin: 0,
      fontSize: "1.25rem",
      fontWeight: 500,
      color: "#333",
    },
    text: {
      margin: 0,
      color: "#666",
    },
    button: {
      display: "inline-block",
      padding: "8px 16px",
      backgroundColor: "#2196f3",
      color: "white",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    buttonHover: {
      backgroundColor: "#1976d2",
    },
    hint: {
      margin: 0,
      fontSize: "0.875rem",
      color: "#666",
    },
    error: {
      margin: 0,
      color: "#d32f2f",
    },
    progress: {
      width: "100%",
      maxWidth: "200px",
    },
    progressBar: {
      width: "100%",
      height: "4px",
      backgroundColor: "#e0e0e0",
      borderRadius: "2px",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#2196f3",
      transition: "width 0.2s ease",
      width: `${progress}%`,
    },
    progressText: {
      margin: "4px 0 0",
      fontSize: "0.875rem",
      color: "#666",
    },
    preview: {
      marginTop: "16px",
      maxWidth: "100%",
      maxHeight: "200px",
      overflow: "hidden",
      borderRadius: "4px",
    },
    previewImage: {
      maxWidth: "100%",
      maxHeight: "200px",
      objectFit: "contain" as const,
    },
    previewVideo: {
      maxWidth: "100%",
      maxHeight: "200px",
    },
    previewAudio: {
      width: "100%",
      maxWidth: "300px",
    },
  };

  return (
    <div
      style={styles.upload}
      className={className}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop as (e: React.DragEvent) => void}
    >
      <input
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={
          handleFileSelect as (e: React.ChangeEvent<HTMLInputElement>) => void
        }
        style={styles.input}
        id="media-upload-input"
      />

      <div style={styles.content}>
        {getMediaIcon()}

        <h3 style={styles.title}>
          {isUploading ? "Uploading..." : "Drag & drop media here"}
        </h3>

        <p style={styles.text}>or</p>

        <label
          htmlFor="media-upload-input"
          style={styles.button}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#1976d2")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#2196f3")
          }
        >
          Select File
        </label>

        <p style={styles.hint}>Supported formats: {acceptedTypes.join(", ")}</p>

        {error && <p style={styles.error}>{error}</p>}

        {isUploading && (
          <div style={styles.progress}>
            <div style={styles.progressBar}>
              <div style={styles.progressFill} />
            </div>
            <p style={styles.progressText}>{progress}%</p>
          </div>
        )}
      </div>

      {preview && !isUploading && (
        <div style={styles.preview}>
          {preview.startsWith("data:image/") ? (
            <img src={preview} alt="Preview" style={styles.previewImage} />
          ) : preview.startsWith("data:video/") ? (
            <video src={preview} controls style={styles.previewVideo} />
          ) : preview.startsWith("data:audio/") ? (
            <audio src={preview} controls style={styles.previewAudio} />
          ) : null}
        </div>
      )}
    </div>
  );
};
