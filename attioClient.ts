import { z } from 'zod'
import { makeZodSchemas } from './schemas'
import { buildUrl } from './utils'

export function withAttio(opts: {
  workspaceSlug: string
  fetch: import('@codahq/packs-sdk').Fetcher['fetch']
}) {
  const schemas = makeZodSchemas({ workspaceSlug: opts.workspaceSlug })
  const zListCollectionEntriesResponse = z.object({
    next_page_offset: z.number().nullable(),
    data: z.array(schemas.entry),
  })
  function jsonHttp(
    method: Parameters<typeof opts['fetch']>[0]['method'],
    url: string,
    body?: Record<string, unknown>,
  ) {
    return opts
      .fetch({
        method,
        url,
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      .then((r) => r.body)
  }
  return {
    fetchPerson: (person_id: string) =>
      jsonHttp('GET', `https://api.attio.com/v1/people/${person_id}`).then(
        (r) => schemas.transformRecord(r),
      ),
    fetchCompany: (company_id: string) =>
      jsonHttp('GET', `https://api.attio.com/v1/companies/${company_id}`).then(
        (r) => schemas.transformRecord(r),
      ),
    assertPerson: (input: { email_addresses: string[] }) =>
      jsonHttp('PUT', 'https://api.attio.com/v1/people', input).then((r) =>
        schemas.transformRecord(r),
      ),
    assertCompany: (input: { domains: string[] }) =>
      jsonHttp('PUT', 'https://api.attio.com/v1/companies', input).then((r) =>
        schemas.transformRecord(r),
      ),
    listCollections: () =>
      jsonHttp('GET', 'https://api.attio.com/v1/collections').then((r) =>
        z.array(schemas.collection).parse(r),
      ),
    listCollectionEntries: (
      collectionId: string,
      { limit = 100, offset = 0 }: { limit?: number; offset?: number },
    ) =>
      jsonHttp(
        'GET',
        buildUrl(
          `https://api.attio.com/v1/collections/${collectionId}/entries`,
          { limit, offset },
        ),
      ).then((res: z.infer<typeof zListCollectionEntriesResponse>) => ({
        ...res,
        data: res.data.map((entry) => ({
          ...entry,
          record: schemas.transformRecord(entry.record),
        })),
      })),
  }
}
