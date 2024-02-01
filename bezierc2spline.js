/**
 * An object for memoizing vecType functions.
 * @type {Object}
 * @private
 */
let vecTypes = (function () {
  const handler = {
    get: function (obj, prop) {
      if (!obj.hasOwnProperty(prop)) {
        obj[prop] = getVecType(prop)
      }
      return obj[prop]
    }
  }

  return new Proxy({}, handler)
})()

/**
 * A class for fixed-size vectors of numbers.
 * @extends Array
 */
class vecn extends Array {
  /**
   * Creates a vecn of the specified dimension. This should never be called
   * by the user (as if this were an abstract class).
   * @param {number} dimension The dimension of this vector.
   * @param {number[]} [args=[]] The numbers to be put in the vector.
   */
  constructor (dimension, args) {
    args = flattenOuter(args)

    if (!args.every((x) => type(x) === 'Number')) {
      throw new TypeError('All arguments must be numbers.')
    }
    if (args.length > 1 && args.length !== dimension) {
      throw new Error('Argument list must be empty, have a single number, or have a length equal to the dimension.')
    }

    if (args.length === 0) {
      args = [0]
    }
    if (args.length === 1 && type(args[0]) === 'Number') {
      args = Array(dimension).fill(args[0])
    }

    if (dimension > 1) {
      super(...args)
    } else {
      super(1)
      this[0] = args[0]
    }

    Reflect.defineProperty(this, 'pop', {
      value: undefined,
      enumerable: false
    })
    Reflect.defineProperty(this, 'push', {
      value: undefined,
      enumerable: false
    })
    Reflect.defineProperty(this, 'shift', {
      value: undefined,
      enumerable: false
    })
    Reflect.defineProperty(this, 'unshift', {
      value: undefined,
      enumerable: false
    })
  }

  /**
   * The L2 norm (Euclidian norm) of the vector.
   * @type {number}
   */
  get magnitude () {
    return this.pnorm(2)
  }

  // --------------------------------------------------------------------------
  //   Arithmetic

  /**
   * Returns a vector where this is divided by v componentwise. If v is
   * a single number, the vector is scaled by 1/v.
   * @param {number|number[]} v The value to multiply with.
   *
   * @returns {vecn} A new vector with the divided components.
   */
  div (v) {
    checkCompatibility(v, this.dim, true)
    if (type(v) === 'Number') {
      v = (new Array(this.dim)).fill(v)
    }

    let result = []
    for (let i = 0; i < this.length; ++i) {
      result[i] = this[i] / v[i]
    }
    return vecTypes[this.dim](result)
  }

  /**
   * Returns a vector where v is subtracted from the components of this
   * vector. If v is a single number, it is subtracted to each component. If v
   * is a vector, the vectors are combined componentwise.
   * @param {number|number[]} v The value to subtract from this vector.
   *
   * @returns {vecn} A new vector with the combined components.
   */
  minus (v) {
    checkCompatibility(v, this.dim, true)
    if (type(v) === 'Number') {
      v = (new Array(this.dim)).fill(v)
    }

    let result = []
    for (let i = 0; i < this.dim; ++i) {
      result[i] = this[i] - v[i]
    }
    return vecTypes[this.dim](result)
  }

  /**
   * Negates each element in this vector.
   * @returns {vecn} A new vector where all elements are negated.
   */
  neg () {
    return vecTypes[this.dim](this.times(-1))
  }

  /**
   * Returns a vector where v is added to the components of this vector. If v
   * is a single number, it is added to each component. If v is a vector, the
   * vectors are added componentwise.
   * @param {number|number[]} v The value to add to this vector.
   *
   * @returns {vecn} A new vector with the summed components.
   */
  plus (v) {
    checkCompatibility(v, this.dim, true)
    if (type(v) === 'Number') {
      v = (new Array(this.dim)).fill(v)
    }

    let result = []
    for (let i = 0; i < this.dim; ++i) {
      result[i] = this[i] + v[i]
    }
    return vecTypes[this.dim](result)
  }

  /**
   * Returns a vector where each component of this was raised to a power p.
   * @param {number} p The power to raise each component by.
   *
   * @returns {vecn} A new vector with the exponentiated components.
   */
  pow (p) {
    let result = []
    for (let i = 0; i < this.dim; ++i) {
      result[i] = Math.pow(this[i], p)
    }
    return vecTypes[this.dim](result)
  }

  /**
   * Returns a vector where v and this are multiplied componentwise. If v is
   * a single number, the vector is scaled by v.
   * @param {number|number[]} v The value to multiply with.
   *
   * @returns {vecn} A new vector with the multiplied components.
   */
  times (v) {
    checkCompatibility(v, this.dim, true)
    if (type(v) === 'Number') {
      v = (new Array(this.dim)).fill(v)
    }

    let result = []
    for (let i = 0; i < this.dim; ++i) {
      result[i] = this[i] * v[i]
    }
    return vecTypes[this.dim](result)
  }

  // --------------------------------------------------------------------------
  //   Vector Operations

  /**
   * Dot product of two vectors.
   * @param {number[]} v The vector to dot with this one.
   *
   * @returns {number} The dot product between this and v.
   */
  dot (v) {
    checkCompatibility(v, this.dim)

    let result = 0
    for (let i = 0; i < this.dim; ++i) {
      result += this[i] * v[i]
    }
    return result
  }

  /**
   * Scales this vector to a magnitude of 1.
   *
   * @returns {vecn} A new vector with scaled components.
   */
  normalize () {
    return this.div(this.magnitude)
  }

  /**
   * Evaluates the p-norm (or lp-norm) of this vector.
   * @param {number} p The p-value to evaluate.
   *
   * @returns {number} The norm of this vector.
   */
  pnorm (p) {
    let result = 0
    for (let i = 0; i < this.dim; ++i) {
      result += Math.pow(Math.abs(this[i]), p)
    }
    return Math.pow(result, 1 / p)
  }

  /**
   * Reflects this vector across the provided vector. The normal can be imagined
   * as a surface normal or as describing a hyperpalane.
   * @param {number[]} normal A vector describing the hyperplane to reflect off of.
   *
   * @returns {vecn} The reflected vector.
   */
  reflect (normal) {
    const n = normal.normalize()
    return this.minus(n.times(2 * this.dot(n)))
  }

  // --------------------------------------------------------------------------
  //   Extras

  /**
   * Finds the indices of the max value in this vector.
   *
   * @returns {number[]} An array of indices corresponding to the max values.
   */
  argmax () {
    const maxVal = this.max()
    return this.reduce((acc, x, i) => x === maxVal ? acc.concat([i]) : acc, [])
  }

  /**
   * Finds the indices of the min value in this vector.
   *
   * @returns {number[]} An array of indices corresponding to the min values.
   */
  argmin () {
    const minVal = this.min()
    return this.reduce((acc, x, i) => x === minVal ? acc.concat([i]) : acc, [])
  }

  /**
   * Creates a new vector from the provided indices of this one. Basically
   * equivalent to swizzling.
   * @param {number[]} indices The indices to select into a new vector.
   *
   * @returns {vecn} A new vector from the provided indices.
   */
  choose (indices) {
    if (!Array.isArray(indices)) {
      throw new TypeError('Argument must be a list of indices.')
    }
    if (!indices.every((i) => i < this.dim && isIndex(i.toString()))) {
      throw new RangeError('All elements of argument must be valid indices.')
    }

    let v = []
    indices.forEach((i) => v.push(this[i]))
    return vecTypes[v.length](v)
  }

  /**
   * Creates a duplicate of this vector. Same as passing this vector through
   * the factory that created it.
   *
   * @returns {vecn} A deep copy of this vector.
   */
  copy () {
    return vecTypes[this.dim](this)
  }

  /**
   * Returns whether every element in each vector is equal.
   * @param {number[]} v A vector to test against.
   *
   * @returns {boolean} True if both vectors have the same dimension and values.
   */
  equals (v) {
    return v.length === this.dim && v.every((x, i) => this[i] === x)
  }

  /**
   * Returns whether every element in each vector is approximately equal.
   * @param {number[]} v A vector to test against.
   * @param {number} epsilon The largest meaningful difference between two values.
   *
   * @returns {boolean} True if both vectors have the same dimension and the
   * distance between each number is less than epsilon.
   */
  approximatelyEquals (v, epsilon = 0.00000001) {
    return v.length === this.dim && v.every((x, i) => Math.abs(this[i] - x) < epsilon)
  }

  /**
   * Returns the max value of this vector.
   *
   * @returns {number} The max value of this vector.
   */
  max () {
    return Math.max(...this)
  }

  /**
   * Returns the min value of this vector.
   *
   * @returns {number} The min value of this vector.
   */
  min () {
    return Math.min(...this)
  }

  /**
   * Sums the components of this vector.
   *
   * @returns {number} The sum of the components of this vector.
   */
  sum () {
    return this.reduce((acc, x) => acc + x, 0)
  }

  /**
   * Converts this vector into an Array.
   *
   * @returns {number[]} An array of the contents of this vector.
   */
  toArray () {
    return Array.from(this)
  }

  // --------------------------------------------------------------------------
  //   Array Overrides

  /**
   * Same as Array.prototype.concat, but return value is of a new vecType.
   *
   * @returns {vecn}
   */
  concat (...args) {
    const result = super.concat.apply(this.toArray(), args)
    return vecTypes[result.length](result)
  }

  /**
   * Same as Array.prototype.filter, but returns an Array if the result has 0
   * entries.
   *
   * @returns {vecn|number[]}
   */
  filter (...args) {
    const result = super.filter.apply(this.toArray(), args)
    if (result.length > 0) {
      return vecTypes[result.length](result)
    }
    return result
  }

  /**
   * Same as Array.prototype.map, but returns an Array if the result contains
   * non-numbers.
   *
   * @returns {vecn|Array}
   */
  map (...args) {
    const result = super.map(...args)
    if (result.every((x) => type(x) === 'Number')) {
      return result
    }
    return result.toArray()
  }

  /**
   * Same as Array.prototype.slice, but returns an Array if the result has 0
   * entries.
   */
  slice (...args) {
    const result = super.slice.apply(this.toArray(), args)
    if (result.length > 0) {
      return vecTypes[result.length](result)
    }
    return result
  }

  /**
   * A restrictive version of the Array.prototype.splice that requires all
   * removed elements to be replaced.
   */
  splice (...args) {
    let test = this.toArray()
    test.splice(...args)

    if (test.length !== this.dim) {
      throw new Error('All removed elements must be replaced.')
    }
    if (!test.every((x) => type(x) === 'Number')) {
      throw new TypeError('All elements must be numbers.')
    }

    test.forEach((x, i) => { this[i] = x })
  }

  toString () {
    return this.reduce((s, x, i) => {
      return s + x + (i === this.dim - 1 ? ' ' : ', ')
    }, '[ ') + ']'
  }
}

// --------------------------------------------------------------------------
//   General Tools

/**
 * Adds an arbitrary number of vectors together. All vectors must be of the same
 * dimension.
 * @param {...vecn} vecs Vectors to add together.
 *
 * @returns {vecn} The sum of all the provided vectors.
 */
function add (...vecs) {
  const dim = vecs[0].dim
  if (!vecs.every((v) => v.dim === dim)) {
    throw new TypeError('All vectors must have the same dimension.')
  }
  return vecs.reduce((acc, v) => acc.plus(v), vecTypes[dim]())
}

/**
 * The validator to be used in the proxy for all vec objects. Catches swizzling
 * properties, makes sure assignment only works for indices, and disallows
 * non-numerical assignments. Used in getVecType.
 * @constant
 * @type {Object}
 * @private
 */
const validator = {
  set: function (obj, prop, value) {
    if (prop === 'length') {
      return false
    }
    if (isIndex(prop)) {
      if (Number(prop) >= obj.dim) {
        throw new RangeError('Vector may not have more elements than dimension.')
      } else if (type(value) !== 'Number') {
        throw new TypeError('Vectors may only contain numbers.')
      } else {
        obj[prop] = value
        return true
      }
    }

    const swizzleSymbolMap = getSwizzleSymbolMap(prop.toString())
    if (obj.dim <= 4 && swizzleSymbolMap) {
      swizzleSet(obj, prop.toString(), swizzleSymbolMap, value)
      return true
    }

    return false
  },
  get: function (obj, prop) {
    const swizzleSymbolMap = getSwizzleSymbolMap(prop.toString())
    if (obj.dim <= 4 && swizzleSymbolMap) {
      return swizzleGet(obj, prop, swizzleSymbolMap)
    }

    return obj[prop]
  }
}

/**
 * Returns a factory function for vectors of the specified dimension.
 * @param {number} dim The dimension of the new vector type.
 *
 * @returns {Function} A factory (not a constructor) for creating new vecs.
 */
function getVecType (dim) {
  dim = Number(dim)

  if (!(dim in vecTypes)) {
    if (isNaN(dim)) throw new TypeError('Dimension must be coercible to a number.')
    if (dim <= 0) throw new RangeError('Dimension must be positive.')
    if (!Number.isInteger(dim)) throw new RangeError('Dimension must be positive.')

    // Doing a little bit of exploiting ES6 to dynamically name the class
    let classname = 'vec' + dim
    let VecType = ({[classname]: class extends vecn {
      constructor (...args) {
        if (args.length === 1 && args[0] instanceof vecn) {
          if (args[0].dim > dim) {
            throw new TypeError('Cannot demote vectors.')
          }
          args = promoteArrayDimension(args[0].toArray(), dim)
        }
        super(dim, args)
        Reflect.defineProperty(this, 'dim', {
          value: dim,
          writable: false,
          enumerable: false
        })
      }
    }})[classname]

    let factory = function factory (...args) {
      let target = new VecType(...args)
      Object.preventExtensions(target)
      return new Proxy(target, validator)
    }
    vecTypes[dim] = factory
  }

  return vecTypes[dim]
}

/**
 * The correct function for determining whether an object is a vecn.
 * @param {*} v The object in question.
 *
 * @returns {boolean} True if the object is an instance of vecn.
 */
function isVec (v) {
  return v instanceof vecn
}

/**
 * Linearly interpolates between two vectors.
 * @param {vecn} v1 The starting vector.
 * @param {vecn} v2 The ending vector.
 * @param {number} t The interpolant, which is clamped to the inteval [0, 1].
 *
 * @returns {vecn} The interpolated vector.
 */
function lerp (v1, v2, t) {
  if (v1.dim !== v2.dim) throw new TypeError('Vectors must have the same dimension.')
  t = t < 0 ? 0 : (t > 1 ? 1 : t)
  return v1.plus(v2.minus(v1).times(t))
}

/**
 * Multiplies an arbitrary number of vectors together. All vectors must be of the same
 * dimension.
 * @param {...vecn} vecs Vectors to multiply together.
 *
 * @returns {vecn} The product of all the provided vectors.
 */
function multiply (...vecs) {
  const dim = vecs[0].dim
  if (!vecs.every((v) => v.dim === dim)) throw new TypeError('All vectors must have the same dimension.')
  return vecs.reduce((acc, v) => acc.times(v), vecTypes[dim](1))
}

/**
 * Spherically interpolates between two vectors.
 * @param {vecn} v1 The starting vector.
 * @param {vecn} v2 The ending vector.
 * @param {number} t The interpolant, which is clamped to the inteval [0, 1].
 *
 * @returns {vecn} The interpolated vector.
 */
function slerp (v1, v2, t) {
  if (v1.dim !== v2.dim) throw new TypeError('Vectors must have the same dimension.')

  t = t < 0 ? 0 : (t > 1 ? 1 : t)
  let dot = v1.normalize().dot(v2.normalize())
  dot = dot < -1 ? -1 : (dot > 1 ? 1 : dot)
  const theta = Math.acos(dot) * t
  const relative = v2.minus(v1.times(dot)).normalize()
  const magnitude = v1.magnitude + ((v2.magnitude - v1.magnitude) * t)
  return v1.times(Math.cos(theta)).plus(relative.times(Math.sin(theta)))
    .normalize().times(magnitude)
}

// --------------------------------------------------------------------------
//   Swizzling

/**
 * The index corresponding to common names for indexing vectors.
 * @constant
 * @type {Object}
 * @private
 */
const namedIndices = [
  {x: 0, y: 1, z: 2, w: 3},
  {r: 0, g: 1, b: 2, a: 3},
  {s: 0, t: 1, p: 2, q: 3}
]

/**
 * Gets the set of symbols corresponding to indices used for swizzling.
 * @private
 * @param {string} s The string used as a property to swizzle.
 *
 * @returns {Object} A map from characters to indices.
 */
function getSwizzleSymbolMap (s) {
  return namedIndices.find((map) => {
    return s.split('').every((c) => c in map)
  })
}

/**
 * Creates a new vector from the named indices given by swizzling.
 * @private
 * @param {vecn} v The vector to pull data from. The dimension is assumed to be
 * 2, 3, or 4, but this isn't enforced here.
 * @param {string} s The property being used to swizzle (e.g. 'xxy' or 'z').
 * @param {Object} set A map from characters to indices (assumed to be valid).
 *
 * @returns {undefined|number|vecn} Either undefined (if s isn't a valid swizzle
 * string), a number (if s has a length of 1), or a vecn where the values have
 * been rearranged according to the order given in s.
 */
function swizzleGet (v, s, set) {
  const newDim = s.length

  if (newDim === 1) {
    return v[set[s]]
  }

  let values = s.split('').reduce((acc, x) => {
    let i = set[x]
    return acc && i < v.dim ? acc.concat([v[i]]) : undefined
  }, [])
  return values ? new vecTypes[newDim](...values) : undefined
}

/**
 * Assigns the indexed values in v to the values in newVals in the order they
 * are described in in s.
 * @private
 * @param {vecn} v The starting vector.
 * @param {string} s The property being used to swizzle (e.g. 'xyz' or 'xz').
 * @param {Object} map A map from characters to indices (assumed to be valid).
 * @param {number|number[]} newVals The right hand side of the assignment
 *
 * @returns {vecn} A copy of v with the correct elements replaced.
 */
function swizzleSet (v, s, map, newVals) {
  if (s.length === 1) {
    if (type(newVals) !== 'Number') {
      throw new TypeError('Must set to a number')
    }
    v[map[s]] = newVals
    return
  }

  if (!Array.isArray(newVals)) throw new TypeError('Right-hand side must be an array.')
  if (s.length !== newVals.length) throw new TypeError('Right-hand side must have matching length.')
  if (!newVals.every((item) => type(item) === 'Number')) throw new TypeError('All new values must be numbers.')

  if (s.split('').some((c) => map[c] >= v.dim)) {
    return
  }

  let valid = true
  for (let i = 0, unique = {}; i < s.length; ++i) {
    if (unique.hasOwnProperty(s[i])) {
      valid = false
      break
    }
    unique[s[i]] = true
  }
  if (!valid) throw new SyntaxError('Swizzle assignment does not allow symbols to be repeated.')

  s.split('').map((c) => map[c]).forEach((index, i) => { v[index] = newVals[i] })
}

// --------------------------------------------------------------------------
//   Helpers

/**
 * Checks whether something is valid to do vector operations with and throws
 * a TypeError if not.
 * @private
 * @param {*} o An object to check.
 * @param {number} dim The dimension to check against.
 * @param {boolean} [numberValid=false] Whether scalars are compatible for the operation.
 */
function checkCompatibility (o, dim, numberValid = false) {
  if (numberValid && type(o) === 'Number') {
    return
  } else if (o.length && o.length === dim) {
    return
  }
  throw new TypeError(`Invalid argument. Input must have matching dimension${numberValid ? 'or be a scalar' : ''}.`)
}

/**
 * Removes outer arrays and returns a reference to the innermost array. For
 * example, [[1, 2]] becomes [1, 2]. [[[['a'], true]]] becomes [['a'], true].
 * @private
 * @param {Array} arr The array to flatten.
 *
 * @returns {Array} A reference to the innermost array in arr.
 */
function flattenOuter (arr) {
  if (!(arr instanceof Array) || arr.length !== 1) {
    return arr
  }
  if (arr[0] instanceof Array) {
    return flattenOuter(arr[0])
  }
  return arr
}

/**
 * Checks whether a provided string can be used as a valid index into an array.
 * @private
 * @param {string} n A string representation of the number in question.
 *
 * @returns {boolean} True if n can be used to index an array.
 */
function isIndex (n) {
  return !isNaN(n) &&
         Number(n).toString() === n &&
         Number.isInteger(Number(n)) &&
         Number(n) >= 0
}

/**
 * Lengthens an exsting array and fills new entries with 0 (does not mutate).
 * @private
 * @param {Array} arr The source array.
 * @param {number} dim The dimension of the new array.
 *
 * @returns {Array} A new array with length dim and arr as a prefix.
 */
function promoteArrayDimension (arr, dim) {
  return [...Array(dim)].map((_, i) => i < arr.length ? arr[i] : 0)
}

/**
 * Returns a string representing the type of an object. Similar to typeof, but
 * better with wrapped primitives, null, Array, etc...
 * @private
 * @param {*} obj The object to check the type of.
 *
 * @returns {string} A capitalized string describing the perceived type (i.e. 'Number', 'Array', etc...)
 */
function type (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1)
}








/**
 * Solves for all real roots of a cubic function of the form ax^3 + bx^2 + cx + d.
 * @private
 * @param {number} a The coefficient of the third-degree term.
 * @param {number} b The coefficient of the second-degree term.
 * @param {number} c The coefficient of the first-degree term.
 * @param {number} d The constant term.
 *
 * @returns {number[]} A list of all real roots of the described function.
 */
function solveCubic (a, b, c, d) {
  if (a === 0) {
    return solveQuadratic(b, c, d)
  }

  let D = a * b * c * d * 18
  D -= Math.pow(b, 3) * d * 4
  D += Math.pow(b, 2) * Math.pow(c, 2)
  D -= a * Math.pow(c, 3) * 4
  D -= Math.pow(a, 2) * Math.pow(d, 2) * 27

  let D0 = Math.pow(b, 2) - (a * c * 3)

  if (D === 0) {
    if (D0 === 0) {
      let root1 = -b / (a * 3)
      return [root1]
    } else {
      let root1 = a * b * c * 4
      root1 -= a * a * d * 9
      root1 -= b * b * b
      root1 /= a * D0

      let root2 = ((a * d * 9) - b * c) / (D0 * 2)

      return [root1, root2]
    }
  } else {
    let f = ((3 * (c / a)) - ((Math.pow(b, 2)) / (Math.pow(a, 2)))) / 3
    let g = (2 * (Math.pow(b, 3)) / (Math.pow(a, 3)))
    g -= 9 * b * c / Math.pow(a, 2)
    g += 27 * d / a
    g /= 27
    let h = (Math.pow(g, 2) / 4) + (Math.pow(f, 3) / 27)

    if (h > 0) {
      let R = -(g / 2) + Math.sqrt(h)
      let S = Math.cbrt(R)
      let T = -(g / 2) - Math.sqrt(h)
      let U = Math.cbrt(T)
      let root1 = (S + U) - (b / (3 * a))

      return [root1]
    } else {
      let i = Math.sqrt((Math.pow(g, 2) / 4) - h)
      let j = Math.cbrt(i)

      let k = Math.acos(-g / (2 * i))
      let L = -j
      let M = Math.cos(k / 3)
      let N = Math.sqrt(3) * Math.sin(k / 3)
      let P = -b / (3 * a)

      let root1 = 2 * j * Math.cos(k / 3) - (b / (3 * a))
      let root2 = (L * (M + N)) + P
      let root3 = (L * (M - N)) + P

      return [root1, root2, root3]
    }
  }
}

/**
 * Solves for all real roots of a quadratic function of the form ax^2 + bx + c.
 * @private
 * @param {number} a The coefficient of the second-degree term.
 * @param {number} b The coefficient of the first-degree term.
 * @param {number} c The constant term.
 *
 * @returns {number[]} A list of all real roots of the described function.
 */
function solveQuadratic (a, b, c) {
  if (a === 0) {
    return solveLinear(b, c)
  }
  let d = Math.sqrt((b * b) - (4 * a * c))
  let root1 = (-b - d) / (2 * a)
  let root2 = (-b + d) / (2 * a)
  return [root1, root2]
}

/**
 * Solves for all real roots of a linear function of the form ax + b. If there
 * are zero or infinitely many solutions, an empty array is returned.
 * @private
 * @param {number} a The coefficient of the first-degree term.
 * @param {number} b The constant term.
 *
 * @returns {number[]} A list of all real roots of the described function.
 */
function solveLinear (a, b) {
  if (a === 0) {
    return []
  }
  return [-b / a]
}





/**
 * A class with a couple helper functions for working with Bezier curves in
 * multiple dimensions. Array-like with 4 elements.
 */
class BezierCurve {
  /**
   * Creates a curve from control points.
   * @param {number[][]} controlPoints The control points that define a Bezier curve
   */
  constructor (controlPoints) {
    controlPoints = controlPoints[0].length ? controlPoints : controlPoints.map((n) => [n])

    Reflect.defineProperty(this, 'length', {
      value: 4,
      enumerable: false,
      writable: false
    })

    for (let i = 0; i < this.length; ++i) {
      this[i] = Array.from(controlPoints[i])
    }
  }

  /**
   * Evaluates the bezier curve at the given value of t.
   * @param {number} t The parameter to plug in. (Clamped to the interval [0, 1])
   *
   * @returns {number[]} The point at which t equals the provided value.
   */
  at (t) {
    t = t < 0 ? 0 : (t > 1 ? 1 : t)

    let vec = getVecType(this[0].length)
    let controlPoints = [...new Array(4)].map((_, i) => vec(this[i]))

    let terms = []
    terms.push(controlPoints[0].times(Math.pow(1 - t, 3)))
    terms.push(controlPoints[1].times(3 * Math.pow(1 - t, 2) * t))
    terms.push(controlPoints[2].times(3 * (1 - t) * Math.pow(t, 2)))
    terms.push(controlPoints[3].times(Math.pow(t, 3)))

    return add(...terms).toArray()
  }

  /**
   * Finds all values of t for which a particular dimension is equal to a particular value.
   * @param {number} [axis=0] The index of the axis along which to solve (i.e. if your vectors are [x, y, z], 0 means solve for when x = value).
   * @param {number} [value=0] The value to solve for (i.e. the Bezier cubic is on the left of an equation and this value is on the right).
   *
   * @returns {number[]} All real roots of the described equation on the interval [0, 1].
   */
  solve (axis = 0, value = 0) {
    let points = Array.prototype.map.call(this, (v) => v[axis])

    let a = -points[0] + (3 * points[1]) - (3 * points[2]) + points[3]
    let b = (3 * points[0]) - (6 * points[1]) + (3 * points[2])
    let c = -(3 * points[0]) + (3 * points[1])
    let d = points[0] - value

    return solveCubic(a, b, c, d)
      .map((r) => r === 0 ? 0 : r)
      .filter((t) => t >= 0 && t <= 1)
      .sort()
  }
}







/**
 * Solves a matrix equation Ax = d for x where A is a tridiagonal square matrix.
 * @private
 * @param {number[]|number[][]} a The (i-1)th entry of each row. The first element does not exist, but must still be input as a number or vector. 0 is adequate.
 * @param {number[]|number[][]} b The diagonal entry of each row.
 * @param {number[]|number[][]} c The (i+1)th entry of each row. The last element does not exist, but must still be input as a number or vector. 0 is adequate.
 * @param {number[]|number[][]} d The resultant vector in the equation.
 *
 * @returns {number[][]}
 */
function thomas (a, b, c, d) {
  const dim = d[0].length ? d[0].length : 1
  const vec = getVecType(dim)
  const n = d.length

  a = a.map((x) => vec(x))
  b = b.map((x) => vec(x))
  c = c.map((x) => vec(x))
  d = d.map((x) => vec(x))

  let dp = []
  let cp = []

  cp.push(c[0].div(b[0]))
  dp.push(d[0].div(b[0]))
  for (let i = 1; i < n; ++i) {
    cp.push(c[i].div(b[i].minus(a[i].times(cp[i - 1]))))
    dp.push((d[i].minus(a[i].times(dp[i - 1]))).div(b[i].minus(a[i].times(cp[i - 1]))))
  }

  let x = new Array(n)
  x[n - 1] = dp[n - 1]
  for (let i = n - 2; i >= 0; --i) {
    x[i] = dp[i].minus(cp[i].times(x[i + 1]))
  }

  return x
}








/**
 * A function that calculates the weight to be assigned to the "speed" of curve `i`.
 * @callback weightsCallback
 * @param {number} i The index of the knot at the end of the curve to be weighted. Integers on [1, n-1].
 * @param {number[][]} knots The knots provided to the spline. More specifically, each point is a `vecn` (see module of the same name).
 *
 * @returns {number} The scalar that will modify the "starting speed" at the start of this curve. Higher numbers means the curve is more strongly pulled in the direction of tangency at the first knot in the curve.
 */
const distanceRatio = (i, knots) => {
  let w1 = knots[i].minus(knots[i - 1]).magnitude
  let w2 = knots[i + 1].minus(knots[i]).magnitude
  return w1 / w2
}

/**
 * Creates cubic splines given knots.
 */
class BezierSpline {
  /**
   * Creates a new spline.
   * @param {number[][]} knots A list of points of equal dimension that the spline will pass through.
   * @param {weightsCallback|number[]} weights A callback that calculates weights for a given segment or precalculated weights in an array. The first element of the array will be ignored.
   */
  constructor (knots = [], weights = distanceRatio) {
    this.weights = weights
    this.knots = []
    this.curves = []
    if (knots.length > 0) {
      this.setKnots(knots)
    }
  }

  /**
   * Recalculates the control points of the spline. Runs on the order of O(n)
   * operations where n is the number of knots.
   */
  recalculate () {
    const n = this.knots.length

    this.curves = []
    if (n < 3) return

    let k = new Array(n)
    for (let i = 1; i < n - 1; ++i) {
      k[i] = Array.isArray(this.weights) ? this.weights[i] : this.weights(i, this.knots)
    }

    let a = new Array(n - 1)
    let b = new Array(n - 1)
    let c = new Array(n - 1)
    let d = new Array(n - 1)

    a[0] = 0
    b[0] = 2
    c[0] = k[1]
    d[0] = this.knots[0].plus(this.knots[1].times(1 + k[1]))
    for (let i = 1; i < n - 2; ++i) {
      a[i] = 1
      b[i] = 2 * (k[i] + (k[i] * k[i]))
      c[i] = k[i + 1] * k[i] * k[i]
      d[i] = this.knots[i].times(1 + (2 * k[i]) + (k[i] * k[i]))
        .plus(this.knots[i + 1].times(1 + k[i + 1]).times(k[i] * k[i]))
    }
    a[n - 2] = 1
    b[n - 2] = (2 * k[n - 2]) + (1.5 * k[n - 2] * k[n - 2])
    c[n - 2] = 0
    d[n - 2] = this.knots[n - 2].times(1 + (2 * k[n - 2]) + (k[n - 2] * k[n - 2]))
      .plus(this.knots[n - 1].times(0.5 * k[n - 2] * k[n - 2]))

    let p1s = thomas(a, b, c, d)
    let p2s = []
    for (let i = 0; i < n - 2; ++i) {
      p2s.push(this.knots[i + 1].minus(p1s[i + 1].minus(this.knots[i + 1]).times(k[i + 1])))
    }
    p2s.push(this.knots[n - 1].plus(p1s[n - 2]).times(0.5))

    for (let i = 0; i < n - 1; ++i) {
      this.curves.push(new BezierCurve([this.knots[i], p1s[i], p2s[i], this.knots[i + 1]]))
    }
  }

  /**
   * The easiest way to change the spline's knots. Knots are kept as special
   * vector types, so setting an entire knot may break the program. Alternately,
   * you can read the documentation for vecn and manipulate the knots yourself.
   * @param {number[][]} newKnots A list of points of equal dimension that the spline will pass through.
   */
  setKnots (newKnots) {
    const vec = getVecType(newKnots[0].length)
    newKnots = newKnots.map((v) => vec(v))
    this.knots = newKnots
    this.recalculate()
  }

  /**
   * Gets all the points on the spline that match the query.
   * @example
   * spline.getPoints(0, 10)   // Returns all points on the spline where x = 10
   * @example
   * spline.getPoints(2, -2)   // Returns all points on the spline where z = -2
   * @param {number} axis The index of the axis along which to solve (i.e. if your vectors are [x, y, z], 0 means solve for when x = value).
   * @param {number} value The value to solve for (i.e. a Bezier cubic is on the left of an equation and this value is on the right).
   *
   * @returns {number[][]} A list of all points on the spline where the specified axis is equal to the specified value.
   */
  getPoints (axis, value) {
    return this.curves.map((curve) => {
      return curve.solve(axis, value).map((t) => curve.at(t))
    }).reduce((acc, points) => {
      return acc.concat(points)
    }, []).reduce((acc, point) => {
      return acc.some((p) => p.every((n, i) => Math.min(n, point[i]) / Math.max(n, point[i]) > 0.999)) ? acc : acc.concat([point])
    }, []).map((v) => Array.from(v))
  }
}

