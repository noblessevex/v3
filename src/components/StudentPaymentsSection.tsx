import React, { useState } from 'react';
import { 
  CreditCard, Plus, CheckCircle2, Clock, AlertCircle, FileText, 
  Upload, Printer, DollarSign, Calendar, Info, X
} from 'lucide-react';
import { StudentAccount, PaymentRecord, Language } from '../types';
import { 
  recordStudentPayment, 
  uploadImageFile, 
  computeStudentPaymentSummary,
  sendPushNotification 
} from '../firebase';
import { translations } from '../translations';
import { InvoiceModal } from './InvoiceModal';

interface StudentPaymentsSectionProps {
  student: StudentAccount;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const StudentPaymentsSection: React.FC<StudentPaymentsSectionProps> = ({
  student,
  currentLang,
  showToast,
}) => {
  const t = translations[currentLang].studentSpace.payments;
  const paySummary = computeStudentPaymentSummary(student);

  // Form state for student submitting a payment
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'cash' | 'transfer' | 'other'>('transfer');
  const [note, setNote] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Invoice modal state for downloading/printing invoice for confirmed payment
  const [selectedInvoicePayment, setSelectedInvoicePayment] = useState<PaymentRecord | null>(null);

  const payments = student.payments || [];
  const sortedPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date));

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setSubmitError(currentLang === 'fr' ? 'Veuillez saisir un montant valide supérieur à 0 TND.' : 'Please enter a valid amount greater than 0 TND.');
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl: string | undefined = undefined;
      if (receiptFile) {
        const uploadRes = await uploadImageFile(receiptFile, `payment_receipts/${student.id}`);
        if (uploadRes.success && uploadRes.url) {
          receiptUrl = uploadRes.url;
        } else {
          console.warn('Receipt upload notice:', uploadRes.error);
        }
      }

      const res = await recordStudentPayment(student.id, {
        date,
        amount: numAmount,
        method,
        note: note.trim() || undefined,
        receiptUrl,
      }, true); // isStudentSubmission = true (forces status: 'pending')

      if (res.success) {
        showToast(t.submitSuccess);
        setShowSubmitModal(false);
        setAmount('');
        setNote('');
        setReceiptFile(null);

        // Notify Admin via push & in-app
        await sendPushNotification({
          target: 'admin',
          titleEn: `New Payment Submitted: ${student.name}`,
          titleFr: `Nouveau Règlement Déclaré : ${student.name}`,
          bodyEn: `${student.name} declared a payment of ${numAmount} TND (${method}). Awaiting your confirmation.`,
          bodyFr: `${student.name} a déclaré un règlement de ${numAmount} TND (${method}). En attente de votre validation.`,
          link: '/admin',
          type: 'payment_submitted',
        });
      } else {
        setSubmitError(res.error || 'Failed to submit payment.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'System error submitting payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'confirmed' || !status) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>{t.statusConfirmed}</span>
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
          <AlertCircle className="w-3 h-3" />
          <span>{t.statusRejected}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3 h-3 animate-pulse" />
        <span>{t.statusPending}</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(237,231,220,0.1)] pb-5">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#EDE7DC]">
            {t.title}
          </h2>
          <p className="text-xs text-[#9EA5A8] mt-1">
            {t.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSubmitModal(true)}
          className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#E8913C]/10 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.submitPayment}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8]">
            {t.monthlyPlan}
          </span>
          <div className="text-2xl font-black font-mono text-[#EDE7DC]">
            {paySummary.monthlyTuition} <span className="text-sm font-semibold text-[#E8913C]">TND</span>
          </div>
          <p className="text-[11px] text-[#7E858A]">
            {student.sessionLength} · {student.frequency}
          </p>
        </div>

        <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8]">
            {t.totalPaid}
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {paySummary.totalPaid} <span className="text-sm font-semibold text-emerald-500">TND</span>
          </div>
          <p className="text-[11px] text-[#7E858A]">
            {paySummary.confirmedCount} {currentLang === 'fr' ? 'règlement(s) validé(s)' : 'confirmed record(s)'}
          </p>
        </div>

        <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EA5A8]">
            {t.balanceDue}
          </span>
          <div className={`text-2xl font-black font-mono ${paySummary.amountDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {paySummary.amountDue} <span className="text-sm font-semibold text-amber-500">TND</span>
          </div>
          <p className="text-[11px] text-[#7E858A]">
            {paySummary.amountDue === 0 
              ? (currentLang === 'fr' ? 'À jour ✓ Aucun solde restant' : 'Fully paid up to date ✓') 
              : (currentLang === 'fr' ? 'Solde à régler pour le mois' : 'Outstanding tuition for current cycle')}
          </p>
        </div>
      </div>

      {/* Payment History List */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-[#EDE7DC] flex items-center justify-between">
          <span>{t.historyTitle}</span>
          <span className="text-xs font-mono text-[#9EA5A8]">
            {sortedPayments.length} {currentLang === 'fr' ? 'enregistré(s)' : 'recorded'}
          </span>
        </h3>

        {sortedPayments.length === 0 ? (
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl p-10 text-center space-y-3">
            <CreditCard className="w-10 h-10 mx-auto text-[#6C7378]" />
            <h4 className="font-display font-bold text-base text-[#EDE7DC]">{t.emptyHistory}</h4>
            <p className="text-xs text-[#9EA5A8] max-w-sm mx-auto">
              {currentLang === 'fr' 
                ? 'Lorsque vous déclarez un règlement, il apparaît ici et Maestro Mimouni le confirmera.'
                : 'When you submit a payment or Maestro Mimouni records one, it appears here.'}
            </p>
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] text-[#0A0C0E] font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all"
            >
              {t.submitPayment}
            </button>
          </div>
        ) : (
          <div className="bg-[#101317] border border-[rgba(237,231,220,0.1)] rounded-2xl overflow-hidden divide-y divide-[rgba(237,231,220,0.08)]">
            {sortedPayments.map((p) => {
              const isConfirmed = !p.status || p.status === 'confirmed';
              return (
                <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[rgba(237,231,220,0.02)] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs text-[#9EA5A8] font-bold">
                        {p.date}
                      </span>
                      {getStatusBadge(p.status)}
                      <span className="text-xs text-[#EDE7DC] font-medium capitalize bg-[#161B22] px-2 py-0.5 rounded-md border border-[rgba(237,231,220,0.08)]">
                        {p.method === 'cash' ? t.methods.cash : p.method === 'transfer' ? t.methods.transfer : t.methods.other}
                      </span>
                    </div>

                    {p.note && (
                      <p className="text-xs text-[#9EA5A8] italic">
                        {p.note}
                      </p>
                    )}

                    {p.status === 'pending' && (
                      <p className="text-[11px] text-amber-400/80 flex items-center gap-1 pt-0.5">
                        <Info className="w-3 h-3" />
                        <span>{t.pendingNotice}</span>
                      </p>
                    )}

                    {p.receiptUrl && (
                      <div className="pt-1">
                        <a 
                          href={p.receiptUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs text-[#E8913C] hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{currentLang === 'fr' ? 'Voir le reçu joint' : 'View attached receipt'}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-[#EDE7DC]">
                        {p.amount} <span className="text-xs text-[#E8913C] font-bold">TND</span>
                      </span>
                    </div>

                    {/* Invoice Download Button (Available for confirmed payments) */}
                    {isConfirmed && (
                      <button
                        type="button"
                        onClick={() => setSelectedInvoicePayment(p)}
                        className="cursor-pointer border border-[#E8913C]/40 hover:border-[#E8913C] text-[#E8913C] hover:bg-[#E8913C]/10 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
                        title={t.downloadInvoice}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t.downloadInvoice}</span>
                        <span className="sm:hidden">PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showSubmitModal && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => !submitting && setShowSubmitModal(false)}
        >
          <div 
            className="bg-[#101317] border border-[rgba(237,231,220,0.18)] rounded-2xl max-w-lg w-full p-6 space-y-5 text-xs text-[#EDE7DC]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgba(237,231,220,0.1)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E8913C]/15 border border-[#E8913C]/30 text-[#E8913C] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#EDE7DC]">
                    {t.submitPayment}
                  </h3>
                  <p className="text-[11px] text-[#9EA5A8]">
                    {t.submitSubtitle}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="cursor-pointer text-[#9EA5A8] hover:text-[#EDE7DC] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9EA5A8] mb-1">
                  {t.date}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9EA5A8] mb-1">
                  {t.amount}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 96"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#E8913C]">
                    TND
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9EA5A8] mb-1">
                  {t.method}
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                >
                  <option value="transfer">{t.methods.transfer}</option>
                  <option value="cash">{t.methods.cash}</option>
                  <option value="other">{t.methods.other}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9EA5A8] mb-1">
                  {t.receiptPhoto}
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#E8913C] file:text-[#0A0C0E] file:cursor-pointer"
                />
                <p className="text-[10px] text-[#7E858A] mt-1">
                  PNG, JPG, WEBP, PDF up to 10 MB.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#9EA5A8] mb-1">
                  {t.note}
                </label>
                <input
                  type="text"
                  placeholder={t.notePlaceholder}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#0A0C0E] border border-[rgba(237,231,220,0.15)] focus:border-[#E8913C] rounded-xl px-3 py-2 text-xs text-[#EDE7DC] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(237,231,220,0.1)]">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs text-[#9EA5A8] hover:text-[#EDE7DC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer bg-[#E8913C] hover:bg-[#d8812c] disabled:opacity-50 text-[#0A0C0E] font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                >
                  {submitting ? t.submitting : t.submitButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal for individual confirmed payment */}
      {selectedInvoicePayment && (
        <InvoiceModal
          student={student}
          payment={selectedInvoicePayment}
          onClose={() => setSelectedInvoicePayment(null)}
        />
      )}
    </div>
  );
};
