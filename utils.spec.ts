import URL from 'url-parse'
import {
  arrayToSentence,
  buildUrl,
  jsonBuildObject,
  jsonParsePrimitive,
  parseDomain,
  parseEmails,
  parsePathname,
  renderTemplate,
  splitName,
  zEmail,
  zEmailOrDomain,
} from './utils'

test.each([
  [true, true],
  [3, 3],
  [null, null],
  [undefined, undefined],
  ['true', true],
  [3232, 3232],
  ['null', null],
  ['undefined', 'undefined'],
  ['hello', 'hello'],
  ['"tests"', 'tests'],
  ['', ''],
])('jsonParsePrimitive(%j) -> %o', (input, output) => {
  expect(jsonParsePrimitive(input)).toEqual(output)
})

test.each([
  [[], {}],
  [['hello', 'world'], { hello: 'world' }],
  [['hello', 'world', 'novalue'], { hello: 'world', novalue: undefined }],
  [['hello', 'world', 3, 4], { hello: 'world', '3': 4 }],
  [['hello', 'true'], { hello: true }],
  [['hello', '"true"', 'notNumber', '"4"'], { hello: 'true', notNumber: '4' }],
])('jsonBuildObject(%j) -> %o', (input, output) => {
  expect(jsonBuildObject(...input)).toEqual(output)
})

test.each([
  ['Hello {{name}}', { name: 'there' }, 'Hello there'],
  ['Hello {{name}}', {}, undefined],
  ['Hello {{nested.name}}', { nested: { name: 'there' } }, 'Hello there'],
])('renderTemplate(%o, %o) -> %o', (templateStr, variables, output) => {
  try {
    expect(renderTemplate(templateStr, variables)).toEqual(output)
  } catch {
    expect(undefined).toEqual(output)
  }
})

test.each([
  ['http://google.com', '/'],
  ['http://google.com?id=1232#fda', '/'],
  ['http://www.google.com?id=1232#fda', '/'],
  ['http://attio.com/ada/', '/ada/'],
  ['attio.com', '/'],
  ['app.attio.com/test?adf=122', '/test'],
  ['tony@venice.is', '/'], // http:// gets added to prefix...
])('parsePathname(%o) -> %o', (input, output) => {
  expect(parsePathname(input)).toEqual(output)
})

test.each([
  ['http://google.com', undefined, 'google.com'],
  ['https://amazon.com', undefined, 'amazon.com'],
  ['http://google.com?id=1232#fda', undefined, 'google.com'],
  ['http://www.google.com?id=1232#fda', undefined, 'google.com'],
  ['http://attio.com/ada/', undefined, 'attio.com'],
  ['attio.com', undefined, 'attio.com'],
  ['app.attio.com/test?adf=122', undefined, 'attio.com'],
  ['tony@venice.is', undefined, 'venice.is'], // http:// gets added to prefix...
  ['Hi Venice <hi@venice.is>', undefined, 'venice.is'],
  ['app.attio.com/test?adf=122', true, 'app.attio.com'],
  ['xxxx@resource.calendar.google.com', true, 'resource.calendar.google.com'],
])('parseDomain(%o %o) -> %o', (input, includeSubdomain, output) => {
  expect(parseDomain(input, includeSubdomain)).toEqual(output)
})

test.each([
  [[], ''],
  [['John'], 'John'],
  [['John', 'Adam'], 'John & Adam'],
  [['John', 'Adam', 'Lucie'], 'John, Adam & Lucie'],
  [['John', 'Adam', 'Lucie', 'Amy'], 'John, Adam, Lucie & Amy'],
])('arrayToSentence(%j) -> %o', (input, output) => {
  expect(arrayToSentence(input)).toEqual(output)
})

test.each([
  ['T X', 'T', 'X'],
  ['', undefined, undefined],
  ['Chris', 'Chris', undefined],
  ['Chris ', 'Chris', undefined],
])('splitName(%o) -> [%o, %o]', (input, firstName, lastName) => {
  expect(splitName(input)).toEqual([firstName, lastName])
})

test.each([
  ['hi@venice.is', [['hi@venice.is', null]]],
  ['<hi@venice.is>', [['hi@venice.is', null]]],
  ['Hi Venice <hi@venice.is>', [['hi@venice.is', 'Hi Venice']]],
  ['"" <hi@venice.is>', [['hi@venice.is', '']]],
  [
    'A Group:Ed Jones <c@a.test>,joe@where.test,John <jdoe@one.test>;',
    [
      ['c@a.test', 'Ed Jones'],
      ['joe@where.test', null],
      ['jdoe@one.test', 'John'],
    ],
  ],
  ['@venice.is>', []],
  ['bademal', []],
  [
    'Dan Romeo <dromeo@gmail.com>, David Da <david@da.ca>',
    [
      ['dromeo@gmail.com', 'Dan Romeo'],
      ['david@da.ca', 'David Da'],
    ],
  ],
])('parseEmails(%o) -> %j', (input, output) => {
  const _res = zEmail.safeParse(input)
  const res = _res.success ? _res.data : undefined
  expect(parseEmails(input).map((r) => [r.address, r.name])).toEqual(output)
})

test.each([
  ['hi@venice.is', 'hi@venice.is', null],
  ['<hi@venice.is>', 'hi@venice.is', null],
  ['Hi Venice <hi@venice.is>', 'hi@venice.is', 'Hi Venice'],
  ['"" <hi@venice.is>', 'hi@venice.is', ''],
  [
    'A Group:Ed Jones <c@a.test>,joe@where.test,John <jdoe@one.test>;',
    'c@a.test',
    'Ed Jones',
  ],
  ['@venice.is>', undefined, undefined],
  ['bademal', undefined, undefined],
  [
    'Dan Romeo <dromeo@gmail.com>, David Da <david@da.ca>',
    'dromeo@gmail.com',
    'Dan Romeo',
  ],
])('zEmail(%o) -> [%o, %o]', (input, email, name) => {
  const _res = zEmail.safeParse(input)
  const res = _res.success ? _res.data : undefined
  expect(res?.address).toEqual(email)
  expect(res?.name).toEqual(name)
})

test.each([
  ['http://google.com', 'google.com', 'domain'],
  ['https://amazon.com', 'amazon.com', 'domain'],
  ['http://google.com?id=1232#fda', 'google.com', 'domain'],
  ['http://www.google.com?id=1232#fda', 'google.com', 'domain'],
  ['http://attio.com/ada/', 'attio.com', 'domain'],
  ['attio.com', 'attio.com', 'domain'],
  ['app.attio.com/test?adf=122', 'attio.com', 'domain'],
  ['tony@venice.is', 'tony@venice.is', 'email'],
  ['dd', null, 'error'],
])('zEmailOrDomain(%o) -> %o', (input, value, type) => {
  const parsed = zEmailOrDomain.parse(input)
  expect(parsed.value).toEqual(value)
  expect(parsed.type).toEqual(type)
})

test('buildUrl', () => {
  expect(URL.qs.stringify({ hello: 123, world: 'yes' })).toEqual(
    'hello=123&world=yes',
  )
  // It's not really a valid url though... however seems to be passing...
  expect(buildUrl('attio.com', {})).toEqual('attio.com')
  // Seems to always add trailing slash
  expect(buildUrl('https://attio.com', {})).toEqual('https://attio.com/')

  expect(buildUrl('http://attio.com', { hello: 123, world: 'yes' })).toEqual(
    'http://attio.com/?hello=123&world=yes',
  )
})
