import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';
import type { CafeHoursDto, DayOfWeek } from '../types';

export interface CafeOpeningHoursProps {
  openingHours: CafeHoursDto[];
}

const WEEK_ORDER: readonly DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

// "09:00:00" (backend LocalTime serialization) -> "9:00 AM". Never invents a
// time - only ever formats a value the backend actually returned.
function formatTime(time: string): string {
  const [hoursPart, minutesPart] = time.split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const period = hours >= 12 ? 'PM' : 'AM';
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function CafeOpeningHours({ openingHours }: CafeOpeningHoursProps) {
  const byDay = new Map(openingHours.map((entry) => [entry.dayOfWeek, entry]));

  return (
    <View style={styles.container}>
      {WEEK_ORDER.map((day) => {
        const entry = byDay.get(day);
        const isUnavailable = !entry;
        const isClosed = entry?.isClosed ?? false;

        return (
          <View key={day} style={styles.row}>
            <Text style={styles.day}>{DAY_LABELS[day]}</Text>
            {isUnavailable ? (
              <Text style={styles.unavailable}>Hours not available</Text>
            ) : isClosed ? (
              <Text style={styles.closed}>Closed</Text>
            ) : entry.openTime && entry.closeTime ? (
              <Text style={styles.hours}>
                {formatTime(entry.openTime)} – {formatTime(entry.closeTime)}
              </Text>
            ) : (
              <Text style={styles.unavailable}>Hours not available</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  hours: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  closed: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  unavailable: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
