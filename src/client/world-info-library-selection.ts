/** Resource-center World Info choices that are not already active in one Session. */

import type { AgentRpProjection } from '../projection-types.ts'
import type { WorldInfoLibraryUpload } from '../world-info-library-protocol.ts'

const LIBRARY_BOOK_ID = /(?:^|:)library:(world-info-[a-f0-9]{32})$/u

/** Return retained World Info ids already represented by the current Session projection. */
export function activeWorldInfoLibraryIds(
  books: AgentRpProjection['worldInfo']['books'],
): ReadonlySet<string> {
  return new Set(books.flatMap((book) => {
    const match = LIBRARY_BOOK_ID.exec(book.id)
    return match?.[1] === undefined ? [] : [match[1]]
  }))
}

/** Exclude every retained source already frozen into the current Session. */
export function availableWorldInfoLibraryUploads(
  uploads: readonly WorldInfoLibraryUpload[],
  books: AgentRpProjection['worldInfo']['books'],
): readonly WorldInfoLibraryUpload[] {
  const active = activeWorldInfoLibraryIds(books)
  return uploads.filter(upload => !active.has(upload.id))
}
