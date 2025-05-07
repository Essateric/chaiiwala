import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { useAuth } from "@/hooks/UseAuth";
import { useStores } from "@/hooks/use-stores";
import { useCategories } from "@/hooks/use-categories";
import { useJobLogs } from "@/hooks/use-joblogs";

export default function MaintenanceWizard({ onClose }) {
  const { user, profile } = useAuth();
  const { stores = [] } = useStores();
  const { categories = [] } = useCategories();
  const { createJobLog } = useJobLogs();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    flag: "normal",
    storeId: profile?.store_id || 1,
    comments: "",
  });
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await createJobLog({
        ...formData,
        ImageUpload: images,
        loggedBy: profile?.name || "",
        user_id: user?.id,
        logDate: new Date().toISOString().split("T")[0],
        logTime: new Date().toTimeString().split(" ")[0],
      });
      onClose();
    } catch (err) {
      console.error("Error submitting log:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Label>Store</Label>
            <select
              className="w-full border p-2 rounded bg-white"
              value={formData.storeId}
              onChange={(e) => handleChange("storeId", parseInt(e.target.value))}
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>

            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="bg-white"
            />
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={formData.description}
              className="bg-white"
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Label>Category</Label>
            <select
              className="w-full border p-2 rounded bg-white"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            <Label>Priority</Label>
            <select
              className="w-full border p-2 rounded bg-white"
              value={formData.flag}
              onChange={(e) => handleChange("flag", e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="long_standing">Long Standing</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <Label>Comments (optional)</Label>
            <Textarea
              rows={2}
              value={formData.comments}
              onChange={(e) => handleChange("comments", e.target.value)}
              className="bg-white"
            />
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <Label>Upload Images (optional)</Label>
            <FileUpload
              onUploadComplete={(url) => setImages((prev) => [...prev, url])}
            />
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Preview ${i}`}
                  className="w-full h-24 object-cover rounded border"
                />
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4 bg-white p-4 rounded-md">
            <h2 className="text-lg font-semibold">Review & Submit</h2>
            <p><strong>Title:</strong> {formData.title}</p>
            <p><strong>Description:</strong> {formData.description}</p>
            <p><strong>Category:</strong> {formData.category}</p>
            <p><strong>Priority:</strong> {formData.flag}</p>
            <p><strong>Store:</strong> {stores.find((s) => s.id === formData.storeId)?.name}</p>
            <p><strong>Comments:</strong> {formData.comments || "-"}</p>

            {images.length > 0 && (
              <div>
                <Label className="block mb-1">Image Preview</Label>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Uploaded ${index + 1}`}
                      className="w-full max-h-40 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {renderStep()}
      <div className="flex justify-between">
        {step > 1 && (
          <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        )}
        {step < 5 ? (
          <Button onClick={handleNext} disabled={isSubmitting}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
