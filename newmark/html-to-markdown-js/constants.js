// html-to-markdown-js/constants.js

export const RenderStatus = {
  SUCCESS: 'SUCCESS',
  TRY_NEXT: 'TRY_NEXT',
};

export const TagType = {
  BLOCK: 'block',
  INLINE: 'inline',
  REMOVE: 'remove',
};

export const Priority = {
  EARLY: 100,
  STANDARD: 500,
  LATE: 1000,
};

// A non-printing, single-byte character used as a temporary marker.
// The original Go library used ASCII BELL ('\a'), which works well here too.
export const ESCAPE_MARKER = '\u0007';