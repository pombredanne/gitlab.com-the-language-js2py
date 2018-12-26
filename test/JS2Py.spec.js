'use strict'

const test = require('tape')
const fs = require('fs')
const JS2Py = require('../src/JS2Py')

const f = new JS2Py()

test('indenting', (t) => {
  const cases = [
    [`for (let i = 0; i < 10; i++) { for (let j = 0; j < i; j++) { i+j }}`, 
`for i in range(0, 10):
  for j in range(0, i):
    i + j`],
    ['class A { b() { c(); d() } }', 'class A:\n  def b(self):\n    c()\n    d()\n\n'],
  ]
  t.plan(cases.length)
  cases.map(([js, expected]) => t.equal(f.convert(js), expected, js))
})

test('if', (t) => {
  const cases = [
    ['if (true) { a() } else { b() }', 'if true:\n  a()\nelse:\n  b()'],
    ['if (true) a(); else b()', 'if true:\n  a()\nelse:\n  b()'],
    ['if (a) b()', 'if a:\n  b()'],
    ['class A { b() { if (a) b() } }', 'class A:\n  def b(self):\n    if a:\n      b()\n\n'],
    ['class A { b() { if (a) { b() } } }', 'class A:\n  def b(self):\n    if a:\n      b()\n\n'],
    ['function b() { if (a) { b() } }', 'def b():\n  if a:\n    b()\n'],
  ]
  t.plan(cases.length)
  cases.map(([js, expected]) => t.equal(f.convert(js), expected, js))
})

test('js parts', (t) => {
  const cases = [
    [`B = require('a')`, 'from a import B'],
    [`const B = require('a')`, 'from a import B'],
    [`"use static"`, ''],
    [`'use static'`, ''],
    [`"other directive"`, ''],
    [`a = "use static"`, 'a = "use static"'],
    [`module.exports = a`, ''],
  ]
  t.plan(cases.length)
  cases.map(([js, expected]) => t.equal(f.convert(js), expected, js))
})

test('for as while', (t) => {
  t.plan(1)
  t.equal(f.convert('for (let i = 0, j = 1; i < j; i += 1) {}'), `i = 0
j = 1
while i < j:
  pass
  i += 1`)
})

test('for range', (t) => {
  t.plan(1)
  t.equal(f.convert('for (let i = 0; i < period; i++) {}'), 'for i in range(0, period):\n  pass')
})


test('language parts', (t) => {
  const cases = [
    ['var a = 1', 'a = 1'],
    ['let a', ''],
    ['const a = 1', 'a = 1'],
    ['const [a] = 1', '[ a ] = 1'],
    ['const [a, b] = [1, 2]', '[ a, b ] = [1, 2]'],
    ['new Foo()', 'Foo()'],
    ['a.b()', 'a.b()'],
    ['a[b]', 'a[b]'],
    ['a.b', 'a.b'],
    ['a()', 'a()'],
    ['offset * (period - 1)', 'offset * (period - 1)'],
    ['function a(b, c) {}', 'def a(b, c):\n  pass\n'],
    ['function a() {return}', 'def a():\n  return\n'],
    ['function a() {return 1}', 'def a():\n  return 1\n'],
    ['class A {}', 'class A:\n  pass\n'],
    ['class A extends B {}', 'class A(B):\n  pass\n'],
    ['class A { constructor (b, c) {} }', 'class A:\n  def __init__(self, b, c):\n    pass\n\n'],
    ['class A { b() { super.b() } }', 'class A:\n  def b(self):\n    super().b()\n\n'],
    ['class A { b() { super() } }', 'class A:\n  def b(self):\n    super().__init__()\n\n'],
    ['class A { b() { this.b() } }', 'class A:\n  def b(self):\n    self.b()\n\n'],
    ['a === b', 'a == b'],
    ['a = {}', 'a = {}'],
    ['a = {b: 1}', `a = {\n  'b': 1\n}`],
    ['function f() { a = {b: 1}}', `def f():\n  a = {\n    'b': 1\n  }\n`],
    ['a = {b: 1, c:d}', `a = {\n  'b': 1,\n  'c': d\n}`],
    ['`text`', `'text'`],
    ['`hi ${a}/${b} in ${c}`', `'hi %f/%f in %f' % (a, b, c)`],
    ['delete a[0]', 'del a[0]'],
    ['-a', '-a'],
    ['+a', '+a'],
    ['!a', 'not a'],
    ['a || b', 'a or b'],
    ['a && b', 'a and b'],
    ['a ? b : c', 'b if a else c'],
  ]
  t.plan(cases.length)
  cases.map(([js, expected]) => t.equal(f.convert(js), expected, js))
})

test('BigNumber', (t) => {
  const cases = [
    ['new BigN(a)', 'a'],
    ['BigN.max(list)', 'max(list)'],
    ['a.minus(b)', 'a - b'],
    ['a.plus(b)', 'a + b'],
    ['a.times(b)', 'a * b'],
    ['a.dividedBy(b)', 'a / b'],
    ['tr.minus(er.times(0.5)).plus(sh.times(0.25))', '(tr - (er * 0.5)) + (sh * 0.25)']
  ]
  t.plan(cases.length)
  cases.map(([js, expected]) => t.equal(f.convert(js), expected, js))
})

test('Array', (t) => {
  const cases = [
    ['z.push(a)', 'z.append(a)'],
    ['z.length', 'len(z)'],
    ['z.splice(0, 1)', 'del z[0]'],
    ['a[a.length - 1]', 'a[-1]'],
  ]
  t.plan(cases.length)
  cases.map(([js, expected]) => t.equal(f.convert(js), expected, js))
})

test('Inline static class attrs', (t) => {
  const cases = [
    ['class A { fun() {return A.id}} A.id = "MyId"', 'class A:\n  def fun(self):\n    return "MyId"\n\n']
  ]
  t.plan(cases.length)
  cases.map(([js, expected]) => t.equal(f.convert(js), expected, js))
})

test.skip('sample code', (t) => {
  t.plan(1)
  const js = fs.readFileSync('./test/samples/sample.js').toString('utf-8')
  const expected = fs.readFileSync('./test/samples/expected.py').toString('utf-8')
  const actual = f.convert(js)
  fs.writeFileSync('./test/samples/actual.py', actual)

  t.equal(actual, expected)
})