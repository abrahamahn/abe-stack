import crypto from 'crypto'

/**
 * When you pass a seed string, then the uuid will be deterministic.
 */
export function randomId(seed?: string) {
	if (!seed) return crypto.randomUUID()

	// Create a deterministic UUID using the seed
	const hash = crypto.createHash('md5').update(seed).digest()
	
	// Set version (4) and variant bits as per UUID v4 spec
	hash[6] = (hash[6] & 0x0f) | 0x40 // version 4
	hash[8] = (hash[8] & 0x3f) | 0x80 // variant 1

	// Convert to UUID string format
	return [
		hash.slice(0, 4).toString('hex'),
		hash.slice(4, 6).toString('hex'),
		hash.slice(6, 8).toString('hex'),
		hash.slice(8, 10).toString('hex'),
		hash.slice(10, 16).toString('hex'),
	].join('-')
}
