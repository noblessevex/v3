import React from 'react';
import { X, Printer, CreditCard } from 'lucide-react';
import { BookingRequest, StudentAccount, SiteSettings } from '../types';

interface InvoiceModalProps {
  request?: BookingRequest | null;
  student?: StudentAccount | null;
  payment?: PaymentRecord | null;
  siteSettings?: SiteSettings;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ 
  request, 
  student, 
  payment,
  siteSettings, 
  onClose 
}) => {
  const handlePrint = () => {
    window.print();
  };

  const name = student?.name || request?.name || 'Student';
  const phone = student?.phone || request?.phone || '';
  const email = student?.email || request?.email || '';
  const instrument = student?.instrument || request?.instrument || 'Piano';
  const frequency = student?.frequency || request?.frequency || '2x per week';
  const sessionLength = student?.sessionLength || request?.sessionLength || '60 min';
  const location = student?.preferredLocation || request?.preferredLocation || "Teacher's Studio (Ben Arous)";

  const ratePer30Min = siteSettings?.ratePer30Min || 12;
  const blocks = student?.sessionBlocks || request?.sessionBlocks || 2;
  const weeklySessions = student?.requiredDaysCount || (frequency.includes('1') ? 1 : frequency.includes('3') ? 3 : frequency.includes('Daily') ? 6 : 2);
  const pricePerWeek = blocks * ratePer30Min * weeklySessions;
  const totalPrice = request?.totalPrice || (pricePerWeek * 4);

  // Compute from real payment records
  const payments = payment ? [payment] : (student?.payments || []);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const amountDue = payment ? 0 : Math.max(0, totalPrice - totalPaid);
  const isPaid = payment ? true : (payments.length > 0 
    ? totalPaid >= totalPrice 
    : (student?.paymentStatus === 'paid' || request?.paymentStatus === 'paid'));

  const invoiceNumber = payment 
    ? `INV-PAY-${payment.id.replace('pay_', '').slice(0, 8).toUpperCase()}`
    : (student ? `INV-STD-${student.id.slice(0, 6).toUpperCase()}` : `INV-${request?.id?.replace('REQ-', '') || '001'}`);
  const todayFormatted = payment?.date || new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-[#E8913C] selection:text-[#0A0C0E]"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-[#101317] rounded-2xl shadow-2xl overflow-hidden my-8 border border-[rgba(237,231,220,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions (Hidden during print) */}
        <div className="print:hidden bg-[#0A0C0E] text-[#EDE7DC] px-6 py-4 flex items-center justify-between border-b border-[rgba(237,231,220,0.12)]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#E8913C]">
              Official Tuition Statement · Mimouni
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E8913C] text-[#E8913C] hover:bg-[#E8913C] hover:text-[#0A0C0E] text-xs font-semibold tracking-wider transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[rgba(237,231,220,0.15)] text-[#9EA5A8] hover:text-[#EDE7DC] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area: clean high-contrast white paper print layout */}
        <div id="printable-invoice" className="p-8 sm:p-10 text-slate-900 bg-white">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold text-sm">
                  M
                </div>
                <h2 className="text-xl font-black text-slate-950 tracking-tight">
                  Mohamed Mimouni
                </h2>
              </div>
              <p className="text-xs font-semibold text-amber-800">
                Master of Music · Pianist & Pedagogue
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {siteSettings?.contactAddress || 'Studio Mohamed Mimouni, Avenue Habib Bourguiba, Ben Arous, Tunisia'}
              </p>
              <p className="text-xs text-slate-500">
                Phone: {siteSettings?.contactPhone || '+216 98 123 456'} | {siteSettings?.contactEmail || 'contact@mohamedmimouni.tn'}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 block">
                Tuition Statement
              </span>
              <span className="text-lg font-black text-slate-950 font-mono block">
                {invoiceNumber}
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                Date: {todayFormatted}
              </span>
              <div className="mt-2 inline-block">
                {isPaid ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                    ✓ Paid / Payé
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                    Due / Solde Restant: {amountDue} TND
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Billed To (Student):
              </span>
              <p className="font-bold text-sm text-slate-950">{name}</p>
              <p className="text-slate-600 mt-0.5">Phone: {phone}</p>
              <p className="text-slate-600">Email: {email}</p>
              <p className="text-slate-600 mt-0.5">
                Location: {location}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Lesson Schedule:
              </span>
              <p className="text-slate-800">
                <strong>Course:</strong> {instrument}
              </p>
              <p className="text-slate-800">
                <strong>Frequency:</strong> {frequency}
              </p>
              <p className="text-slate-800">
                <strong>Session Length:</strong> {sessionLength} ({blocks} × 30-min blocks)
              </p>
              {student?.selectedWeeklyDays && student.selectedWeeklyDays.length > 0 && (
                <p className="text-amber-800 font-semibold mt-1">
                  Weekly: {student.selectedWeeklyDays.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 uppercase tracking-wider text-left">
                  <th className="py-2 font-bold">Item Description</th>
                  <th className="py-2 text-center font-bold">Duration</th>
                  <th className="py-2 text-center font-bold">Rate / 30m</th>
                  <th className="py-2 text-right font-bold">Total (TND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-slate-950">{instrument} — Classical & Theory</p>
                    <p className="text-slate-500 text-[11px]">
                      Monthly tuition block: {frequency} ({sessionLength} per appointment)
                    </p>
                    <p className="text-slate-400 text-[11px] italic">
                      Official single rate: {ratePer30Min} TND per 30 minutes. Pedagogical scores included.
                    </p>
                  </td>
                  <td className="py-3 text-center font-mono text-slate-700">
                    {sessionLength}
                  </td>
                  <td className="py-3 text-center font-mono text-slate-700">
                    {ratePer30Min} TND
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-slate-950 text-sm">
                    {totalPrice} TND
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payments breakdown if present */}
          {payments.length > 0 && (
            <div className="py-4 border-t border-slate-200">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 block mb-2">
                Recorded Payments / Paiements enregistrés ({payments.length}):
              </span>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-left text-[11px]">
                    <th className="py-1 font-semibold">Date</th>
                    <th className="py-1 font-semibold">Method</th>
                    <th className="py-1 font-semibold">Note</th>
                    <th className="py-1 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 font-mono">{p.date}</td>
                      <td className="py-1.5 capitalize">{p.method}</td>
                      <td className="py-1.5 italic text-slate-500">{p.note || '—'}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-emerald-700">
                        {p.amount} TND
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total & Summary */}
          <div className="border-t-2 border-slate-950 pt-4 flex justify-between items-start">
            <div className="text-[11px] text-slate-500 max-w-xs space-y-1">
              <p className="font-semibold text-slate-700">Terms & Policy:</p>
              <p>Tuition is due at the start of each month. Missed sessions can be rescheduled with minimum advance notice.</p>
              {request?.invoiceNotes && (
                <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                  <strong>Notes:</strong> {request.invoiceNotes}
                </div>
              )}
            </div>

            <div className="text-right space-y-1">
              <div className="text-xs text-slate-500">
                Weekly Equivalent: <span className="font-mono">{pricePerWeek} TND</span>
              </div>
              <div className="text-xs text-slate-500">
                Total Monthly Plan: <span className="font-mono">{totalPrice} TND</span>
              </div>
              <div className="text-xs text-emerald-700 font-semibold">
                Total Paid to Date: <span className="font-mono">{totalPaid} TND</span>
              </div>
              <div className="text-sm font-bold text-slate-900 pt-1">
                Amount Remaining Due:
              </div>
              <div className="text-2xl font-black text-slate-950 font-mono">
                {amountDue} <span className="text-sm font-bold text-amber-700">TND</span>
              </div>
            </div>
          </div>

          {/* Signature Line */}
          <div className="mt-10 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div>
              <p className="font-medium">Place of Issue: Ben Arous, Tunisia</p>
              <p className="text-[10px] text-slate-400">Master of Music · Mimouni</p>
            </div>
            <div className="text-right">
              <div className="font-serif italic text-base text-slate-900 font-bold mb-1">
                Mohamed Mimouni
              </div>
              <div className="w-36 border-t border-slate-400 pt-1 text-[10px] uppercase tracking-wider text-slate-500">
                Teacher Signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
