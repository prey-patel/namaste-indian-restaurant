'use client';

import React, { useState } from 'react';
import { Star, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { submitOrderReviewAction } from '@/app/[locale]/(public)/order/actions';
import { Button } from '@/components/ui/button';

type Props = {
  orderId: string;
  orderToken: string;
  locale: string;
  existingReview?: {
    rating: number;
    comment: string | null;
  } | null;
};

export default function OrderReviewForm({ orderId, orderToken, locale, existingReview }: Props) {
  const isPl = locale === 'pl';

  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');
  const [submitted, setSubmitted] = useState<boolean>(!!existingReview);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError(isPl ? 'Proszę wybrać ocenę (gwiazdki).' : 'Please select a rating (stars).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await submitOrderReviewAction(
        {
          orderId,
          orderToken,
          rating,
          comment: comment.trim(),
        },
        isPl ? 'pl' : 'en'
      );

      if (res.success) {
        setSubmitted(true);
      } else {
        setError(res.error || (isPl ? 'Wystąpił nieoczekiwany błąd.' : 'An unexpected error occurred.'));
      }
    } catch (err) {
      setError(isPl ? 'Nie udało się połączyć z serwerem.' : 'Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  // If already submitted or showing existing review
  if (submitted) {
    return (
      <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-xl flex flex-col items-center text-center space-y-4 animate-fade-in">
        <CheckCircle className="w-12 h-12 text-green-400 animate-bounce" />
        <div>
          <h4 className="text-lg font-serif font-bold text-foreground">
            {isPl ? 'Opinia została przesłana!' : 'Review Submitted!'}
          </h4>
          <p className="text-xs text-muted-foreground/80 mt-1">
            {isPl 
              ? 'Dziękujemy za podzielenie się swoją opinią o zamówieniu.' 
              : 'Thank you for sharing your experience with this order.'}
          </p>
        </div>
        <div className="flex items-center space-x-1.5 pt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-6 h-6 fill-current ${
                star <= rating ? 'text-primary' : 'text-zinc-700'
              }`}
            />
          ))}
        </div>
        {comment && (
          <div className="mt-3 p-3 bg-black/40 border border-primary/10 rounded-lg text-xs text-muted-foreground italic max-w-md w-full">
            &quot;{comment}&quot;
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-[#050B1E]/60 border border-primary/20 rounded-xl space-y-6 text-left animate-fade-in">
      <div className="space-y-1.5 border-b border-primary/10 pb-4">
        <h3 className="text-lg font-serif font-bold text-primary flex items-center gap-2">
          <Star className="w-5 h-5 text-primary fill-current animate-pulse" />
          {isPl ? 'Oceń swoje jedzenie' : 'Rate your food'}
        </h3>
        <p className="text-xs text-muted-foreground/75 leading-relaxed font-light">
          {isPl 
            ? 'Twoje zdanie jest dla nas bardzo ważne. Pomóż nam dbać o najwyższą jakość potraw!' 
            : 'Your feedback is very important to us. Help us maintain the highest quality of our dishes!'}
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Stars Selector */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          {isPl ? 'Twoja ocena' : 'Your Rating'} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center space-x-2.5 py-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform active:scale-95 group"
            >
              <Star
                className={`w-8 h-8 transition-colors duration-200 ${
                  star <= (hoverRating || rating)
                    ? 'text-primary fill-current scale-105'
                    : 'text-zinc-700'
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-xs font-mono font-bold text-primary ml-2 uppercase tracking-widest">
              {rating === 5 
                ? (isPl ? 'Doskonałe!' : 'Excellent!') 
                : rating === 4 
                ? (isPl ? 'Bardzo dobre' : 'Very Good') 
                : rating === 3 
                ? (isPl ? 'Przeciętne' : 'Average') 
                : rating === 2 
                ? (isPl ? 'Słabe' : 'Poor') 
                : (isPl ? 'Bardzo słabe' : 'Terrible')}
            </span>
          )}
        </div>
      </div>

      {/* Review Comments Box */}
      <div className="space-y-2">
        <label htmlFor="review-comment" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          {isPl ? 'Opinia (opcjonalnie)' : 'Comment (optional)'}
        </label>
        <textarea
          id="review-comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            isPl 
              ? 'Napisz co Ci smakowało, a co możemy poprawić...' 
              : 'Write what you liked or how we can improve...'
          }
          className="w-full bg-black/40 border border-primary/20 focus:border-primary rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors leading-relaxed font-sans"
        />
        <div className="text-right text-[10px] text-muted-foreground/50">
          {comment.length} / 1000
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-primary to-amber-600 hover:from-primary/95 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider py-3 rounded-lg shadow-lg hover:shadow-primary/10 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-black" />
            {isPl ? 'Wysyłanie...' : 'Submitting...'}
          </>
        ) : (
          isPl ? 'Wyślij opinię' : 'Submit Review'
        )}
      </Button>
    </form>
  );
}
