import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Star,
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Smile,
  Heart,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackData {
  rating: number;
  message: string;
  category: string;
}

interface FeedbackSectionProps {
  userId?: string;
  userEmail?: string;
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ userId, userEmail }) => {
  const { toast } = useToast();
  
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    message: "",
    category: "general"
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const ratingOptions = [
    { value: 1, icon: ThumbsDown, label: "Very Poor", color: "text-red-500" },
    { value: 2, icon: Meh, label: "Poor", color: "text-orange-500" },
    { value: 3, icon: Meh, label: "Neutral", color: "text-yellow-500" },
    { value: 4, icon: ThumbsUp, label: "Good", color: "text-blue-500" },
    { value: 5, icon: Heart, label: "Excellent", color: "text-green-500" }
  ];

  const categories = [
    { value: "general", label: "General Feedback" },
    { value: "bug", label: "Bug Report" },
    { value: "feature", label: "Feature Request" },
    { value: "ui", label: "UI/UX" },
    { value: "performance", label: "Performance" }
  ];

  const handleRatingClick = (rating: number) => {
    setFeedback(prev => ({ ...prev, rating }));
  };

  const handleMessageChange = (message: string) => {
    setFeedback(prev => ({ ...prev, message }));
  };

  const handleCategoryChange = (category: string) => {
    setFeedback(prev => ({ ...prev, category }));
  };

  const handleSubmit = async () => {
    if (feedback.rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        ...feedback,
        userId: userId || null,
        userEmail: userEmail || null,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Send feedback to backend
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      const result = await response.json();

      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully. We appreciate your input!",
      });

      setIsSubmitted(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setFeedback({
          rating: 0,
          message: "",
          category: "general"
        });
        setIsSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Submission Failed",
        description: "Unable to submit feedback. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Feedback Submitted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Thank you for your feedback! We appreciate your input and will use it to improve our service.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Feedback
        </CardTitle>
        <CardDescription>
          Help us improve by sharing your experience and suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium">How would you rate your experience?</label>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {ratingOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = feedback.rating === option.value;
              const isRated = feedback.rating >= option.value;
              
              return (
                <div key={option.value} className="text-center">
                  <button
                    type="button"
                    onClick={() => handleRatingClick(option.value)}
                    className={`p-2 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground scale-110 shadow-lg' 
                        : isRated
                        ? 'bg-muted hover:bg-muted/80'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    title={option.label}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? '' : option.color}`} />
                  </button>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {option.label}
                  </p>
                </div>
              );
            })}
          </div>
          {feedback.rating > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              You rated: {ratingOptions.find(r => r.value === feedback.rating)?.label}
            </p>
          )}
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Feedback Type</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => handleCategoryChange(category.value)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  feedback.category === category.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label htmlFor="feedback-message" className="text-sm font-medium">
            Your Feedback {feedback.rating > 0 && <span className="text-muted-foreground">(Optional)</span>}
          </label>
          <Textarea
            id="feedback-message"
            value={feedback.message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder={
              feedback.rating <= 2 
                ? "We're sorry to hear that. What went wrong? How can we improve?"
                : feedback.rating === 3
                ? "What could we do to make your experience better?"
                : "What did you like? What could make it even better?"
            }
            rows={4}
            maxLength={500}
          />
          <div className="flex justify-between">
            <p className="text-xs text-muted-foreground">
              {feedback.message.length}/500 characters
            </p>
            {feedback.rating <= 2 && (
              <p className="text-xs text-orange-600">
                Your detailed feedback helps us fix issues faster
              </p>
            )}
          </div>
        </div>

        {/* Privacy Notice */}
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            {userId ? "Your feedback will be submitted with your account information." : "Your feedback will be submitted anonymously."}
            We read all feedback and use it to improve our service.
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || feedback.rating === 0}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeedbackSection;
