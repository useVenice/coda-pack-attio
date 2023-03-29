import * as coda from '@codahq/packs-sdk'

const t = coda.ValueType
const ht = coda.ValueHintType

export const parsedEmailSchema = coda.makeObjectSchema({
  properties: {
    display: { type: t.String, description: 'Name <address> in full' },
    address: {
      type: t.String,
      codaType: ht.Email,
    },
    name: { type: t.String },
    firstName: { type: t.String },
    lastName: { type: t.String },
    domain: { type: t.String, codaType: ht.Url },
  },
  displayProperty: 'display',
})

// ---

export const collectionSchema = coda.makeObjectSchema({
  properties: {
    collection_id: { type: t.String, fromKey: 'id' },
    collection_url: { type: t.String, codaType: ht.Url },
    name: { type: t.String },
  },
  displayProperty: 'name',
  idProperty: 'collection_id',
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
  identity: { name: 'Role' },
})

export const userSchema = coda.makeObjectSchema({
  properties: {
    id: { type: t.String },
    first_name: { type: t.String },
    last_name: { type: t.String },
    avatar_url: { type: t.String, codaType: ht.Url },
    email_address: { type: t.String, codaType: ht.Email },
    is_admin: { type: t.Boolean },
    is_suspended: { type: t.Boolean },
  },
  displayProperty: 'email_address',
  idProperty: 'id',
})

export const communicationIntelligence = coda.makeObjectSchema({
  properties: {
    last_contacted_at: { type: t.String, codaType: ht.DateTime },
    last_contacted_by: userSchema,
    strongest_connection_strength: { type: t.String }, // "STRONG",
    strongest_connection_user: userSchema,
  },
})

export const socialMediaEntry = coda.makeObjectSchema({
  properties: {
    handle: { type: t.String },
    url: { type: t.String, codaType: ht.Url },
  },
  displayProperty: 'handle',
  idProperty: 'url',
})

export const socialMedia = coda.makeObjectSchema({
  properties: {
    twitter: socialMediaEntry,
    linkedin: socialMediaEntry,
    facebook: socialMediaEntry,
    angellist: socialMediaEntry,
    instagram: socialMediaEntry,
  },
})

export const primaryLocattion = coda.makeObjectSchema({
  properties: {
    city: { type: t.String },
    state: { type: t.String },
    country_code: { type: t.String },
    country_name: { type: t.String },
  },
})

export const personSchema = coda.makeObjectSchema({
  properties: {
    person_id: { type: t.String, fromKey: 'id' },
    name: { type: t.String },
    first_name: { type: t.String },
    last_name: { type: t.String },
    email_addresses: {
      type: t.Array,
      items: coda.makeSchema({ type: t.String, codaType: ht.Email }),
    },
    avatar_url: { type: t.String, codaType: ht.ImageAttachment },
    description: { type: t.String },
    roles: { type: t.Array, items: roleSchema },
    communication_intelligence: communicationIntelligence,
    social_media: socialMedia,
    primary_location: primaryLocattion,
  },
  // https://community.coda.io/t/unable-to-use-zod-in-coda-packs-e-this-issues-this-issues-e-could-not-be-cloned/38378/2
  displayProperty: 'first_name', // Name does not exist unless we fix the transform...
  idProperty: 'person_id',
  identity: { name: 'Person' },
})

export const companySchema = coda.makeObjectSchema({
  properties: {
    company_id: { type: t.String, fromKey: 'id' },
    name: { type: t.String },
    domains: {
      type: t.Array,
      items: coda.makeSchema({ type: t.String, codaType: ht.Url }),
    },
    logo_url: { type: t.String, codaType: ht.ImageAttachment },
    description: { type: t.String },
    roles: { type: t.Array, items: roleSchema },
    communication_intelligence: communicationIntelligence,
    social_media: socialMedia,
    primary_location: primaryLocattion,
  },
  displayProperty: 'name',
  idProperty: 'company_id',
  identity: { name: 'Company' },
})

export const recordSchema = coda.makeObjectSchema({
  properties: {
    record_id: { type: t.String },
    record_url: { type: t.String, codaType: ht.Url },
    record_type: { type: t.String }, // `person` vs. `company`. Is there a coda type for this?
    display_name: { type: t.String },
    person: personSchema,
    company: companySchema,
    /** Optional metadata */
    meta: parsedEmailSchema,
  },
  displayProperty: 'display_name',
  idProperty: 'record_id',
  identity: { name: 'Record' },
})

export const entrySchema = coda.makeObjectSchema({
  properties: {
    entry_id: { type: t.String, fromKey: 'id' },
    collection: collectionSchema,
    record: recordSchema,
    attributes: coda.makeObjectSchema({
      // TODO: Parse attribute objects schema from attio collection metadata
      properties: {},
    }),
  },
  displayProperty: 'record',
  idProperty: 'entry_id',
  identity: { name: 'Entry' },
})

export const attributeSchema = coda.makeObjectSchema({
  properties: {
    attribute_id: { type: t.String },
    collection_id: {
      type: t.String,
      description: 'Actually object Id, due to collections being objects in v2',
    },
    title: { type: t.String },
    description: { type: t.String },
    api_slug: { type: t.String },
    type: { type: t.String },
    is_system_attribute: { type: t.Boolean },
    is_required: { type: t.Boolean },
    is_unique: { type: t.Boolean },
    is_multiselect: { type: t.Boolean },
    is_default_value_enabled: { type: t.Boolean },
    is_archived: { type: t.Boolean },
    created_at: { type: t.String, codaType: ht.DateTime },
  },
  displayProperty: 'title',
  idProperty: 'attribute_id',
  identity: { name: 'Attribute' },
  featuredProperties: [
    'api_slug',
    'type',
    'is_system_attribute',
    'is_archived',
    'description',
  ],
})
