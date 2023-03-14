import * as coda from '@codahq/packs-sdk'
import { unknown, z } from 'zod'
import * as R from 'remeda'

// MARK: - Zod schemas

export function makeZodSchemas(opts: { workspaceSlug: string }) {
  const recordBase = z.object({
    id: z.string().uuid(),
    created_at: z.string().datetime(),
    contact_type: z.enum(['person', 'company']),
  })

  const person = recordBase.extend({
    contact_type: z.literal('person'),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    avatar_url: z.string().url().nullable(),
    description: z.string().nullable(),
    email_addresses: z.array(z.string()),
  })

  const company = recordBase.extend({
    contact_type: z.literal('company'),
    name: z.string(),
    logo_url: z.string().url().nullable(),
    description: z.string().nullable(),
    domains: z.array(z.string()),
  })

  const record = z.discriminatedUnion('contact_type', [person, company])
  /**
   * We cannot use the transform function, fails on Coda miserably...
   * https://share.cleanshot.com/fjVcZG18
   */
  const transformRecord = (re: z.infer<typeof record>) => ({
    record_id: re.id,
    record_url: `https://app.attio.com/${opts.workspaceSlug}/${re.contact_type}/${re.id}`,
    ...(re.contact_type === 'company'
      ? { display_name: re.name, company: re, record_type: re.contact_type }
      : {
          display_name: R.compact([re.first_name, re.last_name]).join(' '),
          person: re,
          record_type: re.contact_type,
        }),
  })

  const attribute = z.object({
    id: z.string().uuid(),
    collection_id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    created_at: z.string().datetime(),
  })

  const collection = z
    .object({
      id: z.string(),
      name: z.string(),
      is_public: z.boolean(),
      created_at: z.string().datetime(),
      attributes: z.array(attribute),
      members: z.array(z.unknown()),
    })
    .transform((col) => ({
      ...col,
      collection_url: `https://app.attio.com/${opts.workspaceSlug}/collection/${col.id}`,
    }))

  const entry = z.object({
    id: z.string(),
    collection: collection,
    record: record,
    created_at: z.string().datetime(),
    /** https://share.cleanshot.com/m9zRLrpK */
    attributes: z.record(z.unknown()),
  })

  return { person, company, record, collection, entry, transformRecord }
}
// MARK: - Coda schemas

export const collectionSchema = coda.makeObjectSchema({
  properties: {
    collection_id: { type: coda.ValueType.String, fromKey: 'id' },
    collection_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
    },
    name: { type: coda.ValueType.String },
  },
  displayProperty: 'name',
  idProperty: 'collection_id',
  featuredProperties: ['name'],
})

export const recordSchema = coda.makeObjectSchema({
  properties: {
    record_id: { type: coda.ValueType.String },
    record_url: {
      type: coda.ValueType.String,
      codaType: coda.ValueHintType.Url,
    },
    record_type: { type: coda.ValueType.String }, // `person` vs. `company`. Is there a coda type for this?
    display_name: { type: coda.ValueType.String },
    person: coda.makeObjectSchema({
      properties: {
        email_addresses: {
          type: coda.ValueType.Array,
          items: coda.makeSchema({ type: coda.ValueType.String }),
        },
      },
    }),
    company: coda.makeObjectSchema({
      properties: {
        domains: {
          type: coda.ValueType.Array,
          items: coda.makeSchema({ type: coda.ValueType.String }),
        },
      },
    }),
  },
  displayProperty: 'display_name',
  idProperty: 'record_id',
  featuredProperties: [],
})
