import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { PageHeader } from '@/components/shared';
import { getBookings } from '@/services/bookingService';
import { getInquiries } from '@/services/inquiryService';
import { CALENDAR_COLORS } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n';
import type { Booking } from '@/types';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: { type: string; bookingId?: string; inquiryId?: string };
}

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([getBookings(), getInquiries()]).then(([bookings, inquiries]) => {
      const bookingEvents: CalendarEvent[] = bookings.map((b: Booking) => ({
        id: b.id,
        title: `${b.customerName} - ${b.status}`,
        start: new Date(`${b.eventDate}T${b.eventTime || '09:00'}`),
        end: new Date(`${b.eventDate}T${b.eventTime ? addHour(b.eventTime) : '18:00'}`),
        resource: {
          type: b.paymentStatus !== 'completed' && b.status === 'Event Completed' ? 'pending' : b.status,
          bookingId: b.id,
        },
      }));

      const inquiryEvents: CalendarEvent[] = inquiries
        .filter((i) => i.status === 'new')
        .map((i) => ({
          id: i.id,
          title: `${i.customerName} - Inquiry`,
          start: new Date(`${i.eventDate}T${i.eventTime || '09:00'}`),
          end: new Date(`${i.eventDate}T${i.eventTime ? addHour(i.eventTime) : '18:00'}`),
          resource: { type: 'Inquiry', inquiryId: i.id },
        }));

      setEvents([...bookingEvents, ...inquiryEvents]);
      setLoading(false);
    });
  }, []);

  const eventStyleGetter = (event: CalendarEvent) => {
    const color = CALENDAR_COLORS[event.resource.type] ?? '#3B82F6';
    return { style: { backgroundColor: color, borderRadius: '4px', border: 'none', color: 'white', fontSize: '12px' } };
  };

  const handleSelect = (event: CalendarEvent) => {
    if (event.resource.bookingId) navigate(`/bookings/${event.resource.bookingId}`);
    else if (event.resource.inquiryId) navigate(`/inquiries/${event.resource.inquiryId}`);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>;

  return (
    <div>
      <PageHeader title={t('calendar')} />
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(CALENDAR_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
            <span>{status}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-white p-2 dark:bg-gray-800 dark:border-gray-700" style={{ height: 'calc(100vh - 220px)', minHeight: 400 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelect}
          popup
        />
      </div>
    </div>
  );
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${String(Math.min(h + 3, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
