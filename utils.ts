import addrs from 'email-addresses'
import psl from 'psl'
import URL from 'url-parse'
import { z } from 'zod'
import Handlebars from 'handlebars'
import * as R from 'remeda'

export { R }

export const zUrl = z.string().url()
export const zUuid = z.string().uuid()

/** Supports parsing email from RFC 5322 */
export const zEmail = z.string().transform((str, ctx) => {
  const ret = parseEmail(str)
  if (!ret) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invaild email based on RFC 5322 ${str}`,
    })
    return z.NEVER
  }
  return ret
})

export const zDomain = z.string().transform((arg, ctx) => {
  try {
    return parseDomain(arg)
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
      value: emailRes.data.address,
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

export function parseEmail(str: string) {
  return parseEmails(str)[0]
}

export function parseEmails(str: string) {
  let res = addrs.parseAddressList({ input: str, simple: false })
  res = (res as any)?.addresses // Type here is wrong when simple: false https://share.cleanshot.com/gfdJBR3w
  return (res ?? [])
    .flatMap((p) => (p.type === 'mailbox' ? [p] : p.addresses))
    .map((mb) => {
      const [firstName, lastName] = splitName(mb.name)
      return {
        // https://github.com/jackbearheart/email-addresses/issues/62
        display: mb.node.tokens.trim(),
        address: mb.address,
        name: mb.name,
        domain: mb.domain,
        firstName,
        lastName,
      }
    })
}

/** Supports parsing domain from RFC5322 email address, and both with + without protocol  */
export function parseDomain(input: string, includeSubdomain?: boolean) {
  let email = parseEmail(input)
  if (email) {
    return parseDomain(email.domain, includeSubdomain)
  }
  const prefix = input.includes('://') ? '' : 'https://'
  const url = new URL(prefix + input)
  const parsed = psl.parse(url.hostname)
  if ('domain' in parsed && parsed.domain) {
    return R.compact([includeSubdomain && parsed.subdomain, parsed.domain]).join(
      '.',
    )
  }
  // TODO: Use verror
  throw new Error(`${parsed.error?.code}: ${parsed.error?.message}`)
}

export function parsePathname(urlString: string) {
  const prefix = urlString.includes('://') ? '' : 'https://'
  const url = new URL(prefix + urlString)
  return url.pathname
}

export function splitName(
  name: string | null | undefined,
): [firstName: string, lastName: string] {
  // Omitting empty string
  const [firstName, ...rest] = (name ?? '').split(' ').filter((p) => !!p)
  return [firstName, rest.length ? rest.join(' ') : undefined]
}

export function arrayToSentence(
  parts: string[],
  {
    separator = ',',
    lastSeparator = '&',
  }: { separator?: string; lastSeparator?: string } = {},
) {
  const firstPart = parts.slice(0, parts.length - 2)
  const last2 = parts.slice(parts.length - 2)
  return [...firstPart, last2.join(` ${lastSeparator} `)].join(`${separator} `)
}

export function buildUrl(urlString: string, query: Record<string, unknown>) {
  const url = new URL(urlString)
  url.set('query', URL.qs.stringify(query))
  return url.toString()
}

export function renderTemplate(
  templateStr: string,
  variables: Record<string, unknown>,
  options: { strict: boolean } = { strict: true },
) {
  const template = Handlebars.compile(templateStr, { ...options })
  try {
    return template(variables)
  } catch (err) {
    const msg = `${err}`
    const regex = /(.+) not defined in \[object Object\] (.+)/
    const [, prefix, suffix] = regex.exec(msg)
    throw new Error(`${prefix} is missing in variables ${suffix}`)
  }
}

/** Inspired by postgres jsonBuildObject */
export function jsonBuildObject(...keyValues: (string | number | boolean)[]) {
  return R.pipe(
    keyValues,
    R.chunk(2),
    R.map(([key, value]) => [key, jsonParsePrimitive(value)]),
    (pairs) => R.fromPairs(pairs as [string, string][]),
  )
}

export function jsonParsePrimitive(value: unknown) {
  try {
    return JSON.parse(`${value}`)
  } catch {
    return value
  }
}
