export type Method = 'GET' | 'POST'

const methods: Method[] = ['GET', 'POST']

export const combineMethod = (
  a: Method,
  b: Method
): Method => {
  const aIndex = methods.findIndex(i => i === a)
  const bIndex = methods.findIndex(i => i === b)

  if (aIndex === -1 && bIndex === -1) {
    return 'GET'
  }
  const highest = Math.max(aIndex, bIndex)
  return methods[highest]
}
