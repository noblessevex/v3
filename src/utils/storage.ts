import { BookingRequest } from '../types';

export function exportRequestsToCSV(requests: BookingRequest[]): void {
  const headers = [
    'ID',
    'Student Name',
    'Phone',
    'Email',
    'Course',
    'Frequency',
    'Session Length',
    'Weekly Rate (TND)',
    'Monthly Total (TND)',
    'Preferred Location',
    'Status',
    'Payment Status',
    'Appointment Date',
    'Appointment Time',
    'Created At',
    'Notes',
  ];

  const rows = requests.map(r => [
    `"${r.id}"`,
    `"${r.name.replace(/"/g, '""')}"`,
    `"${r.phone}"`,
    `"${r.email}"`,
    `"${r.instrument}"`,
    `"${r.frequency}"`,
    `"${r.sessionLength}"`,
    r.pricePerWeek,
    r.totalPrice,
    `"${(r.preferredLocation || '').replace(/"/g, '""')}"`,
    `"${r.status}"`,
    `"${r.paymentStatus}"`,
    `"${r.appointmentDate || ''}"`,
    `"${r.appointmentTime || ''}"`,
    `"${r.createdAt}"`,
    `"${(r.invoiceNotes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `mimouni_students_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
