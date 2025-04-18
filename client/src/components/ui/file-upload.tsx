import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, X, Loader2 } from "lucide-react";

interface FileUploadProps {
  onUploadComplete: (imageUrl: string) => void;
  placeholder?: string;
  buttonText?: string;
  currentImage?: string;
  onRemoveImage?: () => void;
}

export function FileUpload({
  onUploadComplete,
  placeholder = "Select an image to upload",
  buttonText = "Upload Image",
  currentImage,
  onRemoveImage,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files?.length) return;
      
      const file = event.target.files[0];
      setError(null);
      setIsUploading(true);

      try {
        // Create a temporary preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        // Create form data for upload
        const formData = new FormData();
        formData.append("image", file);

        // Upload the file to the server
        const response = await fetch("/api/upload/joblog-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to upload image");
        }

        const data = await response.json();
        // Call the callback with the uploaded file URL
        onUploadComplete(data.fileUrl);
      } catch (err) {
        setError((err as Error).message || "Failed to upload image");
        // Reset preview if upload failed
        setPreview(currentImage || null);
      } finally {
        setIsUploading(false);
        // Reset the input value so the same file can be uploaded again if needed
        event.target.value = "";
      }
    },
    [onUploadComplete, currentImage]
  );

  const handleRemoveImage = useCallback(() => {
    setPreview(null);
    if (onRemoveImage) {
      onRemoveImage();
    }
  }, [onRemoveImage]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Input
          type="file"
          id="file-upload"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className="flex-1 cursor-pointer flex items-center gap-2 border border-dashed rounded-md p-4 hover:bg-gray-50 transition-colors"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-spin flex-shrink-0" />
          ) : (
            <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm text-gray-500 truncate">
            {isUploading ? "Uploading..." : placeholder}
          </span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("file-upload")?.click()}
          disabled={isUploading}
          className="whitespace-nowrap mt-1 sm:mt-0"
        >
          {buttonText}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {preview && (
        <div className="relative w-fit">
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-[150px] sm:max-h-[200px] rounded-md object-contain"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white hover:bg-black/80 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}