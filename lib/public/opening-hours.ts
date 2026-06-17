import "server-only";
import { createClient } from '@/lib/supabase/server';

export type DbServiceHour = {
  id: string;
  service_type: 'dine_in' | 'reservations' | 'delivery' | 'takeaway';
  day_of_week: number;
  slot_number: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  min_lead_time_minutes: number;
  max_preorder_days: number;
  last_order_time: string | null;
  display_order: number;
};

export type DbOperationalStatus = {
  id: string;
  delivery_enabled: boolean;
  takeaway_enabled: boolean;
  reservations_enabled: boolean;
  dine_in_status: string; // 'open', 'closed'
  kitchen_busy_mode: boolean;
  temporary_message_pl: string | null;
  temporary_message_en: string | null;
  estimated_delay_minutes: number;
};

export type DbHolidayClosure = {
  id: string;
  date: string;
  title_pl: string;
  title_en: string;
  affected_service: 'all' | 'dine_in' | 'reservations' | 'delivery' | 'takeaway';
  is_closed: boolean;
  custom_open_time: string | null;
  custom_close_time: string | null;
  message_pl: string | null;
  message_en: string | null;
};

export type ServiceStatusInfo = {
  isOpen: boolean;
  hoursText: string;
  isClosedToday: boolean;
};

export type OpeningHoursPayload = {
  todayDayOfWeek: number;
  dineIn: ServiceStatusInfo;
  delivery: ServiceStatusInfo;
  weeklyHours: {
    dayOfWeek: number;
    dineInHoursText: string;
    deliveryHoursText: string;
  }[];
};

/**
 * Gets the current day of week, time, and date in Europe/Warsaw timezone.
 */
export function getWarsawDateDetails(now: Date = new Date()) {
  const dayStr = now.toLocaleDateString('en-US', { timeZone: 'Europe/Warsaw', weekday: 'short' });
  const daysMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };
  const dayOfWeek = daysMap[dayStr] ?? now.getDay();
  
  const timeString = now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Warsaw',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const dateString = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' }); // YYYY-MM-DD
  
  return { dayOfWeek, timeString, dateString };
}

/**
 * Helper to check if a 24h HH:MM time is between open and close times.
 * Handles crossing midnight.
 */
export function isTimeBetween(current: string, open: string, close: string): boolean {
  const cur = current.slice(0, 5);
  const op = open.slice(0, 5);
  const cl = close.slice(0, 5);
  
  if (cl > op) {
    return cur >= op && cur < cl;
  } else if (cl < op) {
    return cur >= op || cur < cl;
  } else {
    return false;
  }
}

/**
 * Calculates opening status for a specific service based on settings, operational status, and holidays.
 */
function calculateServiceStatus(
  serviceType: 'dine_in' | 'delivery',
  dayOfWeek: number,
  timeString: string,
  serviceHours: DbServiceHour[],
  opStatus: DbOperationalStatus | null,
  holiday: DbHolidayClosure | null,
  locale: string
): ServiceStatusInfo {
  const isPl = locale === 'pl';
  const closedLabel = isPl ? 'Zamknięte' : 'Closed';
  
  // 1. Check operational_status table overrides
  if (opStatus) {
    if (serviceType === 'delivery' && !opStatus.delivery_enabled) {
      return { isOpen: false, hoursText: closedLabel, isClosedToday: true };
    }
    if (serviceType === 'dine_in' && opStatus.dine_in_status === 'closed') {
      return { isOpen: false, hoursText: closedLabel, isClosedToday: true };
    }
  }

  // 2. Check holiday_closures overrides
  if (holiday) {
    const isAffected = holiday.affected_service === 'all' || holiday.affected_service === serviceType;
    if (isAffected) {
      if (holiday.is_closed) {
        return { isOpen: false, hoursText: closedLabel, isClosedToday: true };
      } else if (holiday.custom_open_time && holiday.custom_close_time) {
        const openStr = holiday.custom_open_time.slice(0, 5);
        const closeStr = holiday.custom_close_time.slice(0, 5);
        const hoursText = `${openStr} – ${closeStr}`;
        const isOpen = isTimeBetween(timeString, openStr, closeStr);
        return { isOpen, hoursText, isClosedToday: false };
      }
    }
  }

  // 3. Normal Service Hours
  const slots = serviceHours.filter(h => h.service_type === serviceType && h.day_of_week === dayOfWeek);
  const activeSlots = slots.filter(s => !s.is_closed);
  
  if (activeSlots.length === 0) {
    return { isOpen: false, hoursText: closedLabel, isClosedToday: true };
  }

  activeSlots.sort((a, b) => a.slot_number - b.slot_number);

  const hoursText = activeSlots
    .map(s => {
      const open = s.open_time.slice(0, 5);
      const close = s.close_time.slice(0, 5);
      return `${open} – ${close}`;
    })
    .join(', ');

  const isOpen = activeSlots.some(s => isTimeBetween(timeString, s.open_time, s.close_time));

  return { isOpen, hoursText, isClosedToday: false };
}

/**
 * Formats a regular weekly schedule list (Monday to Sunday) from service hours.
 */
export function getWeeklyHoursList(serviceHours: DbServiceHour[], locale: string) {
  const isPl = locale === 'pl';
  const closedLabel = isPl ? 'Zamknięte' : 'Closed';
  const daysOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun
  
  return daysOrder.map(day => {
    // Dine In
    const dineInSlots = serviceHours.filter(h => h.service_type === 'dine_in' && h.day_of_week === day && !h.is_closed);
    dineInSlots.sort((a, b) => a.slot_number - b.slot_number);
    const dineInText = dineInSlots.length > 0 
      ? dineInSlots.map(s => `${s.open_time.slice(0, 5)} – ${s.close_time.slice(0, 5)}`).join(', ') 
      : closedLabel;
      
    // Delivery
    const deliverySlots = serviceHours.filter(h => h.service_type === 'delivery' && h.day_of_week === day && !h.is_closed);
    deliverySlots.sort((a, b) => a.slot_number - b.slot_number);
    const deliveryText = deliverySlots.length > 0 
      ? deliverySlots.map(s => `${s.open_time.slice(0, 5)} – ${s.close_time.slice(0, 5)}`).join(', ') 
      : closedLabel;
      
    return {
      dayOfWeek: day,
      dineInHoursText: dineInText,
      deliveryHoursText: deliveryText
    };
  });
}

/**
 * Main server-side function to retrieve prepared opening hours data.
 */
export async function getPublicOpeningHours(locale: string): Promise<OpeningHoursPayload> {
  const emptyPayload: OpeningHoursPayload = {
    todayDayOfWeek: new Date().getDay(),
    dineIn: { isOpen: false, hoursText: locale === 'pl' ? 'Zamknięte' : 'Closed', isClosedToday: true },
    delivery: { isOpen: false, hoursText: locale === 'pl' ? 'Zamknięte' : 'Closed', isClosedToday: true },
    weeklyHours: []
  };

  try {
    const supabase = await createClient();
    const { dayOfWeek, timeString, dateString } = getWarsawDateDetails();
    
    // Fetch service hours, operational status, and active holiday closures concurrently
    const [serviceHoursRes, opStatusRes, holidayRes] = await Promise.all([
      supabase
        .from('service_hours')
        .select('*')
        .in('service_type', ['dine_in', 'delivery'])
        .order('day_of_week', { ascending: true })
        .order('display_order', { ascending: true }),
      supabase
        .from('operational_status')
        .select('*')
        .maybeSingle(),
      supabase
        .from('holiday_closures')
        .select('*')
        .eq('date', dateString)
        .eq('is_closed', true)
        .maybeSingle()
    ]);

    const serviceHours = (serviceHoursRes.data || []) as DbServiceHour[];
    const opStatus = opStatusRes.data as DbOperationalStatus | null;
    const holiday = holidayRes.data as DbHolidayClosure | null;

    const dineInStatus = calculateServiceStatus('dine_in', dayOfWeek, timeString, serviceHours, opStatus, holiday, locale);
    const deliveryStatus = calculateServiceStatus('delivery', dayOfWeek, timeString, serviceHours, opStatus, holiday, locale);
    const weeklyHours = getWeeklyHoursList(serviceHours, locale);

    return {
      todayDayOfWeek: dayOfWeek,
      dineIn: dineInStatus,
      delivery: deliveryStatus,
      weeklyHours
    };
  } catch (err) {
    console.error('Failed to get public opening hours:', err);
    return emptyPayload;
  }
}
