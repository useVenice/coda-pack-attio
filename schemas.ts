import * as R from 'remeda'
import { z } from 'zod'

function joinName(person: { first_name?: string; last_name?: string }) {
  return R.compact([person.first_name, person.last_name]).join(' ')
}

// MARK: - Zod schemas

export function makeZodSchemas(opts: { workspaceSlug: string }) {
  const role = z.object({
    id: z.string(),
    title: z.string().nullable(),
    started_at: z.string().datetime().nullable(),
    ended_at: z.string().datetime().nullable(),
    created_at: z.string().datetime().nullable(),
    company_record: z.object({
      id: z.string(),
      name: z.string().nullable(),
    }),
    person_record: z
      .object({
        id: z.string(),
        first_name: z.string().nullable(),
        last_name: z.string().nullable(),
      })
      .transform((person) => ({ ...person, name: joinName(person) })),
  })

  const recordBase = z.object({
    id: z.string().uuid(),
    created_at: z.string().datetime(),
    contact_type: z.enum(['person', 'company']),
    /** $collectionId => [{id: $entryId, collection_id: $collectionId}] */
    entries: z.record(
      z.array(
        z.object({ id: z.string().uuid(), collection_id: z.string().uuid() }),
      ),
    ),
    description: z.string().nullable(),
    roles: z.array(role),
    communication_intelligence: z.record(z.unknown()),
    social_media: z.record(z.unknown()),
    primary_location: z.record(z.unknown()),
  })

  const person = recordBase.extend({
    contact_type: z.literal('person'),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    avatar_url: z.string().url().nullable(),
    email_addresses: z.array(z.string()),
  })

  const company = recordBase.extend({
    contact_type: z.literal('company'),
    name: z.string(),
    logo_url: z.string().url().nullable(),
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
          display_name: joinName(re),
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

  const v2Attribute = z.object({
    id: z.object({
      workspace_id: z.string(),
      object_id: z.string(),
      attribute_id: z.string(),
    }),
    title: z.string(),
    description: z.string().nullish(),
    api_slug: z.string(),
    type: z.enum([
      // https://share.cleanshot.com/kfYP1xDl
      'text',
      'number',
      'checkbox',
      'currency',
      'date',
      'timestamp',
      'rating',
      'status',
      'select',
      'record-reference',
      'actor-reference',
      'location',
      'domain',
      'email-address',
      'phone-number',
      'interaction',
      'personal-name',
    ]),
    is_system_attribute: z.boolean(),
    is_required: z.boolean(),
    is_unique: z.boolean(),
    is_multiselect: z.boolean(),
    is_default_value_enabled: z.boolean(),
    is_archived: z.boolean(),
    created_at: z.string(),
    default_value: z.any(),
    config: z.any(),
  })

  return { person, company, record, collection, entry, transformRecord , v2Attribute}
}
