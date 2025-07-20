// src/pages/CustomerFeedbackPage.jsx
import { useState, useEffect } from 'react';
import { Camera, Star, Send, MapPin, Clock, User } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client OUTSIDE the component to avoid GoTrueClient warning
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Helper to upload all images and return their public URLs
async function uploadImagesToSupabase(files) {
  const uploadedUrls = [];
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `feedback/${uniqueName}`;
    // Upload to the correct bucket!
    const { error } = await supabase
      .storage
      .from('customer-feedback-images')
      .upload(filePath, file);
    if (error) {
      alert('Failed to upload image: ' + error.message);
      continue;
    }
    // Get public URL from the correct bucket!
    const { data } = supabase
      .storage
      .from('customer-feedback-images')
      .getPublicUrl(filePath);
    if (data && data.publicUrl) {
      uploadedUrls.push(data.publicUrl);
    }
  }
  return uploadedUrls;
}

function CustomerFeedbackPage() {
  const [formData, setFormData] = useState({
    customerExperience: 0,
    offeredOtherItems: '',
    orderReadBack: '',
    staffChewingGum: '',
    displayPresentable: 0,
    friendlyGreeting: 0,
    customerAreaClean: 0,
    staffInUniform: '',
    shopVibe: 0,
    temperatureSuitable: '',
    foodDrinkQuality: 0,
    foodDrinkDescription: '',
    hotDrinkTemperature: '',
    cutleryProvided: '',
    staffWorkActivities: '',
    additionalComments: '',
    customerName: '',
    visitDate: '',
    location: ''
  });

  const [foodImages, setFoodImages] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [storeNames, setStoreNames] = useState([]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFoodImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeImage = (index) => {
    setFoodImages(prev => prev.filter((_, i) => i !== index));
  };

  const calculateOverallScore = () => {
    const ratings = [
      formData.customerExperience,
      formData.displayPresentable,
      formData.friendlyGreeting,
      formData.customerAreaClean,
      formData.shopVibe,
      formData.foodDrinkQuality
    ];
    const validRatings = ratings.filter(rating => rating > 0);
    if (validRatings.length === 0) return 0;
    const average = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
    return Math.round(average * 10) / 10;
  };

  // Submit handler: upload images -> save feedback in Supabase -> send to webhook
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Upload images and get public URLs
    let imageUrls = [];
    if (foodImages.length > 0) {
      imageUrls = await uploadImagesToSupabase(foodImages);
    }

    // 2. Prepare data in snake_case for Supabase and webhook
    const payload = {
      customer_experience: formData.customerExperience,
      offered_other_items: formData.offeredOtherItems,
      order_read_back: formData.orderReadBack,
      staff_chewing_gum: formData.staffChewingGum,
      display_presentable: formData.displayPresentable,
      friendly_greeting: formData.friendlyGreeting,
      customer_area_clean: formData.customerAreaClean,
      staff_in_uniform: formData.staffInUniform,
      shop_vibe: formData.shopVibe,
      temperature_suitable: formData.temperatureSuitable,
      food_drink_quality: formData.foodDrinkQuality,
      food_drink_description: formData.foodDrinkDescription,
      hot_drink_temperature: formData.hotDrinkTemperature,
      cutlery_provided: formData.cutleryProvided,
      staff_work_activities: formData.staffWorkActivities,
      additional_comments: formData.additionalComments,
      customer_name: formData.customerName,
      visit_date: formData.visitDate,
      location: formData.location,
      food_images: imageUrls // JSONB array of public URLs
    };

    // 3. Insert into Supabase feedback table
    const { error: supaError } = await supabase
      .from('customer_feedback')
      .insert([payload]);

    if (supaError) {
      alert('Error saving feedback: ' + supaError.message);
      return;
    }

    // 4. Send to webhook (Make)
    await fetch('/.netlify/functions/sendFeedbackEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setIsSubmitted(true);
  };

  // Load store names for dropdown
  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase
        .from('stores')
        .select('name')
        .order('name');
      if (!error && data) {
        setStoreNames(data.map(store => store.name));
      }
    }
    fetchStores();
  }, []);

  // StarRating component
  const StarRating = (props) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{props.label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => props.onChange(star)}
            className={`p-1 transition-colors ${
              star <= props.value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            }`}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
      </div>
    </div>
  );

  // YesNoQuestion component
  const YesNoQuestion = (props) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{props.label}</label>
      <div className="flex space-x-4">
        {['Yes', 'No'].map((option) => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name={props.label}
              value={option}
              checked={props.value === option}
              onChange={(e) => props.onChange(e.target.value)}
              className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">Your feedback has been submitted successfully. We appreciate you taking the time to help us improve our service.</p>
          <button
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                customerExperience: 0,
                offeredOtherItems: '',
                orderReadBack: '',
                staffChewingGum: '',
                displayPresentable: 0,
                friendlyGreeting: 0,
                customerAreaClean: 0,
                staffInUniform: '',
                shopVibe: 0,
                temperatureSuitable: '',
                foodDrinkQuality: 0,
                foodDrinkDescription: '',
                hotDrinkTemperature: '',
                cutleryProvided: '',
                staffWorkActivities: '',
                additionalComments: '',
                customerName: '',
                visitDate: '',
                location: ''
              });
              setFoodImages([]);
            }}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Submit Another Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Chaiiwala Customer Feedback</h1>
            <p className="text-gray-600">Help us improve your experience by sharing your feedback</p>
            <div className="mt-4 p-4 bg-orange-100 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Overall Score:</strong> {calculateOverallScore()}/5 ⭐
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-orange-500" />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Visit Date
                </label>
                <input
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => handleInputChange('visitDate', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select a location</option>
                  {storeNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Experience Ratings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Experience Ratings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StarRating
                value={formData.customerExperience}
                onChange={(rating) => handleInputChange('customerExperience', rating)}
                label="How was your overall customer experience?"
              />
              <StarRating
                value={formData.displayPresentable}
                onChange={(rating) => handleInputChange('displayPresentable', rating)}
                label="How was the display of cakes, pastries, and biscuits?"
              />
              <StarRating
                value={formData.friendlyGreeting}
                onChange={(rating) => handleInputChange('friendlyGreeting', rating)}
                label="Was the greeting friendly and staff smiling?"
              />
              <StarRating
                value={formData.customerAreaClean}
                onChange={(rating) => handleInputChange('customerAreaClean', rating)}
                label="How clean was the customer area?"
              />
              <StarRating
                value={formData.shopVibe}
                onChange={(rating) => handleInputChange('shopVibe', rating)}
                label="How was the overall vibe in the shop?"
              />
              <StarRating
                value={formData.foodDrinkQuality}
                onChange={(rating) => handleInputChange('foodDrinkQuality', rating)}
                label="How was your food/drink quality?"
              />
            </div>
          </div>

          {/* Yes/No Questions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Service Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <YesNoQuestion
                value={formData.offeredOtherItems}
                onChange={(value) => handleInputChange('offeredOtherItems', value)}
                label="Were you offered anything other than what you ordered?"
              />
              <YesNoQuestion
                value={formData.orderReadBack}
                onChange={(value) => handleInputChange('orderReadBack', value)}
                label="Was your order read back to you?"
              />
              <YesNoQuestion
                value={formData.staffChewingGum}
                onChange={(value) => handleInputChange('staffChewingGum', value)}
                label="Was the staff member chewing gum?"
              />
              <YesNoQuestion
                value={formData.staffInUniform}
                onChange={(value) => handleInputChange('staffInUniform', value)}
                label="Were staff in uniform with visible Chaiiwala badges/clothing?"
              />
              <YesNoQuestion
                value={formData.cutleryProvided}
                onChange={(value) => handleInputChange('cutleryProvided', value)}
                label="Were you provided cutlery when food was presented?"
              />
              <YesNoQuestion
                value={formData.staffWorkActivities}
                onChange={(value) => handleInputChange('staffWorkActivities', value)}
                label="Were staff engaging in work-related activities?"
              />
            </div>
          </div>

          {/* Temperature and Drink Quality */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Environment & Quality</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Was the temperature suitable in the customer area?</label>
                <select
                  value={formData.temperatureSuitable}
                  onChange={(e) => handleInputChange('temperatureSuitable', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select an option</option>
                  <option value="Perfect">Perfect</option>
                  <option value="Too Hot">Too Hot</option>
                  <option value="Too Cold">Too Cold</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hot drink temperature</label>
                <select
                  value={formData.hotDrinkTemperature}
                  onChange={(e) => handleInputChange('hotDrinkTemperature', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select an option</option>
                  <option value="Hot">Hot</option>
                  <option value="Lukewarm">Lukewarm</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>
            </div>
          </div>

          {/* Food/Drink Details and Photos */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <Camera className="w-5 h-5 mr-2 text-orange-500" />
              Food & Drink Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please describe what you ordered
                </label>
                <textarea
                  value={formData.foodDrinkDescription}
                  onChange={(e) => handleInputChange('foodDrinkDescription', e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Describe your food/drink order..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Click the below buttonn to take pictures / Upload photos of your food/drink
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />

                {foodImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {foodImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Food item ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Comments */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Comments</h2>
            <textarea
              value={formData.additionalComments}
              onChange={(e) => handleInputChange('additionalComments', e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Please share any additional feedback or comments..."
            />
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Submit Feedback</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerFeedbackPage;
