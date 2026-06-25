# PyPath Curriculum Plan

**Total Topics:** 36 (12 Beginner + 12 Intermediate + 12 Advanced)
**Total Estimated Learning Time:** ~590 minutes (~9.8 hours)

---

## Beginner Tier — 12 topics

> Start here. Zero programming experience required. By the end you'll build a working program using everything you've learned.

| # | Topic | Time | What You'll Learn |
|---|-------|------|-------------------|
| 1 | Introduction to Python | 10m | What Python is, why it's great, and writing your first line of code |
| 2 | Variables | 15m | Storing data with variables and understanding assignment |
| 3 | Numbers and Math | 15m | Integers, floats, and arithmetic operators |
| 4 | Strings and Text | 15m | Creating strings, concatenation, f-strings, and basic methods |
| 5 | Getting User Input | 10m | Reading keyboard input with `input()` |
| 6 | Booleans and Comparisons | 10m | `True`/`False`, comparison operators (`==`, `>`, `<`, etc.) |
| 7 | Making Decisions | 15m | `if`/`elif`/`else` to control what your program does |
| 8 | Loops and Repetition | 20m | `for` loops, `while` loops, and `range()` |
| 9 | Functions | 20m | Writing reusable code blocks with `def`, parameters, and return values |
| 10 | Lists | 15m | Ordered collections, indexing, slicing, and modifying |
| 11 | Dictionaries | 15m | Key-value pairs, lookup, and dictionary methods |
| 12 | Beginner Capstone Project | 25m | Build a complete program like a calculator or number guessing game in a final challenge |

---

## Intermediate Tier — 12 topics

> You can write simple programs. Now learn to organize, handle errors, work with files, and use Python's standard library.

| # | Topic | Time | What You'll Learn |
|---|-------|------|-------------------|
| 1 | Tuples | 15m | Immutable sequences, unpacking, and when to prefer tuples over lists |
| 2 | Sets | 15m | Unordered unique collections, set operations (union, intersection) |
| 3 | List and Dict Comprehensions | 20m | Concise one-liner patterns for creating collections |
| 4 | String Formatting in Depth | 15m | f-strings, `.format()`, alignment, and advanced string methods |
| 5 | Reading and Writing Files | 20m | `open()`, read/write/append modes, and working with file paths |
| 6 | Error Handling with Try and Except | 20m | Catching exceptions, `try`/`except`/`else`/`finally`, and raising errors |
| 7 | Modules and Imports | 20m | `import` statements, `from` imports, and creating your own modules |
| 8 | The Random Module | 15m | `randint()`, `choice()`, `shuffle()`, and `sample()` |
| 9 | Working with Dates and Time | 15m | `datetime` objects, formatting dates, and time arithmetic |
| 10 | The Math Module | 10m | `sqrt()`, `ceil()`, `floor()`, `pi`, and common math utilities |
| 11 | Useful Built-in Functions | 15m | `enumerate`, `zip`, `sorted`, `map`, `filter`, `any`, `all` |
| 12 | The OS Module | 15m | File paths, directory listing, environment variables, and system info |

---

## Advanced Tier — 12 topics

> You're comfortable with Python. Time to master OOP, functional patterns, and the most powerful parts of the standard library.

| # | Topic | Time | What You'll Learn |
|---|-------|------|-------------------|
| 1 | Classes and Objects | 25m | `class`, `__init__`, `self`, instance/class/static methods |
| 2 | Inheritance and Polymorphism | 20m | Subclassing, `super()`, method overriding, and `isinstance()` |
| 3 | Magic Methods | 15m | `__str__`, `__repr__`, `__add__`, `__eq__`, `__len__`, and more |
| 4 | Decorators | 20m | The `@` syntax, writing your own decorators, and `functools.wraps` |
| 5 | Generators and Iterators | 25m | `yield`, generator expressions, `__iter__`/`__next__` protocol |
| 6 | Context Managers | 15m | The `with` statement, `__enter__`/`__exit__`, and `contextlib` |
| 7 | Lambda Functions | 10m | Anonymous functions with `lambda` and when to use them |
| 8 | Variable Arguments | 10m | `*args`, `**kwargs`, unpacking, and flexible function signatures |
| 9 | Regular Expressions | 20m | Pattern matching with `re.search`, `re.findall`, groups, and flags |
| 10 | Working with JSON | 15m | `json.dumps()`, `json.loads()`, reading/writing JSON files |
| 11 | The Collections Module | 20m | `deque`, `Counter`, `defaultdict`, `namedtuple`, and `OrderedDict` |
| 12 | The Itertools Module | 20m | `chain`, `cycle`, `product`, `permutations`, `combinations`, `groupby` |

---

## Design Notes & Decisions

### Existing topics preserved
- Beginner topics `introduction`, `variables`, and `functions` are kept exactly as-is (per requirement).
- Topics `lists` and `dicts` moved from Intermediate → Beginner (they're foundational).
- Topics `classes` and `modules` — classes stays in Advanced (as the first topic, now expanded); modules moved to Intermediate.

### Pedagogical ordering rationale
- **Beginner** follows: data (variables → numbers → strings) → input → comparison → decision → repetition → functions → collections → project. Functions is taught after loops so students can write meaningful loop-based examples inside their functions.
- **Intermediate** starts with new data structures (tuples, sets), then comprehensions, then practical skills (formatting, files, errors, modules), then guided tours of the stdlib.
- **Advanced** starts with OOP foundations, builds through inheritance and magic methods, then covers functional/decorator patterns, then practical tools (regex, JSON), then stdlib deep-dives.

### Topics I was uncertain about
1. **Capstone project as a "topic"** — It doesn't teach new concepts, but having a dedicated integration project at the end of each tier (or at least beginner) gives learners a sense of accomplishment. I included it for Beginner only.
2. **`builtins` as a single topic** — Enumerate, zip, sorted, map, filter, any, all is a lot for one lesson. Could be split, but they're all small individual concepts that benefit from being seen together.
3. **Generators + Iterators combined** — Each is substantial on its own, but they're deeply related (generators are a kind of iterator). Combined to save a slot for itertools.
4. **`math` module as standalone** — It's very small (`sqrt`, `ceil`, `floor`, `pi`). Worth having as a 10-minute quick-hit topic for completeness.
5. **`args` module as standalone** — `*args`/`**kwargs` is a small concept but important enough for a dedicated 10-minute lesson.
