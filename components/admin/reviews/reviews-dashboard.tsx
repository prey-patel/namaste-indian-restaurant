'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Star, Search, RefreshCw, Eye, MessageSquare, AlertTriangle, Calendar, ShoppingBag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PremiumCard from '@/components/ui/premium-card';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  order_id: string;
  orders: {
    id: string;
    token: string;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    order_type: 'delivery' | 'takeaway' | 'dine_in';
    status: string;
    total_amount: number;
  } | null;
};

type Props = {
  initialReviews: Review[];
};

export default function ReviewsDashboard({ initialReviews }: Props) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Real-time listener for reviews
  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-admin-reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Calculate metrics
  const totalCount = reviews.length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalCount).toFixed(1)
    : '0.0';

  const countsByStar = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  const alertReviewsCount = countsByStar[1] + countsByStar[2];

  // Filters logic
  const filteredReviews = reviews.filter((review) => {
    const customer = review.orders?.customer_name || '';
    const email = review.orders?.customer_email || '';
    const phone = review.orders?.customer_phone || '';
    const comment = review.comment || '';
    const refCode = review.orders?.token.substring(0, 8) || '';
    const matchesSearch = 
      customer.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search) ||
      comment.toLowerCase().includes(search.toLowerCase()) ||
      refCode.toLowerCase().includes(search.toLowerCase());

    const matchesRating = ratingFilter === 'all' || review.rating.toString() === ratingFilter;
    const matchesType = typeFilter === 'all' || review.orders?.order_type === typeFilter;

    return matchesSearch && matchesRating && matchesType;
  });

  const handleResetFilters = () => {
    setSearch('');
    setRatingFilter('all');
    setTypeFilter('all');
  };

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-serif font-black tracking-widest text-primary uppercase">
            Customer Reviews
          </h1>
          <p className="text-xs text-muted-foreground/80 mt-1">
            View rating scores, feedback, and customer comments linked directly to completed orders.
          </p>
        </div>
        <Button
          onClick={() => router.refresh()}
          className="border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider px-3.5 py-1.5 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Rating Summary Card */}
        <PremiumCard hoverable={false} className="p-6 bg-card border-border flex items-center gap-6">
          <div className="text-center space-y-1 shrink-0">
            <span className="text-5xl font-extrabold text-foreground font-mono">{avgRating}</span>
            <div className="flex justify-center text-primary mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 fill-current ${
                    s <= Math.round(Number(avgRating)) ? 'text-primary' : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold pt-1">
              {totalCount} Reviews
            </p>
          </div>
          
          <div className="flex-1 space-y-1.5 border-l border-border/40 pl-6 text-xs text-muted-foreground font-mono">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = countsByStar[stars as keyof typeof countsByStar] || 0;
              const percent = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span className="w-3 text-right">{stars}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[10px]">{count}</span>
                </div>
              );
            })}
          </div>
        </PremiumCard>

        {/* Actionable Alerts Card */}
        <PremiumCard 
          hoverable={false} 
          className={`p-6 border flex flex-col justify-between ${
            alertReviewsCount > 0 
              ? 'bg-red-500/5 border-red-500/20 text-red-400' 
              : 'bg-card border-border text-muted-foreground'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${alertReviewsCount > 0 ? 'bg-red-500/10' : 'bg-muted'}`}>
              <AlertTriangle className={`w-6 h-6 ${alertReviewsCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Critical Feedback Alerts</h3>
              <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                Reviews with 1 or 2 stars require immediate manager attention to maintain service levels.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-border/10 flex justify-between items-center text-xs">
            <span className="font-semibold uppercase tracking-wider">Unresolved Bad Reviews</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs font-mono ${
              alertReviewsCount > 0 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-muted text-muted-foreground'
            }`}>
              {alertReviewsCount}
            </span>
          </div>
        </PremiumCard>

        {/* Customer Satisfaction Card */}
        <PremiumCard hoverable={false} className="p-6 bg-card border-border flex flex-col justify-between text-muted-foreground">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              totalCount === 0 
                ? 'bg-muted text-muted-foreground' 
                : (reviews.filter(r => r.rating >= 4).length / totalCount) * 100 >= 80 
                ? 'bg-green-500/10 text-green-400' 
                : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              <MessageSquare className="w-6 h-6 fill-current" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-sm">Customer Satisfaction</h3>
              <p className="text-xs text-muted-foreground/85 leading-relaxed">
                Percentage of positive ratings (4 or 5 stars) out of all completed order reviews.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-border/10 flex justify-between items-center text-xs">
            <span className="font-semibold uppercase tracking-wider">Satisfaction Rate</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs font-mono ${
              totalCount === 0 
                ? 'bg-muted text-muted-foreground' 
                : (reviews.filter(r => r.rating >= 4).length / totalCount) * 100 >= 80 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {totalCount > 0 
                ? `${Math.round((reviews.filter(r => r.rating >= 4).length / totalCount) * 100)}%` 
                : 'N/A'}
            </span>
          </div>
        </PremiumCard>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col xl:flex-row gap-4 p-4 bg-muted/40 border border-border rounded-lg items-center">
        
        {/* Search */}
        <div className="relative w-full xl:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, comments, or short order code..."
            className="w-full bg-background border border-border rounded pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Rating Filter */}
        <div className="w-full xl:w-44 space-y-1">
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
            <option value="4">4 Stars ⭐⭐⭐⭐</option>
            <option value="3">3 Stars ⭐⭐⭐</option>
            <option value="2">2 Stars ⭐⭐</option>
            <option value="1">1 Star ⭐</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="w-full xl:w-44 space-y-1">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-background border border-border rounded px-2.5 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Order Types</option>
            <option value="delivery">Delivery Only</option>
            <option value="takeaway">Takeaway Only</option>
            <option value="dine_in">Dine-In Only</option>
          </select>
        </div>

        {/* Reset Actions */}
        <div className="flex gap-2 w-full xl:w-auto pt-2 xl:pt-0 justify-end xl:ml-auto">
          <Button
            onClick={handleResetFilters}
            className="border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider px-4 py-2"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-widest text-[9px] font-bold">
                <th className="p-4">Customer</th>
                <th className="p-4">Linked Order</th>
                <th className="p-4">Order Type</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Comment</th>
                <th className="p-4">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground/60 italic">
                    No reviews found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const refCode = review.orders?.token.substring(0, 8) || 'N/A';
                  
                  return (
                    <tr 
                      key={review.id} 
                      className={`transition-colors ${
                        review.rating <= 2
                          ? 'bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Customer Info */}
                      <td className="p-4 space-y-0.5">
                        <div className="font-semibold text-foreground text-sm">
                          {review.orders?.customer_name || 'Guest Customer'}
                        </div>
                        <div className="text-muted-foreground/60 text-[10px]">
                          {review.orders?.customer_email || review.orders?.customer_phone || ''}
                        </div>
                      </td>

                      {/* Linked Order */}
                      <td className="p-4 space-y-0.5 font-mono text-[10px]">
                        {review.orders ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">Ref: {refCode}</span>
                            <Link href={`/admin/orders/${review.orders.id}`} title="View full order details">
                              <Eye className="w-3.5 h-3.5 text-primary hover:opacity-80 cursor-pointer" />
                            </Link>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">Deleted Order</span>
                        )}
                        {review.orders?.total_amount && (
                          <span className="text-muted-foreground/60 block">{Number(review.orders.total_amount).toFixed(2)} PLN</span>
                        )}
                      </td>

                      {/* Order Type */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          review.orders?.order_type === 'delivery'
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                            : review.orders?.order_type === 'takeaway'
                            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                            : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                        }`}>
                          {review.orders?.order_type || 'Unknown'}
                        </span>
                      </td>

                      {/* Rating Stars */}
                      <td className="p-4">
                        <div className="flex text-primary">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 fill-current ${
                                s <= review.rating ? 'text-primary' : 'text-zinc-800'
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Comment */}
                      <td className="p-4 font-light text-muted-foreground leading-relaxed max-w-sm whitespace-pre-line">
                        {review.comment ? (
                          <span>&quot;{review.comment}&quot;</span>
                        ) : (
                          <span className="text-muted-foreground/30 italic text-[10px]">No comment provided</span>
                        )}
                      </td>

                      {/* Submitted At */}
                      <td className="p-4 space-y-0.5 text-muted-foreground/80 font-mono text-[10px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
