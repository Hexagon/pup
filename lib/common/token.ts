import { createJWT, generateKey, JWTPayload, validateJWT } from "@cross/jwt"
import { DEFAULT_SECRET_KEY_ALGORITHM } from "../core/configuration.ts"

export interface PupTokenPayload {
  data: unknown
  exp: number | undefined
}

export async function GenerateToken(secret: string, data: unknown, expMs: number | undefined) {
  const key = await generateKey(secret, DEFAULT_SECRET_KEY_ALGORITHM)
  const payload: JWTPayload = {
    data,
    exp: expMs ? Math.round(expMs / 1000) : undefined,
  }
  return await createJWT(payload, key, { validateExp: true })
}

export function ValidateToken(token: string, key: CryptoKey): unknown | null {
  try {
    const decoded = validateJWT(token, key, { validateExp: true })
    return decoded as unknown
  } catch (_err) {
    return null // Token invalid
  }
}
