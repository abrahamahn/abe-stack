import { createHmac, timingSafeEqual } from "crypto"

type Data = { [key: string]: string | number }

export function createSignature(args: { data: string | Data; secretKey: Buffer }) {
	const { data, secretKey } = args
	const str = typeof data === "string" ? data : serialize(data)
	const hmac = createHmac("sha512", secretKey)
	hmac.update(str)
	return hmac.digest("base64")
}

export function verifySignature(args: {
	data: string | Data
	signature: string
	secretKey: Buffer
}): boolean {
	const { data, signature, secretKey } = args
	const validSignature = createSignature({ data, secretKey })
	
	// Convert strings to buffers for timingSafeEqual
	const validBuffer = Buffer.from(validSignature, 'utf8')
	const signatureBuffer = Buffer.from(signature, 'utf8')
	
	// Ensure buffers are the same length (required by timingSafeEqual)
	if (validBuffer.length !== signatureBuffer.length) {
		return false
	}
	
	// Use Node.js's native timing-safe comparison
	return timingSafeEqual(validBuffer, signatureBuffer)
}

function serialize(data: Data) {
	return JSON.stringify(
		Object.keys(data)
			.sort()
			.map((key) => [key, data[key]])
	)
}
