/* eslint-disable @typescript-eslint/no-explicit-any */
// Tolerant accessors: the API returns either a plain array or a paginated page.
export const rows = (d: any): any[] => (Array.isArray(d) ? d : (d?.results ?? []));

/** First defined value among the given keys. */
export const pick = (o: any, ...keys: string[]): any => {
  for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null) return o[k];
  return undefined;
};

/** A readable name from a string or a user-like object. */
export const nameOf = (x: any): string =>
  !x ? '' : typeof x === 'string' ? x : (x.full_name ?? x.name ?? x.email ?? '');

export const idOf = (x: any): string | undefined => (!x ? undefined : typeof x === 'string' ? x : x.id);
