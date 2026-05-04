import { holidays } from 'japanese-public-holidays'

type HolidayInfo = { date: string; name: string }

const holidayMap: Record<string, HolidayInfo> = {}
for (const h of holidays) {
  holidayMap[h.date] = h
}

export function getHolidayInfo(date: Date): HolidayInfo | null {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return holidayMap[`${y}-${m}-${d}`] ?? null
}
