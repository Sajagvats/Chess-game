import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import { WalletTransaction } from '../types/chess';
import { auth, authFetch, signInWithGoogle } from '../lib/firebase';

interface WalletModalProps {
  playerId: string;
  balance: number;
  transactions: WalletTransaction[];
  onClose: () => void;
  onRecordTransaction: (tx: WalletTransaction, balanceDelta: number) => void;
  onSyncServerWallet?: (balance: number, transactions: WalletTransaction[]) => void;
}

type WalletTab = 'deposit' | 'withdraw' | 'ledger';
type PaymentMethod = 'UPI' | 'Card' | 'NetBanking';

const PRESET_AMOUNTS = [500, 1000, 2000, 3000];
const UPI_APPS = ['GPay', 'PhonePe', 'Paytm', 'BHIM'];
const BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Kotak Mahindra Bank',
];

const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9]{2,}$/;

function passesLuhn(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function isValidExpiry(exp: string): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(exp.trim());
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return year > currentYear || (year === currentYear && month >= currentMonth);
}

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  playerId,
  balance,
  transactions,
  onClose,
  onRecordTransaction,
  onSyncServerWallet,
}) => {
  const [tab, setTab] = useState<WalletTab>('deposit');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [amountInput, setAmountInput] = useState<string>('500');

  // Honest payment fields (no prefilled dummy credentials)
  const [upiApp, setUpiApp] = useState<string>('GPay');
  const [upiId, setUpiId] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [bankName, setBankName] = useState<string>('State Bank of India');

  // Withdraw fields
  const [withdrawInput, setWithdrawInput] = useState<string>('250');
  const [withdrawUpi, setWithdrawUpi] = useState<string>('');

  const [gatewayMode, setGatewayMode] = useState<'sandbox_verified' | 'razorpay_live'>(
    'sandbox_verified'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<WalletTransaction | null>(null);
  const [depositKey, setDepositKey] = useState<string>(() => makeIdempotencyKey());
  const [withdrawKey, setWithdrawKey] = useState<string>(() => makeIdempotencyKey());

  useEffect(() => {
    fetch('/api/wallet/config')
      .then((r) => r.json())
      .then((data) => {
        if (data?.gatewayMode === 'razorpay_live') {
          setGatewayMode('razorpay_live');
        }
      })
      .catch(() => {});

    if (auth.currentUser) {
      authFetch(`/api/wallet/${encodeURIComponent(playerId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (
            data?.ok &&
            typeof data.balance === 'number' &&
            Array.isArray(data.transactions) &&
            onSyncServerWallet
          ) {
            onSyncServerWallet(data.balance, data.transactions as WalletTransaction[]);
          }
        })
        .catch(() => {});
    }
  }, [onSyncServerWallet, playerId]);

  const parsedDepositAmount = Math.round(Number(amountInput));
  const parsedWithdrawAmount = Math.round(Number(withdrawInput));

  const formatCardDigits = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const groups = clean.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : '');
    setDepositKey(makeIdempotencyKey());
  };

  const formatExpiryInput = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExpiry(clean);
    }
    setDepositKey(makeIdempotencyKey());
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setErrorMsg(null);
    setReceipt(null);

    if (!Number.isFinite(parsedDepositAmount) || parsedDepositAmount < 50 || parsedDepositAmount > 100000) {
      setErrorMsg('Deposit amount must be between ₹50 and ₹1,00,000.');
      return;
    }

    let detail = '';
    if (method === 'UPI') {
      const cleanedUpi = upiId.trim();
      if (!UPI_VPA_REGEX.test(cleanedUpi)) {
        setErrorMsg('Enter a valid UPI ID (e.g. yourname@okicici or mobile@ybl).');
        return;
      }
      detail = `${upiApp} · ${cleanedUpi}`;
    } else if (method === 'Card') {
      const digits = cardNumber.replace(/\s+/g, '');
      if (!cardName.trim() || cardName.trim().length < 2) {
        setErrorMsg('Enter cardholder full name.');
        return;
      }
      if (!passesLuhn(digits)) {
        setErrorMsg('Invalid card number checksum. Please check your 16-digit card number.');
        return;
      }
      if (!isValidExpiry(cardExpiry)) {
        setErrorMsg('Enter a valid future expiry date in MM/YY format.');
        return;
      }
      if (!/^\d{3,4}$/.test(cardCvv.trim())) {
        setErrorMsg('Enter a valid 3 or 4 digit CVV.');
        return;
      }
      detail = `Card •••• ${digits.slice(-4)}`;
    } else {
      detail = bankName;
    }

    setIsProcessing(true);
    try {
      if (!auth.currentUser) {
        await signInWithGoogle();
      }
      const resp = await authFetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          idempotencyKey: depositKey,
          amount: parsedDepositAmount,
          method,
          detail,
          clientBalance: balance,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setErrorMsg(data.error || 'Deposit could not be processed.');
        return;
      }
      const tx = data.transaction as WalletTransaction;
      if (typeof data.balance === 'number' && onSyncServerWallet) {
        const nextTxs = transactions.some((t) => t.id === tx.id)
          ? transactions
          : [tx, ...transactions];
        onSyncServerWallet(data.balance, nextTxs.slice(0, 60));
      } else {
        onRecordTransaction(tx, tx.amount);
      }
      setReceipt(tx);
      setDepositKey(makeIdempotencyKey());
    } catch {
      setErrorMsg('Network error reaching payment endpoint.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setErrorMsg(null);
    setReceipt(null);

    if (balance < 100) {
      setErrorMsg('Available balance must be at least ₹100 to withdraw.');
      return;
    }
    if (!Number.isFinite(parsedWithdrawAmount) || parsedWithdrawAmount < 100) {
      setErrorMsg('Minimum withdrawal amount is ₹100.');
      return;
    }
    if (parsedWithdrawAmount > balance) {
      setErrorMsg('Withdrawal amount exceeds your available wallet balance.');
      return;
    }
    const cleanedUpi = withdrawUpi.trim();
    if (!UPI_VPA_REGEX.test(cleanedUpi)) {
      setErrorMsg('Enter a valid UPI ID for payout (e.g. name@okaxis).');
      return;
    }

    setIsProcessing(true);
    try {
      if (!auth.currentUser) {
        await signInWithGoogle();
      }
      const resp = await authFetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          idempotencyKey: withdrawKey,
          amount: parsedWithdrawAmount,
          method: 'UPI Payout',
          detail: cleanedUpi,
          clientBalance: balance,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setErrorMsg(data.error || 'Withdrawal failed.');
        return;
      }
      const tx = data.transaction as WalletTransaction;
      if (typeof data.balance === 'number' && onSyncServerWallet) {
        const nextTxs = transactions.some((t) => t.id === tx.id)
          ? transactions
          : [tx, ...transactions];
        onSyncServerWallet(data.balance, nextTxs.slice(0, 60));
      } else {
        onRecordTransaction(tx, -tx.amount);
      }
      setReceipt(tx);
      setWithdrawKey(makeIdempotencyKey());
    } catch {
      setErrorMsg('Network error reaching payout endpoint.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#220e05] border border-amber-400/25 shadow-2xl overflow-hidden text-amber-50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-amber-400/20 bg-[#180a03]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Wallet className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-amber-50 truncate">
                Arena Wallet & Deposit Desk
              </h2>
              <p className="text-xs text-amber-200/75">
                Available Balance:{' '}
                <span className="font-mono tabular-nums font-bold text-emerald-300">
                  ₹{balance.toLocaleString('en-IN')}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200/70 hover:text-white hover:bg-amber-400/15 transition-colors shrink-0"
            aria-label="Close wallet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1.5 bg-[#150802] border-b border-amber-400/15">
          {(
            [
              { id: 'deposit', label: 'Add Money' },
              { id: 'withdraw', label: 'Withdraw' },
              { id: 'ledger', label: `Ledger (${transactions.length})` },
            ] as { id: WalletTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setErrorMsg(null);
                setReceipt(null);
              }}
              className={`py-2 px-2 sm:px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-bold'
                  : 'text-amber-200/75 hover:text-amber-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto arena-scroll space-y-4">
          {/* Honest Gateway Status Notice */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/20 text-[11px]">
            <div className="flex items-center gap-1.5 text-amber-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                {gatewayMode === 'razorpay_live'
                  ? 'Live Merchant Gateway Connected'
                  : 'Server-Verified Sandbox Ledger (No Fake Bank Settlement)'}
              </span>
            </div>
            <span className="font-mono text-amber-300/80 shrink-0">Idempotent</span>
          </div>

          {receipt && (
            <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-400/45 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-emerald-200">
                  {receipt.type === 'deposit' ? 'Deposit Credited' : 'Withdrawal Recorded'} · ₹
                  {receipt.amount.toLocaleString('en-IN')}
                </p>
                <p className="text-emerald-300/85 font-mono">Ref: {receipt.referenceId}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/65 border border-red-400/45 text-xs text-red-100">
              {errorMsg}
            </div>
          )}

          {tab === 'deposit' && (
            <form onSubmit={handleDeposit} className="space-y-4">
              {/* Amount Presets & Clean Text Input */}
              <div className="space-y-2">
                <label className="text-xs text-amber-200/80 block">
                  Deposit Amount (₹50 – ₹1,00,000)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setAmountInput(String(val));
                        setDepositKey(makeIdempotencyKey());
                        setErrorMsg(null);
                      }}
                      className={`py-2 rounded-md border font-mono tabular-nums text-xs font-semibold transition-colors ${
                        parsedDepositAmount === val
                          ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                          : 'bg-[#180a03] border-amber-400/20 text-amber-200/80 hover:border-amber-400/45'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setAmountInput(digitsOnly);
                    setDepositKey(makeIdempotencyKey());
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-sm font-mono tabular-nums text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                  placeholder="Enter amount (e.g. 500)"
                />
              </div>

              {/* Payment Source Selector */}
              <div className="space-y-2">
                <label className="text-xs text-amber-200/80 block">Choose Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'UPI', label: 'UPI', icon: Smartphone },
                      { id: 'Card', label: 'Card', icon: CreditCard },
                      { id: 'NetBanking', label: 'NetBanking', icon: Building2 },
                    ] as const
                  ).map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMethod(m.id);
                          setErrorMsg(null);
                          setDepositKey(makeIdempotencyKey());
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                          method === m.id
                            ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                            : 'bg-[#180a03] border-amber-400/20 text-amber-200/75 hover:border-amber-400/40'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method-specific Inputs */}
              {method === 'UPI' && (
                <div className="p-3.5 rounded-lg bg-[#180a03] border border-amber-400/20 space-y-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {UPI_APPS.map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiApp(app)}
                        className={`py-1.5 rounded text-[11px] font-medium border transition-colors ${
                          upiApp === app
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                            : 'bg-[#281106] border-amber-400/15 text-amber-100/80'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-[11px] text-amber-200/75 block mb-1">
                      Your UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => {
                        setUpiId(e.target.value);
                        setDepositKey(makeIdempotencyKey());
                      }}
                      placeholder="e.g. yourname@okicici"
                      className="w-full px-3 py-2 rounded-md bg-[#281106] border border-amber-400/25 text-xs font-mono text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {method === 'Card' && (
                <div className="p-3.5 rounded-lg bg-[#180a03] border border-amber-400/20 space-y-3">
                  <div>
                    <label className="text-[11px] text-amber-200/75 block mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => {
                        setCardName(e.target.value);
                        setDepositKey(makeIdempotencyKey());
                      }}
                      placeholder="Name on card"
                      className="w-full px-3 py-2 rounded-md bg-[#281106] border border-amber-400/25 text-xs text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-amber-200/75 block mb-1">
                      Card Number (Luhn-Verified)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => formatCardDigits(e.target.value)}
                      maxLength={19}
                      placeholder="16-digit card number"
                      className="w-full px-3 py-2 rounded-md bg-[#281106] border border-amber-400/25 text-xs font-mono text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-amber-200/75 block mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardExpiry}
                        onChange={(e) => formatExpiryInput(e.target.value)}
                        maxLength={5}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 rounded-md bg-[#281106] border border-amber-400/25 text-xs font-mono text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-amber-200/75 block mb-1">CVV</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={cardCvv}
                        onChange={(e) => {
                          setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4));
                          setDepositKey(makeIdempotencyKey());
                        }}
                        maxLength={4}
                        placeholder="3 digits"
                        className="w-full px-3 py-2 rounded-md bg-[#281106] border border-amber-400/25 text-xs font-mono text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {method === 'NetBanking' && (
                <div className="p-3.5 rounded-lg bg-[#180a03] border border-amber-400/20 space-y-2">
                  <label className="text-[11px] text-amber-200/75 block">Select Your Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => {
                      setBankName(e.target.value);
                      setDepositKey(makeIdempotencyKey());
                    }}
                    className="w-full px-3 py-2 rounded-md bg-[#281106] border border-amber-400/25 text-xs text-amber-50 focus:outline-none focus:border-amber-400"
                  >
                    {BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing || !Number.isFinite(parsedDepositAmount) || parsedDepositAmount < 50}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-50 text-stone-950 text-sm font-bold transition-colors"
              >
                {isProcessing
                  ? 'Confirming Server Credit...'
                  : `Add ₹${(Number.isFinite(parsedDepositAmount) ? parsedDepositAmount : 0).toLocaleString('en-IN')} via ${method}`}
              </button>

              <p className="text-[11px] text-amber-200/60 text-center leading-relaxed">
                {gatewayMode === 'razorpay_live'
                  ? 'Live payment processing enabled via configured merchant keys.'
                  : 'Verified Sandbox Wallet: deposits are persisted idempotently on the server for World League entries. Add Razorpay keys in environment variables to enable live bank settlement.'}
              </p>
            </form>
          )}

          {tab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              {balance < 100 && (
                <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-400/40 text-xs text-amber-100">
                  Your current wallet balance is ₹{balance.toLocaleString('en-IN')}. Minimum balance required for withdrawal is ₹100.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-amber-200/80 block">
                  Withdraw Amount (Min ₹100 · Max ₹{balance.toLocaleString('en-IN')})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={withdrawInput}
                  onChange={(e) => {
                    setWithdrawInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setWithdrawKey(makeIdempotencyKey());
                  }}
                  placeholder="Enter withdrawal amount"
                  className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-sm font-mono tabular-nums text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-amber-200/80 block">Destination UPI ID</label>
                <input
                  type="text"
                  value={withdrawUpi}
                  onChange={(e) => {
                    setWithdrawUpi(e.target.value);
                    setWithdrawKey(makeIdempotencyKey());
                  }}
                  placeholder="e.g. yourname@okaxis"
                  className="w-full px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs font-mono text-amber-50 placeholder:text-amber-300/35 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing || balance < 100}
                className="w-full py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-stone-950 text-sm font-bold transition-colors"
              >
                {isProcessing
                  ? 'Recording Payout...'
                  : `Withdraw ₹${(Number.isFinite(parsedWithdrawAmount) ? parsedWithdrawAmount : 0).toLocaleString('en-IN')}`}
              </button>
            </form>
          )}

          {tab === 'ledger' && (
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-xs text-amber-200/70 text-center py-8">
                  No transactions recorded yet. Add funds to enter the World Chess League.
                </p>
              ) : (
                transactions.map((tx) => {
                  const isCredit = tx.type === 'deposit' || tx.type === 'prize';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#180a03] border border-amber-400/15"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                            isCredit
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-amber-50 truncate">
                            {tx.note}
                          </div>
                          <div className="text-[11px] font-mono text-amber-200/55 truncate">
                            {tx.referenceId}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono tabular-nums font-bold shrink-0 ${
                          isCredit ? 'text-emerald-300' : 'text-amber-100'
                        }`}
                      >
                        {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
