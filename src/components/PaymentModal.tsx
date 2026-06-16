import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, CheckCircle, ShieldAlert, Sparkles, Loader2, QrCode } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      setError('Please Enter a valid UPI ID (e.g., name@okaxis)');
      return;
    }
    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s+/g, '').length < 16) {
        setError('Card number must be 16 digits');
        return;
      }
      if (!expiry || !cvv) {
        setError('Please fill in card expiry and CVV');
        return;
      }
    }

    setIsProcessing(true);
    
    // Simulate real gateway latency
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      // Success sound or feedback representation
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
        // Reset state
        setIsSuccess(false);
        setUpiId('');
        setCardNumber('');
        setExpiry('');
        setCvv('');
        setCardName('');
      }, 2500);
    }, 2800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isProcessing && onClose()}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl"
          id="payment-modal"
        >
          {/* Header Graphic */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-8 text-center text-white relative">
            <div className="absolute top-3 right-3">
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/25 rounded-full p-1.5 transition-colors duration-200"
              >
                ✕
              </button>
            </div>
            
            <motion.div 
              animate={isSuccess ? { scale: [1, 1.2, 1] } : {}}
              className="mx-auto w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mb-3 border border-white/20"
            >
              <Sparkles className="h-7 w-7 text-yellow-300 animate-pulse" />
            </motion.div>
            
            <h3 className="text-2xl font-bold font-sans">Go Unlimited</h3>
            <p className="text-white/85 text-sm mt-1 max-w-xs mx-auto">
              Unlock the limit. Create as many live price widgets as you want!
            </p>
            
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-neutral-900 font-extrabold px-5 py-1.5 rounded-full text-base shadow-lg border border-yellow-300 transition duration-300 transform hover:scale-105">
              ₹25 One-Time Only
            </div>
          </div>

          <div className="p-6 pt-10">
            {!isSuccess ? (
              <form onSubmit={handlePay} className="space-y-4">
                {/* Payment Methods Tab */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    disabled={isProcessing}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      paymentMethod === 'upi'
                        ? 'bg-neutral-800 text-white shadow'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    UPI / Google Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    disabled={isProcessing}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      paymentMethod === 'card'
                        ? 'bg-neutral-800 text-white shadow'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Credit/Debit Card
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-950/40 border border-red-900/60 text-red-300 p-3 rounded-xl text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Dynamic Payment Body */}
                <div className="min-h-[140px] flex flex-col justify-center">
                  {paymentMethod === 'upi' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">
                          Enter UPI ID
                        </label>
                        <input
                          type="text"
                          required
                          disabled={isProcessing}
                          placeholder="e.g., mobile-no@paytm or upiid@upi"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-300"
                        />
                      </div>
                      
                      {/* Popular presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['@okaxis', '@okicici', '@paytm', '@ybl'].map((suffix) => (
                          <button
                            type="button"
                            key={suffix}
                            disabled={isProcessing}
                            onClick={() => {
                              const base = upiId.split('@')[0] || 'yourname';
                              setUpiId(`${base}${suffix}`);
                            }}
                            className="bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 text-xs px-2.5 py-1 rounded-lg transition"
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          required
                          disabled={isProcessing}
                          placeholder="John Doe"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">
                          Card Number
                        </label>
                        <input
                          type="text"
                          required
                          disabled={isProcessing}
                          placeholder="4111 2222 3333 4444"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => {
                            // Format space separated
                            const value = e.target.value.replace(/\D/g, '');
                            const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                            setCardNumber(formatted);
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono tracking-wider transition"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">
                            Expiry (MM/YY)
                          </label>
                          <input
                            type="text"
                            required
                            disabled={isProcessing}
                            placeholder="12/28"
                            maxLength={5}
                            value={expiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 2) {
                                val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                              }
                              setExpiry(val);
                            }}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1 uppercase tracking-wider">
                            CVV
                          </label>
                          <input
                            type="password"
                            required
                            disabled={isProcessing}
                            placeholder="***"
                            maxLength={3}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lock Note */}
                <p className="text-neutral-500 text-[11px] leading-relaxed text-center py-1">
                  🔒 Secured 256-bit SSL encrypted transmission. Funds are transferred directly to authorized developer account. Unlocks widgets globally instantly.
                </p>

                {/* Submit Action Block */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full mt-2 relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform focus:outline-none transform active:scale-95 duration-200 disabled:opacity-80 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      Securing Transaction...
                    </>
                  ) : (
                    <>Pay ₹25.00 & Unlock Unlimited Widgets</>
                  )}
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center text-white"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 animate-bounce" />
                </div>
                <h4 className="text-xl font-bold text-emerald-400">Payment Successful!</h4>
                <p className="text-sm text-neutral-400 mt-2 max-w-xs">
                  We've successfully verified your payment of ₹25! You are now upgraded to <b>Premium Unlimited Widgets</b>.
                </p>
                <div className="mt-4 text-xs font-mono bg-neutral-950 text-neutral-500 px-3 py-1.5 rounded border border-neutral-900">
                  TXN: REF-2026-STUDIO-{Math.floor(100000 + Math.random() * 900000)}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
