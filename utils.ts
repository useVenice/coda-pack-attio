import URL from 'url-parse'
import psl from 'psl'
import addrs from 'email-addresses'
import { z } from 'zod'

export const zUrl = z.string().url()
export const zUuid = z.string().uuid()

/** Supports parsing email from RFC 5322 */
export const zEmail = z.string().transform((str, ctx) => {
  const parsed = addrs.parseOneAddress(str)
  const mb = parsed?.type === 'mailbox' ? parsed : parsed?.addresses[0]
  if (!mb) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invaild email based on RFC 5322 ${str}`,
    })
    return z.NEVER
  }
  // TODO: Return name as well, first name / last name
  return { name: mb.name, email: mb.address }
})

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
    return {
      type: 'email' as const,
      value: emailRes.data.email,
      name: emailRes.data.name,
    }
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
  throw new Error(`${parsed.error?.code}: ${parsed.error?.message}`)
}

export function splitName(
  name: string | null | undefined,
): [firstName: string, lastName: string] {
  // Omitting empty string
  const [firstName, ...rest] = (name ?? '').split(' ').filter((p) => !!p)
  return [firstName, rest.length ? rest.join(' ') : undefined]
}

export function buildUrl(urlString: string, query: Record<string, unknown>) {
  const url = new URL(urlString)
  url.set('query', URL.qs.stringify(query))
  return url.toString()
}
