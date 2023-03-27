import * as coda from '@codahq/packs-sdk'
import { withAttio as _withAttio } from './attioClient'
import {
  collectionSchema,
  entrySchema,
  parsedEmailSchema,
  recordSchema,
} from './coda-schemas'
import {
  arrayToSentence,
  jsonBuildObject,
  parseDomain,
  parseEmail,
  parseEmails,
  parsePathname,
  R,
  renderTemplate,
  splitName,
  zEmail,
  zEmailOrDomain,
  zUuid,
} from './utils'

export const pack = coda.newPack()

const t = coda.ValueType
const ht = coda.ValueHintType
const pt = coda.ParameterType

const params = {
  collectionId: coda.makeParameter({
    type: pt.String,
    name: 'collectionId',
    description: '',
    autocomplete: async function (ctx, search) {
      const res = await withAttio(ctx.fetcher).listCollections()
      return coda.autocompleteSearchObjects(search, res, 'name', 'id')
    },
  }),
  entryId: coda.makeParameter({
    name: 'entryId',
    type: pt.String,
    description: 'Collection entry id',
    // Can add autocomplete to based on collection id
  }),
  emailOrDomain: coda.makeParameter({
    name: 'emailOrDomain',
    type: pt.String,
    description: '',
  }),
}

/** TODO: This should be provided by the user */
const WORKSPACE_SLUG_HARDCODE = 'venice'

pack.addNetworkDomain('attio.com')

pack.setUserAuthentication({
  type: coda.AuthenticationType.HeaderBearerToken,
})

const withAttio = (opts: Pick<Parameters<typeof _withAttio>[0], 'fetch'>) => {
  const attio = _withAttio({ ...opts, workspaceSlug: WORKSPACE_SLUG_HARDCODE })
  const assertRecord = async (emailOrDomain: string) => {
    const parsed = zEmailOrDomain.parse(emailOrDomain)
    if (parsed.type === 'email') {
      return await attio.assertPerson({
        email_addresses: [parsed.value],
      })
    } else if (parsed.type === 'domain') {
      return await attio.assertCompany({
        domains: [parsed.value],
      })
    }
  }
  const addRecordToCollection = async (input: {
    emailOrDomain: string
    collectionId: string
    allowDuplicate?: boolean
  }) => {
    const record = await assertRecord(input.emailOrDomain)
    const entries =
      record.record_type === 'company'
        ? record.company.entries
        : record.person.entries
    const entry = entries[input.collectionId]?.[0]
    if (entry && !input.allowDuplicate) {
      // Still missing entry.collection but not used for now...
      return { ...entry, record }
    }
    return attio.createCollectionEntry(
      input.collectionId,
      R.pick(record, ['record_type', 'record_id']),
    )
  }
  return {
    ...attio,
    assertRecord,
    addRecordToCollection,
  }
}

function wrapError<T>(fn: () => T) {
  try {
    return fn()
  } catch (err) {
    throw new coda.UserVisibleError(err.message)
  }
}

// MARK: - Formulas

pack.addFormula({
  name: 'JsonBuildObject',
  description: 'Create json (returns as string) from key value paris',
  connectionRequirement: coda.ConnectionRequirement.None,
  parameters: [],
  varargParameters: [
    coda.makeParameter({
      type: pt.String,
      name: 'keyValues',
      description: 'Key value pairs',
    }),
  ],
  resultType: t.String,
  execute: (keyValues) => JSON.stringify(jsonBuildObject(...keyValues)),
})

pack.addFormula({
  name: 'RenderTemplate',
  description: 'Great for substitution',
  connectionRequirement: coda.ConnectionRequirement.None,
  parameters: [
    coda.makeParameter({
      name: 'templatStr',
      type: pt.String,
      description: 'Handlebars template',
    }),
    coda.makeParameter({
      type: pt.StringArray,
      name: 'keyValues',
      description: 'Key value pairs',
    }),
    coda.makeParameter({
      name: 'strict',
      type: pt.Boolean,
      optional: true,
      description:
        'Whether to ignore missing variables or throw error. Defaults to true',
    }),
  ],
  resultType: t.String,
  execute: ([templatStr, keyValues, strict = true]) =>
    wrapError(() =>
      renderTemplate(templatStr, jsonBuildObject(...keyValues), { strict }),
    ),
})

pack.addFormula({
  name: 'ArrayToSentence',
  description: '@see https://github.com/shinnn/array-to-sentence',
  connectionRequirement: coda.ConnectionRequirement.None,
  parameters: [
    coda.makeParameter({
      name: 'values',
      type: pt.StringArray,
      description: '',
    }),
  ],
  resultType: t.String,
  execute: ([values]) => arrayToSentence(values),
})

pack.addFormula({
  name: 'ParseEmail',
  description: 'Parse RFC 5322 email address',
  connectionRequirement: coda.ConnectionRequirement.None,
  parameters: [
    coda.makeParameter({
      name: 'email',
      type: pt.String,
      description: 'e.g. Bart Adams <bar@adams.com>, bill@gates.com',
    }),
  ],
  resultType: t.Object,
  schema: parsedEmailSchema,
  execute: ([email]) => parseEmail(email),
})

pack.addFormula({
  name: 'ParseEmails',
  description: 'Parse RFC 5322 email addresses',
  connectionRequirement: coda.ConnectionRequirement.None,
  parameters: [
    coda.makeParameter({
      name: 'emails',
      type: pt.String,
      description: 'e.g. Bart Adams <bar@adams.com>, bill@gates.com',
    }),
  ],
  resultType: t.Array,
  items: parsedEmailSchema,
  execute: ([emails]) => parseEmails(emails),
})

pack.addFormula({
  name: 'ParseDomain',
  description: 'Get the domain name of a url',
  connectionRequirement: coda.ConnectionRequirement.None,
  parameters: [
    coda.makeParameter({ name: 'url', type: pt.String, description: '' }),
  ],
  resultType: t.String,
  codaType: ht.Url,
  execute: ([urlString]) => parseDomain(urlString),
})

pack.addFormula({
  name: 'ParsePathname',
  description: 'Get the pathname of the input url',
  connectionRequirement: coda.ConnectionRequirement.None,
  parameters: [
    coda.makeParameter({ name: 'url', type: pt.String, description: '' }),
  ],
  resultType: t.String,
  execute: ([urlString]) => parsePathname(urlString),
})

pack.addFormula({
  name: 'GetOrCreatePerson',
  description:
    'Get or create the person based on email, or get person based on id',
  parameters: [
    coda.makeParameter({
      name: 'emailOrPersonId',
      type: pt.String,
      description: '',
    }),
    coda.makeParameter({
      name: 'updateName',
      type: pt.Boolean,
      optional: true,
      description:
        'Whether to use RFC 5322 name (e.g. Bart Christi <bart@attio.com>) to update name in attio',
    }),
  ],
  resultType: t.Object,
  schema: recordSchema,
  execute: function ([emailOrPersonId, updateName], ctx) {
    if (!emailOrPersonId) {
      return null
    }
    const attio = withAttio(ctx.fetcher)
    if (zUuid.safeParse(emailOrPersonId).success) {
      return attio.fetchPerson(emailOrPersonId)
    }
    const email = zEmail.safeParse(emailOrPersonId)
    if (email.success === false) {
      throw new coda.UserVisibleError(email.error.message, email.error)
    }
    const [first_name, last_name] = splitName(email.data.name)

    return attio
      .assertPerson({
        email_addresses: [email.data.address],
        ...(updateName && { first_name, last_name }),
      })
      .then((res) => ({
        ...res,
        meta: email.data,
      }))
  },
})

pack.addFormula({
  name: 'GetOrCreateCompany',
  description:
    'Get or create the company based on domain, or get company based on id',
  parameters: [
    coda.makeParameter({
      name: 'domainOrCompanyId',
      type: pt.String,
      description: '',
    }),
  ],
  resultType: t.Object,
  schema: recordSchema,
  execute: function ([domainOrCompanyId], ctx) {
    if (!domainOrCompanyId) {
      return null
    }
    const attio = withAttio(ctx.fetcher)
    return zUuid.safeParse(domainOrCompanyId).success
      ? attio.fetchCompany(domainOrCompanyId)
      : attio.assertCompany({ domains: [domainOrCompanyId] })
  },
})

pack.addFormula({
  name: 'AssertRecord',
  description:
    'Get or create the person (based on email) or company (based on domain)',
  parameters: [params.emailOrDomain],
  resultType: t.Object,
  schema: recordSchema,
  execute: function ([emailOrDomain], ctx) {
    return withAttio(ctx.fetcher).assertRecord(emailOrDomain)
  },
})

pack.addFormula({
  name: 'AssertCollectionEntry',
  description:
    'Assert record in collection by creating record if needed, then ensure it is in the given collection',
  parameters: [params.emailOrDomain, params.collectionId],
  // would be nice to support adding param for unique as well as adding by record id rather than email / domain
  resultType: t.Object,
  schema: entrySchema,
  execute: async function ([emailOrDomain, collectionId], ctx) {
    return withAttio(ctx.fetcher).addRecordToCollection({
      collectionId,
      emailOrDomain,
      allowDuplicate: false,
    })
  },
})

// MARK: - Actions

pack.addFormula({
  name: 'AddCollectionEntry',
  description:
    'Creating record if needed, then get/create a new entry to the collection',
  parameters: [
    params.collectionId,
    params.emailOrDomain,
    coda.makeParameter({
      name: 'allowDuplicate',
      type: pt.Boolean,
      optional: true,
      description: 'If true would allow multiple entry for the same record',
    }),
  ],
  isAction: true,
  resultType: t.Object,
  schema: entrySchema,
  execute: async function ([collectionId, emailOrDomain, allowDuplicate], ctx) {
    return withAttio(ctx.fetcher).addRecordToCollection({
      collectionId,
      emailOrDomain,
      allowDuplicate,
    })
  },
})

pack.addFormula({
  name: 'DeleteCollectionEntry',
  description: 'Remove entry from collection',
  isAction: true,
  parameters: [params.collectionId, params.entryId],
  // would be nice to support adding param for unique as well as adding by record id rather than email / domain
  resultType: t.Boolean,
  execute: async function ([collectionId, entryId], ctx) {
    const attio = withAttio(ctx.fetcher)
    await attio.deleteCollectionEntry(collectionId, entryId)
    return true
  },
})

// MARK: - Column formats

pack.addColumnFormat({ name: 'Domain', formulaName: 'ParseDomain' })
pack.addColumnFormat({ name: 'Pathname', formulaName: 'ParsePathname' })
pack.addColumnFormat({ name: 'Emails', formulaName: 'ParseEmails' })
pack.addColumnFormat({ name: 'Email', formulaName: 'ParseEmail' })

pack.addColumnFormat({
  name: 'Person',
  instructions: 'Assert person in attio crm',
  formulaName: 'GetOrCreatePerson',
})

pack.addColumnFormat({
  name: 'Company',
  instructions: 'Assert cmpany in attio crm',
  formulaName: 'GetOrCreateCompany',
})

pack.addColumnFormat({
  name: 'Record',
  instructions: 'Assert person or company in Attio crm',
  formulaName: 'AssertRecord',
})

// MARK: - Sync tables

pack.addSyncTable({
  name: 'Collections',
  identityName: 'Collection',
  schema: collectionSchema,
  formula: {
    name: 'SyncCollections',
    description: '',
    parameters: [],
    execute: async function (_, ctx) {
      return { result: await withAttio(ctx.fetcher).listCollections() }
    },
  },
})

pack.addSyncTable({
  name: 'Records',
  identityName: 'Record',
  schema: recordSchema,
  formula: {
    name: 'SyncRecords',
    description: '',
    parameters: [params.collectionId],
    // Would be nice to dedupe wih CollectionEntries table
    execute: async function ([collectionId], ctx) {
      const offset = Number.parseInt(
        `${ctx.sync.continuation?.['offset'] ?? 0}`,
      )
      const res = await withAttio(ctx.fetcher).listCollectionEntries(
        collectionId,
        { offset },
      )
      const result = res.data.map(({ record: re }) => re)
      return {
        result,
        continuation: res.next_page_offset
          ? { offset: res.next_page_offset }
          : undefined,
      }
    },
  },
})

pack.addDynamicSyncTable({
  name: 'CollectionEntries',
  identityName: 'CollectionEntry',
  listDynamicUrls: async function (ctx) {
    const res = await withAttio(ctx.fetcher).listCollections()
    return res.map((col) => ({ display: col.name, value: col.id }))
  },
  getName: async function (ctx) {
    const res = await withAttio(ctx.fetcher).listCollections()
    return (
      res.find((col) => col.id === ctx.sync.dynamicUrl)?.name ||
      ctx.sync.dynamicUrl
    )
  },
  getSchema: async function (_ctx) {
    return entrySchema
  },
  getDisplayUrl: async function (ctx) {
    return ctx.sync.dynamicUrl!
  },
  formula: {
    name: 'SyncCollectionEntries',
    description: '',
    parameters: [],
    execute: async function ([], ctx) {
      const collectionId = ctx.sync.dynamicUrl

      const offset = Number.parseInt(
        `${ctx.sync.continuation?.['offset'] ?? 0}`,
      )

      const res = await withAttio(ctx.fetcher).listCollectionEntries(
        collectionId,
        { offset },
      )
      return {
        result: res.data as any[],
        continuation: res.next_page_offset
          ? { offset: res.next_page_offset }
          : undefined,
      }
    },
  },
})
