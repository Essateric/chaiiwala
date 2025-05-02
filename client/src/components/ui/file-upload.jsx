import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

export function FileUpload({
  onUploadComplete,
  placeholder = "Select an image to upload",
  buttonText = "Upload Image",
  currentImage,
  inputId = "file-upload",
  onRemoveImage,
}) {
  const supabase = useSupabaseClient();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(currentImage || null);
  const [progress, setProgress] = useState(0);

  const handleUpload = useCallback(async (event) => {
    if (!event.target.files?.length) return;

    const file = event.target.files[0];
    setError(null);
    setIsUploading(true);
    setProgress(0);

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, JPEG, PNG, and WEBP images are allowed.");
      setIsUploading(false);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("File size should be less than 5MB.");
      setIsUploading(false);
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      const filePath = `joblogs/${Date.now()}_${file.name}`;

      const { data, error: uploadError } = await supabase.storage
        .from('maintenance-images') // your real bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Upload failed");
      }

      const { data: publicUrlData } = supabase.storage
        .from('maintenance-images')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to upload image");
      setPreview(currentImage || null);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }, [onUploadComplete, currentImage, supabase]);

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
          id={inputId}
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          disabled={isUploading}
        />
        <label
           htmlFor={inputId}
          className="flex-1 cursor-pointer flex items-center gap-2 border border-dashed rounded-md p-4 hover:bg-gray-50 transition-colors"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-spin flex-shrink-0" />
          ) : (
            <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm text-gray-500 truncate">
            {isUploading ? `Uploading... ${progress}%` : placeholder}
          </span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(inputId)?.click()}
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
