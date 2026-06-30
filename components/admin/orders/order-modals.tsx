'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 1. Confirm Order Modal (ETA Selection)
interface ConfirmOrderModalProps extends BaseModalProps {
  orderType: 'delivery' | 'takeaway' | 'dine_in';
  onSubmit: (etaMinutes: number) => void;
  title?: string;
  order?: any;
}

export function ConfirmOrderModal({ isOpen, onClose, orderType, onSubmit, title, order }: ConfirmOrderModalProps) {
  const isDelivery = orderType === 'delivery';
  const defaultOptions = React.useMemo(
    () => (isDelivery ? [30, 40, 50, 60, 75, 90] : [15, 20, 30, 40, 50, 60]),
    [isDelivery]
  );
  
  const [selectedMins, setSelectedMins] = useState<number>(defaultOptions[2]);
  const [customMins, setCustomMins] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      // Reset states when modal opens or order type changes
      setSelectedMins(defaultOptions[2]);
      setCustomMins('');
      setUseCustom(false);
    }
  }, [isOpen, orderType, defaultOptions]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMins = useCustom ? parseInt(customMins, 10) : selectedMins;
    if (isNaN(finalMins) || finalMins <= 0) return;
    onSubmit(finalMins);
  };

  const modalTitle = title || (orderType === 'dine_in' ? 'Confirm Dine-In Order' : isDelivery ? 'Confirm Delivery Order' : 'Confirm Takeaway Order');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-card border border-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-scale-in focus:outline-none text-left text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 id="confirm-modal-title" className="text-lg font-serif font-bold text-primary">
            {modalTitle}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isDelivery && order && (
            <div className="p-3.5 bg-muted/40 border border-border rounded-lg text-xs space-y-2.5">
              <div className="flex justify-between items-center text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest pb-1.5 border-b border-border">
                <span>Delivery Intelligence</span>
                <span className={`px-1.5 py-0.5 rounded border text-[8px] font-semibold ${
                  order.delivery_geocoding_status === 'success' 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : order.delivery_geocoding_status === 'partial'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {order.delivery_geocoding_status || 'not_attempted'}
                </span>
              </div>
              
              <div className="space-y-1">
                <p className="text-foreground leading-relaxed font-semibold">
                  {order.delivery_address}
                  {order.delivery_postal_code ? `, ${order.delivery_postal_code}` : ''}
                  {order.delivery_city ? ` ${order.delivery_city}` : ''}
                </p>
                <p className="text-[10px] text-muted-foreground flex gap-1 items-center">
                  Phone: {order.customer_phone}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div className="p-2 bg-background/50 border border-border/40 rounded">
                  <span className="text-muted-foreground/60 block uppercase text-[8px] tracking-wider font-semibold">Car Route</span>
                  {order.delivery_distance_car_meters !== null && order.delivery_distance_car_meters !== undefined ? (
                    <span className="font-bold text-foreground">
                      {(order.delivery_distance_car_meters / 1000).toFixed(2)} km ({Math.ceil(order.delivery_duration_car_seconds / 60)} min)
                    </span>
                  ) : (
                    <span className="text-red-400 italic font-medium">Distance unavailable</span>
                  )}
                </div>
                <div className="p-2 bg-background/50 border border-border/40 rounded">
                  <span className="text-muted-foreground/60 block uppercase text-[8px] tracking-wider font-semibold">Walking Route</span>
                  {order.delivery_distance_walk_meters !== null && order.delivery_distance_walk_meters !== undefined ? (
                    <span className="font-bold text-foreground">
                      {(order.delivery_distance_walk_meters / 1000).toFixed(2)} km ({Math.ceil(order.delivery_duration_walk_seconds / 60)} min)
                    </span>
                  ) : (
                    <span className="text-red-400 italic font-medium">Distance unavailable</span>
                  )}
                </div>
              </div>

              {order.delivery_distance_error && (
                <div className="text-[9px] text-red-400 bg-red-500/5 p-2 rounded border border-red-500/15 leading-normal flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                  <div>
                    <strong className="block font-bold">Warning:</strong>
                    Distance could not be calculated. Verify address manually.
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">Current Delivery Fee:</span>
                <span className="font-mono font-bold text-foreground">
                  {Number(order.delivery_fee).toFixed(2)} PLN
                </span>
              </div>
              {order.suggested_delivery_fee_amount !== null && order.suggested_delivery_fee_amount !== undefined && (
                <div className="flex justify-between items-center text-xs text-primary pt-0.5">
                  <span>Suggested Fee (Guidance):</span>
                  <span className="font-mono font-bold">
                    {(order.suggested_delivery_fee_amount / 100).toFixed(2)} PLN
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Select Estimated Time (Minutes)
            </label>

            {/* Quick selectors */}
            <div className="grid grid-cols-3 gap-2">
              {defaultOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setSelectedMins(opt);
                    setUseCustom(false);
                  }}
                  className={`py-2 text-xs font-semibold rounded border transition-all ${
                    !useCustom && selectedMins === opt
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-600 text-white shadow-md'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary'
                  }`}
                >
                  {opt} min
                </button>
              ))}
            </div>

            {/* Custom option toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`text-xs font-semibold px-3 py-1.5 rounded border transition-all ${
                  useCustom
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-600 text-white'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Custom duration
              </button>
            </div>

            {/* Custom Minutes Input */}
            {useCustom && (
              <div className="space-y-1">
                <input
                  type="number"
                  min="1"
                  max="360"
                  required
                  placeholder="Enter minutes (1-360)"
                  value={customMins}
                  onChange={(e) => setCustomMins(e.target.value)}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                  aria-label="Custom minutes duration"
                />
              </div>
            )}
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded text-[11px] leading-relaxed text-primary/80">
            Confirming this order sets its status to <strong className="text-foreground">Confirmed</strong> and commits to the estimated time target.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider rounded font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={useCustom && (!customMins || parseInt(customMins, 10) <= 0)}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Reject Order Modal
interface RejectOrderModalProps extends BaseModalProps {
  onSubmit: (reason: string) => void;
}

export function RejectOrderModal({ isOpen, onClose, onSubmit }: RejectOrderModalProps) {
  const [reason, setReason] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      setReason('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-card border border-red-500/30 [.admin-theme_&]:border-red-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-scale-in focus:outline-none text-left text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        <div className="flex justify-between items-center border-b border-red-500/10 pb-3">
          <h3 id="reject-modal-title" className="text-lg font-serif font-bold text-red-600 [.admin-theme_&]:text-red-800 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 [.admin-theme_&]:text-red-700 dark:text-red-400" />
            Reject Order Request
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="reject-reason" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Reason for rejection (Visible to customer)
            </label>
            <textarea
              id="reject-reason"
              required
              rows={3}
              placeholder="e.g. Unfortunately we are out of ingredients for major items in your order..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded text-[11px] leading-relaxed text-red-600 [.admin-theme_&]:text-red-800 dark:text-red-300/80">
            Warning: Rejecting this order is irreversible and will send a cancellation/rejection update to the customer tracking interface.
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider rounded font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason.trim()}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reject Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. Cancel Order Modal
interface CancelOrderModalProps extends BaseModalProps {
  onSubmit: (reason: string) => void;
}

export function CancelOrderModal({ isOpen, onClose, onSubmit }: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      setReason('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-card border border-red-500/30 [.admin-theme_&]:border-red-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-scale-in focus:outline-none text-left text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
      >
        <div className="flex justify-between items-center border-b border-red-500/10 pb-3">
          <h3 id="cancel-modal-title" className="text-lg font-serif font-bold text-red-600 [.admin-theme_&]:text-red-800 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 [.admin-theme_&]:text-red-700 dark:text-red-400" />
            Cancel Active Order
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="cancel-reason" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Reason for cancellation (Visible to customer)
            </label>
            <textarea
              id="cancel-reason"
              required
              rows={3}
              placeholder="e.g. Courier transport issue or customer requested cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider rounded font-bold transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={!reason.trim()}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. Update ETA Modal
interface UpdateEtaModalProps extends BaseModalProps {
  orderType: 'delivery' | 'takeaway' | 'dine_in';
  onSubmit: (etaMinutes: number) => void;
}

export function UpdateEtaModal({ isOpen, onClose, orderType, onSubmit }: UpdateEtaModalProps) {
  return (
    <ConfirmOrderModal 
      isOpen={isOpen} 
      onClose={onClose} 
      orderType={orderType} 
      onSubmit={onSubmit} 
      title="Update Estimated Time (ETA)"
    />
  );
}

// 5. Complete Order Modal (Payment received confirmation)
interface CompleteOrderModalProps extends BaseModalProps {
  onSubmit: (paymentReceived: boolean) => void;
}

export function CompleteOrderModal({ isOpen, onClose, onSubmit }: CompleteOrderModalProps) {
  const [paymentReceived, setPaymentReceived] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      setPaymentReceived(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(paymentReceived);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-card border border-green-500/30 [.admin-theme_&]:border-green-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-scale-in focus:outline-none text-left text-foreground"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-modal-title"
      >
        <div className="flex justify-between items-center border-b border-green-500/10 pb-3">
          <h3 id="complete-modal-title" className="text-lg font-serif font-bold text-green-600 [.admin-theme_&]:text-green-800 dark:text-green-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500 [.admin-theme_&]:text-green-700 dark:text-green-400" />
            Complete Order
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-muted-foreground/90 leading-relaxed font-light">
            You are marking this order request as completed. This moves the order into its final archive state.
          </p>

          <label className="flex items-center gap-3 p-3.5 bg-background border border-border rounded cursor-pointer hover:border-primary select-none transition-colors">
            <input
              type="checkbox"
              checked={paymentReceived}
              onChange={(e) => setPaymentReceived(e.target.checked)}
              className="h-4 w-4 border-border bg-background text-primary focus:ring-primary rounded cursor-pointer"
            />
            <span className="text-xs font-semibold text-foreground">
              Confirm payment was received (Marks payment status as paid)
            </span>
          </label>

          <p className="text-[10px] text-muted-foreground/50 leading-relaxed font-light">
            * If unchecked, the order payment status will remain pending.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border bg-transparent hover:bg-muted text-muted-foreground text-xs uppercase tracking-wider rounded font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition-all"
            >
              Complete Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
