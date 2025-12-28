import React, { useRef, useState } from "react";

import { MediaUpload } from "../media/mediaUpload";

interface CreatePostProps {
  onSubmit: (post: { content: string; media?: File }) => Promise<void>;
  className?: string;
}

export const CreatePost: React.FC<CreatePostProps> = ({
  onSubmit,
  className,
}) => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !media) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        content: content.trim(),
        media: media || undefined,
      });
      setContent("");
      setMedia(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleMediaUpload = async (file: File): Promise<void> => {
    setMedia(file);
    return Promise.resolve();
  };

  // Void-returning wrapper for handleSubmit
  const handleSubmitWrapper = (e: React.FormEvent) => {
    void handleSubmit(e);
  };

  const styles = {
    container: {
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      padding: "16px",
    },
    form: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "16px",
    },
    textarea: {
      width: "100%",
      minHeight: "100px",
      padding: "12px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "16px",
      lineHeight: "1.5",
      resize: "none" as const,
      fontFamily: "inherit",
      "&:focus": {
        outline: "none",
        borderColor: "#2196f3",
      },
    },
    mediaPreview: {
      marginTop: "16px",
      maxWidth: "100%",
      maxHeight: "300px",
      borderRadius: "4px",
      overflow: "hidden",
    },
    mediaImage: {
      maxWidth: "100%",
      maxHeight: "300px",
      objectFit: "contain" as const,
    },
    actions: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    submitButton: {
      padding: "8px 24px",
      backgroundColor: "#2196f3",
      color: "#fff",
      border: "none",
      borderRadius: "20px",
      fontSize: "16px",
      fontWeight: 500,
      cursor: "pointer",
      transition: "background-color 0.2s",
      "&:hover": {
        backgroundColor: "#1976d2",
      },
      "&:disabled": {
        backgroundColor: "#ccc",
        cursor: "not-allowed",
      },
    },
    error: {
      color: "#d32f2f",
      fontSize: "14px",
      marginTop: "8px",
    },
  };

  return (
    <div style={styles.container} className={className}>
      <form onSubmit={handleSubmitWrapper} style={styles.form}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder="What's on your mind?"
          style={styles.textarea}
        />

        {media && (
          <div style={styles.mediaPreview}>
            {media.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(media)}
                alt="Preview"
                style={styles.mediaImage}
              />
            ) : (
              <MediaUpload
                onUpload={handleMediaUpload}
                acceptedTypes={[media.type]}
                maxSize={media.size}
              />
            )}
          </div>
        )}

        <div style={styles.actions}>
          <MediaUpload
            onUpload={handleMediaUpload}
            acceptedTypes={["image/*", "video/*", "audio/*"]}
            maxSize={100 * 1024 * 1024} // 100MB
          />
          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(isSubmitting && { opacity: 0.7 }),
            }}
            disabled={isSubmitting || (!content.trim() && !media)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#1976d2")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#2196f3")
            }
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
      </form>
    </div>
  );
};
