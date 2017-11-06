const isValid = (
  root: {[key: string]: any},
  field: string,
  requireDefined: boolean
) => requireDefined ? root[field] !== undefined : field in root

const getOrElse = (
  root: object,
  dotPath: string,
  orElse: any,
  requireDefined: boolean = false
) => {
  if (root && typeof root === 'object' && dotPath === '') {
    return root
  }

  return dotPath.split('.').reduce((acc, curr, idx) => {
    const ptr = idx === 0 ? root : acc
    const isObject = ptr && typeof ptr === 'object'
    return isObject && isValid(ptr, curr, requireDefined) ? ptr[curr] : orElse
  }, orElse)
}

const multiPathsGetOrElse = (root: object, dotPaths: string[], orElse: any) => {
  const found = dotPaths
    .map(_ => getOrElse(root, _, undefined, true))
    .find(_ => _ !== undefined)
  return found !== undefined ? found : orElse
}

export default (
  root: object,
  dotPath: string | string[],
  orElse: any = undefined
) => {
  return Array.isArray(dotPath) ? multiPathsGetOrElse(root, dotPath, orElse)
    : getOrElse(root, dotPath, orElse)
}

export const getDefinedOrElse = (
  root: object,
  dotPath: string | string[],
  orElse: any = undefined
) => {
  return Array.isArray(dotPath) ? multiPathsGetOrElse(root, dotPath, orElse)
    : getOrElse(root, dotPath, orElse, true)
}

export const getBooleanOr = (
  root: object,
  dotPath: string | string[],
  orElse: any = undefined
): boolean => Boolean(getDefinedOrElse(root, dotPath, orElse))

export const getNumberOr = (
  root: object,
  dotPath: string | string[],
  orElse: any = undefined
): number => Number(getDefinedOrElse(root, dotPath, orElse))

export const getObjectOr = (
  root: object,
  dotPath: string | string[],
  orElse: any = undefined
): object => Object(getDefinedOrElse(root, dotPath, orElse))

export const getStringOr = (
  root: object,
  dotPath: string | string[],
  orElse: any = undefined
): string => Object(getDefinedOrElse(root, dotPath, orElse))
