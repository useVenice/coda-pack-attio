import URL from 'url-parse'
import psl from 'psl'
import { z } from 'zod'

export const zEmail = z.string().email()
export const zUrl = z.string().url()
export const zDomain = z.string().transform((arg, ctx) => {
  try {
    return getDomain(arg)
  } catch (err) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${err}`,
    })
    return z.NEVER
  }
})

export const zEmailOrDomain = z.string().transform((arg) => {
  const emailRes = zEmail.safeParse(arg)
  if (emailRes.success) {
    return { type: 'email' as const, value: emailRes.data }
  }
  const domainRes = zDomain.safeParse(arg)
  if (domainRes.success) {
    return { type: 'domain' as const, value: domainRes.data }
  }
  return { type: 'error' as const, value: null }
})

// We need the url-parse package because the native one is not availble in Coda pack runtime

export function getPathname(urlString: string) {
  const prefix = urlString.includes('://') ? '' : 'https://'
  const url = new URL(prefix + urlString)
  return url.pathname
}

export function getDomain(urlString: string) {
  const prefix = urlString.includes('://') ? '' : 'https://'
  const url = new URL(prefix + urlString)
  const parsed = psl.parse(url.hostname)
  if ('domain' in parsed && parsed.domain) {
    return parsed.domain
  }
  // TODO: Use verror
  throw new Error(`${parsed.error.code}: ${parsed.error.message}`)
}

export function buildUrl(urlString: string, query: Record<string, unknown>) {
  const url = new URL(urlString)
  url.set('query', URL.qs.stringify(query))
  return url.toString()
}
