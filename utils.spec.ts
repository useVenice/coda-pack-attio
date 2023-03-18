import URL from 'url-parse'
import {
  buildUrl,
  getDomain,
  getPathname,
  splitName,
  zEmail,
  zEmailOrDomain,
} from './utils'

test.each([
  ['http://google.com', '/'],
  ['http://google.com?id=1232#fda', '/'],
  ['http://www.google.com?id=1232#fda', '/'],
  ['http://attio.com/ada/', '/ada/'],
  ['attio.com', '/'],
  ['app.attio.com/test?adf=122', '/test'],
  ['tony@venice.is', '/'], // http:// gets added to prefix...
])('getPathname(%o) -> %o', (input, output) => {
  expect(getPathname(input)).toEqual(output)
})

test.each([
  ['http://google.com', 'google.com'],
  ['https://amazon.com', 'amazon.com'],
  ['http://google.com?id=1232#fda', 'google.com'],
  ['http://www.google.com?id=1232#fda', 'google.com'],
  ['http://attio.com/ada/', 'attio.com'],
  ['attio.com', 'attio.com'],
  ['app.attio.com/test?adf=122', 'attio.com'],
  ['tony@venice.is', 'venice.is'], // http:// gets added to prefix...
])('getDomain(%o) -> %o', (input, output) => {
  expect(getDomain(input)).toEqual(output)
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
])('zEmail(%o) -> [%o, %o]', (input, email, name) => {
  const _res = zEmail.safeParse(input)
  const res = _res.success ? _res.data : undefined
  expect(res?.email).toEqual(email)
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
