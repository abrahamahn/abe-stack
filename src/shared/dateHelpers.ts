export const SecondMs = 1000
export const MinuteMs = 60 * SecondMs
export const HourMs = 60 * MinuteMs
export const DayMs = 24 * HourMs

export const MinuteS = 60
export const HourS = 60 * MinuteS
export const DayS = 24 * MinuteS

export function formatDate(isoDate: string) {
	const now = new Date()
	const target = new Date(isoDate)
	const diffMs = now.getTime() - target.getTime()
	const diffS = Math.floor(diffMs / 1000)
	const diffM = Math.floor(diffS / 60)
	const diffH = Math.floor(diffM / 60)
	const diffD = Math.floor(diffH / 24)

	// Format relative time
	if (diffS < 60) return 'just now'
	if (diffM < 60) return `${diffM} minute${diffM === 1 ? '' : 's'} ago`
	if (diffH < 24) return `${diffH} hour${diffH === 1 ? '' : 's'} ago`
	if (diffD < 7) return `${diffD} day${diffD === 1 ? '' : 's'} ago`

	// For older dates, use a more formal format
	const options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}
	return target.toLocaleDateString(undefined, options)
}
