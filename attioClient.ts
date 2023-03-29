import currency from 'currency.js'
import { z } from 'zod'
import { makeZodSchemas } from './schemas'
import { buildUrl, R } from './utils'

export function withAttio(opts: {
  workspaceSlug: string
  fetch: import('@codahq/packs-sdk').Fetcher['fetch']
}) {
  const schemas = makeZodSchemas({ workspaceSlug: opts.workspaceSlug })
  const zListCollectionEntriesResponse = z.object({
    next_page_offset: z.number().nullable(),
    data: z.array(schemas.entry),
  })
  const zListCollectionAttributesResponse = z.object({
    next_page_offset: z.number().nullable(),
    data: z.array(schemas.v2Attribute),
  })
  function jsonHttp<T = any>(
    method: Parameters<typeof opts['fetch']>[0]['method'],
    url: string,
    body?: Record<string, unknown>,
  ) {
    return opts
      .fetch<T>({
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
    /** https://developers.attio.com/#assert-person-record */
    assertPerson: (input: {
      email_addresses: string[]
      first_name?: string
      last_name?: string
      description?: string
    }) =>
      jsonHttp('PUT', 'https://api.attio.com/v1/people', input).then((r) =>
        schemas.transformRecord(r),
      ),
    /** https://developers.attio.com/#assert-company-record */
    assertCompany: (input: {
      domains: string[]
      name?: string
      description?: string
    }) =>
      jsonHttp('PUT', 'https://api.attio.com/v1/companies', input).then((r) =>
        schemas.transformRecord(r),
      ),
    listCollections: () =>
      jsonHttp('GET', 'https://api.attio.com/v1/collections').then((r) =>
        z.array(schemas.collection).parse(r),
      ),
    listCollectionEntries: (
      collectionId: string,
      {
        limit = DEFAULT_LIMIT,
        offset = 0,
      }: { limit?: number; offset?: number },
    ) =>
      jsonHttp<z.infer<typeof zListCollectionEntriesResponse>>(
        'GET',
        buildUrl(
          `https://api.attio.com/v1/collections/${collectionId}/entries`,
          { limit, offset },
        ),
      ).then((res) => ({
        ...res,
        data: res.data.map((entry) => ({
          ...entry,
          record: schemas.transformRecord(entry.record),
        })),
      })),
    createCollectionEntry: (
      collectionId: string,
      body: { record_type: 'person' | 'company'; record_id: string },
    ) =>
      jsonHttp<z.infer<typeof schemas.entry>>(
        'POST',
        `https://api.attio.com/v1/collections/${collectionId}/entries`,
        body,
      ).then((entry) => ({
        ...entry,
        record: schemas.transformRecord(entry.record),
      })),
    deleteCollectionEntry: (collectionId: string, entryId: string) =>
      jsonHttp<{}>(
        'DELETE',
        `https://api.attio.com/v1/collections/${collectionId}/entries/${entryId}`,
      ),
    patchCollectionEntry: (
      collectionId: string,
      entryId: string,
      valueByAttributeIdOrSlug: Record<string, unknown>,
    ) =>
      jsonHttp<{}>(
        'PATCH',
        `https://api.attio.com/v2/lists/${collectionId}/entries/${entryId}`,
        {
          data: {
            entry_values: R.mapValues(valueByAttributeIdOrSlug, (v) => [
              // Attio seems to only validate the key relevant for attribute type, and ignores
              // invalid values for other types. So we can just send all the keys.
              { value: v, currency_value: currency(v as currency.Any).value },
            ]),
          },
        },
      ),
    listCollectionAttributes: (
      collectionId: string,
      {
        limit = DEFAULT_LIMIT,
        offset = 0,
        show_archived,
      }: { limit?: number; offset?: number; show_archived?: boolean },
    ) =>
      jsonHttp<z.infer<typeof zListCollectionAttributesResponse>>(
        'GET',
        buildUrl(`https://api.attio.com/v2/lists/${collectionId}/attributes`, {
          limit,
          offset,
          show_archived,
        }),
      ).then((res) => ({
        ...res,
        data: res.data.map((attr) => ({
          ...attr,
          attribute_id: attr.id.attribute_id,
          collection_id: attr.id.object_id,
        })),
      })),
  }
}

const DEFAULT_LIMIT = 250
