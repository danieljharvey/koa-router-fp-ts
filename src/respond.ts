/**
 * Helper for sending responses. This ensures that Typescript interprets numbers as number literals so that it matches with the return types properly.
 *
 * @example
 * respond(200, 'OK')
 * respond(201, {name: "Mr Horse"})
 *
 */
export const respond = <Code extends number, Data>(
  code: Code,
  data: Data,
  headers: Record<string, string> = {}
) => ({
  code,
  data,
  headers,
})
