import React, { useState } from "react";

import { PageContent } from "../../layouts/PageContent";

export function UploadPage() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const simulateUpload = () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            setSelectedFile(null);
            // Reset file input
            const fileInput = document.getElementById(
              "file-upload",
            ) as HTMLInputElement;
            if (fileInput) fileInput.value = "";
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 200);
  };

  return (
    <PageContent
      title="Upload Media"
      description="Share your videos, images, or audio files with your audience."
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "30px auto",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <h2>Upload New Media</h2>

        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              border: "2px dashed #ccc",
              borderRadius: "8px",
              padding: "40px 20px",
              textAlign: "center",
              backgroundColor: "#f9f9f9",
              cursor: "pointer",
            }}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input
              type="file"
              id="file-upload"
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept="image/*,video/*,audio/*"
            />
            <div style={{ fontSize: "48px", marginBottom: "10px" }}>📁</div>
            <p>Click to select or drag and drop your file here</p>
            <p style={{ fontSize: "14px", color: "#666" }}>
              Supports images, videos, and audio files
            </p>
          </div>
        </div>

        {selectedFile && (
          <div style={{ marginTop: "20px" }}>
            <h3>Selected File</h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px",
                border: "1px solid #eee",
                borderRadius: "4px",
              }}
            >
              <div style={{ fontSize: "24px" }}>
                {selectedFile.type.startsWith("image/")
                  ? "🖼️"
                  : selectedFile.type.startsWith("video/")
                    ? "🎬"
                    : selectedFile.type.startsWith("audio/")
                      ? "🎵"
                      : "📄"}
              </div>
              <div style={{ flexGrow: 1 }}>
                <div>{selectedFile.name}</div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                  {selectedFile.type}
                </div>
              </div>
            </div>
          </div>
        )}

        {isUploading && (
          <div style={{ marginTop: "20px" }}>
            <h3>Uploading...</h3>
            <div
              style={{
                height: "8px",
                backgroundColor: "#eee",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${uploadProgress}%`,
                  backgroundColor: "var(--blue)",
                  transition: "width 0.2s ease-in-out",
                }}
              />
            </div>
            <div style={{ textAlign: "center", marginTop: "5px" }}>
              {uploadProgress}%
            </div>
          </div>
        )}

        <div style={{ marginTop: "20px" }}>
          <button
            onClick={simulateUpload}
            disabled={!selectedFile || isUploading}
            style={{
              padding: "8px 16px",
              backgroundColor:
                !selectedFile || isUploading ? "#ccc" : "var(--blue)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: !selectedFile || isUploading ? "not-allowed" : "pointer",
            }}
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "30px auto" }}>
        <h2>Upload History</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "10px" }}>File</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Type</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Size</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Date</th>
              <th style={{ textAlign: "left", padding: "10px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px" }}>vacation.mp4</td>
              <td style={{ padding: "10px" }}>Video</td>
              <td style={{ padding: "10px" }}>24.5 MB</td>
              <td style={{ padding: "10px" }}>2023-03-15</td>
              <td style={{ padding: "10px" }}>
                <span style={{ color: "green" }}>Completed</span>
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px" }}>profile-pic.jpg</td>
              <td style={{ padding: "10px" }}>Image</td>
              <td style={{ padding: "10px" }}>1.2 MB</td>
              <td style={{ padding: "10px" }}>2023-03-10</td>
              <td style={{ padding: "10px" }}>
                <span style={{ color: "green" }}>Completed</span>
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px" }}>podcast-episode.mp3</td>
              <td style={{ padding: "10px" }}>Audio</td>
              <td style={{ padding: "10px" }}>18.7 MB</td>
              <td style={{ padding: "10px" }}>2023-03-05</td>
              <td style={{ padding: "10px" }}>
                <span style={{ color: "green" }}>Completed</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PageContent>
  );
}
