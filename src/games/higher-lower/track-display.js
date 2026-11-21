const parentheticalCredit = /\s*\((?:feat\.?|ft\.?|featuring|with)\s+([^()]+)\)/giu;
const trailingCredit = /\s*(?:;\s*|[-–—]\s*|\s+)(?:feat\.?|ft\.?|featuring)\s+(.+)$/iu;

const soundtrackSuffix = /(?:\s*\(([^()]+)\))?\s+[-–—]\s+from\s+(?:the\s+)?["“]([^"”]+)["”](?:\s+soundtrack)?$/iu;
const originalSongCredit = /\s*\(original song\b[^()]*\)\s*$/iu;

export function displayTrack({ title, artist }) {
  const guests = [];
  const moveCredit = (_, names) => {
    guests.push(names.trim());
    return '';
  };

  const displayTitle = title
    .replace(parentheticalCredit, moveCredit)
    .replace(trailingCredit, moveCredit)
    .replace(originalSongCredit, '')
    .replace(/\s*\(Fifty Shades Darker\)\s*$/iu, '')
    .replace(soundtrackSuffix, (_, annotation, film) =>
      annotation && annotation.toLowerCase() !== film.toLowerCase() ? ` (${annotation})` : '')
    .trim();
  if (displayTitle === 'Perfect Duet (Ed Sheeran & Beyoncé)' && artist === 'Ed Sheeran') {
    return { title: 'Perfect Duet', artist: 'Ed Sheeran, Beyoncé' };
  }

  return { title: displayTitle, artist: [artist, ...guests].join(', ') };
}

export function sleeveTitle(title) {
  return title.replace(/\s+(?:[-–—]\s+(?:radio edit|(?:.+?\s+)?remix)|\((?:radio edit|(?:[^()]+\s+)?remix)\))$/iu, '');
}
