import * as coda from '@codahq/packs-sdk'

const t = coda.ValueType
const ht = coda.ValueHintType

export const collectionSchema = coda.makeObjectSchema({
  properties: {
    collection_id: { type: t.String, fromKey: 'id' },
    collection_url: { type: t.String, codaType: ht.Url },
    name: { type: t.String },
  },
  displayProperty: 'name',
  idProperty: 'collection_id',
  featuredProperties: ['name'],
  identity: { name: 'Collection' },
})

export const roleSchema = coda.makeObjectSchema({
  properties: {
    role_id: { type: t.String, fromKey: 'id' },
    title: { type: t.String },
    started_at: { type: t.String, codaType: ht.DateTime },
    ended_at: { type: t.String, codaType: ht.DateTime },
    created_at: { type: t.String, codaType: ht.DateTime },
    company_record: coda.makeObjectSchema({
      properties: {
        company_id: { type: t.String, fromKey: 'id' },
        name: { type: t.String },
      },
      displayProperty: 'name',
      idProperty: 'company_id',
    }),
    person_record: coda.makeObjectSchema({
      properties: {
        person_id: { type: t.String, fromKey: 'id' },
        name: { type: t.String },
        first_name: { type: t.String },
        last_name: { type: t.String },
      },
      displayProperty: 'first_name',
      idProperty: 'person_id',
    }),
  },
  displayProperty: 'title',
  idProperty: 'role_id',
})

export const personSchema = coda.makeObjectSchema({
  properties: {
    person_id: { type: t.String, fromKey: 'id' },
    name: { type: t.String },
    first_name: { type: t.String },
    last_name: { type: t.String },
    email_addresses: {
      type: t.Array,
      items: coda.makeSchema({ type: t.String }),
    },
    avatar_url: { type: t.String, codaType: ht.ImageAttachment },
    description: { type: t.String },
    roles: { type: t.Array, items: roleSchema },
  },
  // https://community.coda.io/t/unable-to-use-zod-in-coda-packs-e-this-issues-this-issues-e-could-not-be-cloned/38378/2
  displayProperty: 'first_name', // Name does not exist unless we fix the transform...
  idProperty: 'person_id',
})

export const companySchema = coda.makeObjectSchema({
  properties: {
    company_id: { type: t.String, fromKey: 'id' },
    name: { type: t.String },
    domains: { type: t.Array, items: coda.makeSchema({ type: t.String }) },
    logo_url: { type: t.String, codaType: ht.ImageAttachment },
    description: { type: t.String },
    roles: { type: t.Array, items: roleSchema },
  },
  displayProperty: 'name',
  idProperty: 'company_id',
})

export const recordSchema = coda.makeObjectSchema({
  properties: {
    record_id: { type: t.String },
    record_url: { type: t.String, codaType: ht.Url },
    record_type: { type: t.String }, // `person` vs. `company`. Is there a coda type for this?
    display_name: { type: t.String },
    person: personSchema,
    company: companySchema,
  },
  displayProperty: 'display_name',
  idProperty: 'record_id',
  featuredProperties: [],
  identity: { name: 'Record' },
})
