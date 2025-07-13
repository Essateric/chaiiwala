// src/pages/CustomerFeedbackPage.jsx
import React, { useState } from 'react';
import { Camera, Star, Send, MapPin, Clock, User } from 'lucide-react';

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic
    console.log('Form submitted:', formData);
    console.log('Images:', foodImages);
    setIsSubmitted(true);
  };

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
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Which Chaiiwala location?"
                />
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
                  Upload photos of your food/drink
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
