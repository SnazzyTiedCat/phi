// Lesson rows use `source_name` as their unique cache key. Whole-document
// lessons can use the source's exact filename, but section lessons need a
// separate namespace: a real upload named `notes_section_0` must never collide
// with section 0 of an upload named `notes`.

const SECTION_CACHE_PREFIX = "__phi_section__/";

function encodeSourceForCache(source: string) {
  let encoded = "";
  for (let i = 0; i < source.length; i += 1) {
    encoded += source.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return encoded;
}

export function lessonCacheKey(source: string, sectionIndex?: number) {
  if (sectionIndex === undefined) return source;

  // Hex-encoding UTF-16 code units keeps the key slash-free without calling
  // URI encoders that can throw on malformed Unicode in a crafted filename.
  return `${SECTION_CACHE_PREFIX}${encodeSourceForCache(source)}/${sectionIndex}`;
}

export function sectionLessonCachePrefix(source: string) {
  return `${SECTION_CACHE_PREFIX}${encodeSourceForCache(source)}/`;
}

export function legacySectionLessonCacheKey(source: string, sectionIndex: number) {
  return `${source}_section_${sectionIndex}`;
}

export function legacySectionLessonCachePrefix(source: string) {
  return `${source}_section_`;
}

export function isReservedLessonCacheKey(source: string) {
  return source.startsWith(SECTION_CACHE_PREFIX);
}

// Supabase's `.like()` maps to SQL LIKE, where `%`, `_`, and `\` have special
// meaning. Escaping before building a prefix pattern prevents one material from
// deleting another material's lesson cache.
export function escapePostgresLikePattern(value: string) {
  return value.replace(/([\\%_])/g, "\\$1");
}
