import React, {
  ChangeEvent,
  ComponentPropsWithoutRef,
  DragEvent,
  useRef,
  useState,
} from "react";

import { DeferredPromise } from "@infrastructure/promises";
import { randomId } from "@infrastructure/utils/randomId";

import { passthroughRef } from "../../helpers/passthroughRef";

interface Upload {
  id: string;
  file: File;
  promise: DeferredPromise<void>;
  uploaded?: boolean;
}

interface FileUploadProps extends ComponentPropsWithoutRef<"div"> {
  onFileSelect: (file: File) => void;
  accept?: string;
  multiple?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept,
  multiple,
  ...props
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: `2px dashed ${isDragging ? "#3b82f6" : "#e2e8f0"}`,
        borderRadius: "0.5rem",
        padding: "2rem",
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: isDragging ? "rgba(59, 130, 246, 0.1)" : "transparent",
        transition: "all 0.2s ease",
        ...props.style,
      }}
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {isDragging ? "Drop files here" : "Click or drag files here to upload"}
    </div>
  );
}

export default FileUpload;

export function useFileUpload(
  onUpload: (
    file: File,
    onProgress: (progress: number) => void,
  ) => Promise<void>,
) {
  const [uploads, setUploads] = useState<Upload[]>([]);

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    for (const file of files) {
      const upload: Upload = {
        id: randomId(),
        file,
        promise: new DeferredPromise(),
      };
      setUploads((uploads) => [...uploads, upload]);
      try {
        await onUpload(file, (_progress) => {
          // Update progress
        });
        upload.uploaded = true;
        upload.promise.resolve();
      } catch (error) {
        upload.promise.reject(error);
      }
    }
  };

  return {
    uploads,
    handleDrop,
  };
}

export function UploadPreview({ file, uploaded }: Upload) {
  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [file]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.5rem",
        borderRadius: "0.25rem",
        backgroundColor: "#f8fafc",
      }}
    >
      {preview && (
        <img
          src={preview}
          alt={file.name}
          style={{
            width: "2rem",
            height: "2rem",
            objectFit: "cover",
            borderRadius: "0.25rem",
          }}
        />
      )}
      <div style={{ flex: 1 }}>{file.name}</div>
      <div>{uploaded ? "✅" : "❌"}</div>
    </div>
  );
}

export const FileUploadDropZone = passthroughRef(
  (
    props: ComponentPropsWithoutRef<"div"> & {
      selected?: boolean;
    },
  ) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragExit = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      setIsDragging(false);
      props.onDrop?.(e);
    };

    return (
      <div
        {...props}
        onDragEnter={handleDragEnter}
        onDragExit={handleDragExit}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          border: isDragging
            ? "3px dashed var(--blue)"
            : "3px solid transparent",
          ...props.style,
        }}
      />
    );
  },
);

export async function uploadFile(
  file: File,
  url: string,
  onProgress: (progress: number) => void,
) {
  const xhr = new XMLHttpRequest();
  xhr.open("PUT", url, true);

  // Update progress
  xhr.upload.addEventListener("progress", (event) => {
    if (!event.lengthComputable) return;
    const progress = Math.round((event.loaded / event.total) * 100);
    onProgress(progress);
  });

  const deferred = new DeferredPromise<void>();

  // Handle errors
  xhr.onerror = (error) => {
    deferred.reject(error);
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        deferred.resolve();
      } else {
        const error = new Error(`UploadError: ${xhr.status} ${xhr.statusText}`);
        deferred.reject(error);
      }
    }
  };

  xhr.send(file);

  return deferred.promise;
}

const MB = 1024 * 1024;

export async function _renderPreview(file: File) {
  const deferred = new DeferredPromise<string | undefined>();

  if (file.type.startsWith("image/") && file.size <= 10 * MB) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      deferred.resolve(preview);
    };
    reader.readAsDataURL(file);
  } else {
    deferred.resolve(undefined);
  }

  return deferred.promise;
}

export function FileUploadArea(
  props: ComponentPropsWithoutRef<"div"> & {
    onFileSelect: (files: FileList) => void;
    accept?: string;
    multiple?: boolean;
  },
): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      props.onFileSelect(files);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        border: "2px dashed var(--border-color)",
        borderRadius: "0.5rem",
        padding: "2rem",
        textAlign: "center",
        cursor: "pointer",
        ...props.style,
      }}
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={props.accept}
        multiple={props.multiple}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      Click to select files
    </div>
  );
}
