import { z } from 'zod'
import { makeZodSchemas } from './schemas'
import { buildUrl } from './utils'
import * as R from 'remeda'

export function withAttio(opts: {
  workspaceSlug: string
  fetch: import('@codahq/packs-sdk').Fetcher['fetch']
}) {
  const schemas = makeZodSchemas({ workspaceSlug: opts.workspaceSlug })
  const zListCollectionEntriesRespnose = z.object({
    next_page_offset: z.number().nullable(),
    data: z.array(schemas.entry),
  })
  return {
    assertPerson: (input: { email_addresses: string[] }) =>
      opts
        .fetch({
          method: 'PUT',
          url: 'https://api.attio.com/v1/people',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
        .then((r) => schemas.transformRecord(r.body)),
    assertCompany: (input: { domains: string[] }) =>
      opts
        .fetch({
          method: 'PUT',
          url: 'https://api.attio.com/v1/companies',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        })
        .then((r) => schemas.transformRecord(r.body)),
    listCollections: () =>
      opts
        .fetch({
          method: 'GET',
          url: 'https://api.attio.com/v1/collections',
        })
        .then((r) => z.array(schemas.collection).parse(r.body)),
    listCollectionEntries: (
      collectionId: string,
      params: { limit: number; offset: number } = { limit: 25, offset: 0 },
    ) =>
      opts
        .fetch({
          method: 'GET',
          url: buildUrl(
            `https://api.attio.com/v1/collections/${collectionId}/entries`,
            params,
          ),
        })
        .then((r) =>
          R.pipe(
            r.body as z.infer<typeof zListCollectionEntriesRespnose>,
            (res) => ({
              ...res,
              data: res.data.map((entry) => ({
                ...entry,
                record: schemas.transformRecord(entry.record),
              })),
            }),
          ),
        ),
  }
}
