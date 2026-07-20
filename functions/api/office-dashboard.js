const response = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

const sydneyDate = () => {
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export async function onRequestGet({ env }) {
  try {
    const today = sydneyDate();
    const month = today.slice(0, 7);
    const [orders, visits, letters, bookings, customs, privateMessages, schedule, activity, finances, collections] = await Promise.all([
      env.DB.prepare(`SELECT
        SUM(CASE WHEN status='awaiting_payment' THEN 1 ELSE 0 END) pending,
        SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) paid
        FROM vault_orders`).first(),
      env.DB.prepare(`SELECT COUNT(*) count FROM office_visits WHERE visit_date>=? AND visit_date<=date(?, '+7 days') AND status='confirmed'`).bind(today, today).first(),
      env.DB.prepare(`SELECT COUNT(*) count FROM office_correspondence WHERE status='unread'`).first(),
      env.DB.prepare(`SELECT COUNT(*) count FROM house_booking_requests WHERE status='new'`).first(),
      env.DB.prepare(`SELECT COUNT(*) count FROM custom_requests WHERE status='new'`).first(),
      env.DB.prepare(`SELECT * FROM (
        SELECT 'booking' channel, m.booking_request_id request_id, m.id message_id, m.created_at
        FROM house_booking_messages m
        WHERE m.sender='client' AND m.id=(SELECT MAX(x.id) FROM house_booking_messages x WHERE x.booking_request_id=m.booking_request_id)
        UNION ALL
        SELECT 'custom', m.custom_request_id, m.id, m.created_at
        FROM custom_messages m
        WHERE m.sender='client' AND m.id=(SELECT MAX(x.id) FROM custom_messages x WHERE x.custom_request_id=m.custom_request_id)
      ) ORDER BY created_at DESC`).all(),
      env.DB.prepare(`SELECT id,guest_name,visit_date,start_time,duration_minutes,location,status FROM office_visits WHERE visit_date=? AND status!='cancelled' ORDER BY start_time LIMIT 6`).bind(today).all(),
      env.DB.prepare(`SELECT * FROM (
        SELECT 'order' kind, product_name title, order_reference detail, created_at happened_at FROM vault_orders
        UNION ALL SELECT 'visit', guest_name, 'Visit · ' || visit_date || ' ' || start_time, created_at FROM office_visits
        UNION ALL SELECT 'letter', guest_name, CASE WHEN subject!='' THEN subject ELSE substr(body,1,80) END, occurred_at FROM office_correspondence
        UNION ALL SELECT 'custom', guest_name, reference || ' · Custom request', created_at FROM custom_requests
        UNION ALL SELECT 'booking', guest_name, reference || ' · Booking request', created_at FROM house_booking_requests
        UNION ALL SELECT 'journal', title, status, updated_at FROM office_journal
        UNION ALL SELECT 'finance', description, category, created_at FROM office_finances
      ) ORDER BY happened_at DESC LIMIT 6`).all(),
      env.DB.prepare(`SELECT
        SUM(CASE WHEN transaction_type='income' AND status='cleared' THEN amount_cents ELSE 0 END) income,
        SUM(CASE WHEN transaction_type='expense' AND status='cleared' THEN amount_cents ELSE 0 END) expenses
        FROM office_finances WHERE substr(transaction_date,1,7)=?`).bind(month).first(),
      env.DB.prepare(`SELECT COUNT(*) count FROM vault_collection_links WHERE access_url IS NOT NULL AND trim(access_url)!=''`).first(),
    ]);

    const waitingMessages = privateMessages.results || [];
    const latestMessage = waitingMessages[0];
    return response({
      today,
      counts: {
        pendingPayments: Number(orders?.pending || 0),
        paidOrders: Number(orders?.paid || 0),
        upcomingVisits: Number(visits?.count || 0),
        unreadLetters: Number(letters?.count || 0),
        newBookings: Number(bookings?.count || 0),
        newCustoms: Number(customs?.count || 0),
        privateMessages: waitingMessages.length,
        readyCollections: Number(collections?.count || 0),
      },
      links: {
        privateMessages: latestMessage?.channel === 'booking' ? 'visits.html#booking-requests' : latestMessage?.channel === 'custom' ? 'customs.html#custom-requests' : 'correspondence.html',
      },
      schedule: schedule.results || [],
      activity: activity.results || [],
      finances: { income: Number(finances?.income || 0), expenses: Number(finances?.expenses || 0) },
    });
  } catch (error) {
    return response({ error: 'The dashboard could not load its live information.' }, 500);
  }
}
