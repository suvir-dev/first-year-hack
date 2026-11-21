# Artwork images

Put artwork images in this folder. A file here called `mona-lisa.jpg` is
loaded by the app as `/paintings/mona-lisa.jpg`. The file names must match the
`imageUrl` values in `src/paintings.ts`.

**Where each image came from, and its licence, is listed in `CREDITS.md`**
(section "Artworks"). Images are resized to at most 1200 px on the long side.

## The rules for adding an artwork

- **One person** (solo) or **two people** (duet) with clear poses you can copy.
  Never 3 or more. No nude figures.
- **Public domain**: the artist died more than 70 years ago.
- The **image file** must be free to use too: public domain, CC0, or CC BY /
  CC BY-SA (then credit the photographer in `CREDITS.md`).
- Good sources: **Wikimedia Commons** (https://commons.wikimedia.org, check the
  licence box on the file page), the **Cleveland Museum of Art Open Access**
  (https://www.clevelandart.org/open-access, CC0), the **National Gallery of Art**
  (https://www.nga.gov/open-access-images.html), the **Art Institute of Chicago**
  (https://www.artic.edu/collection, "Public domain" filter).

Then make its target pose with the pose picker (main README, "Making a target
pose"), and add it to `src/paintings.ts` and `CREDITS.md`.

## Works still to add

Wikimedia Commons kept blocking our downloads ("429 Too Many Requests"), so
these are **not in the app yet**. To add one: open https://commons.wikimedia.org,
search for the file name, download it, save it here under the suggested name,
resize it (`sips -Z 1200 file.jpg` on a Mac), then make its figures with the
pose picker (choose "2 (duet)" for the duets).

Keep it family-friendly: no nude figures.

| Artwork | People | Save as | Wikimedia Commons file name |
| ------- | ------ | ------- | --------------------------- |
| The Angelus – Millet | duet | `the-angelus.jpg` | search "Millet The Angelus" |
| The Morning Walk – Gainsborough | duet | `the-morning-walk.jpg` | `Thomas Gainsborough - Mr and Mrs William Hallett ('The Morning Walk') - WGA…` |
| Paolo and Francesca – Ingres | duet | `paolo-and-francesca.jpg` | `Paolo et Francesca Ingres Angers.jpg` |
| The Parasol – Goya | duet | `the-parasol.jpg` | search "Goya The Parasol Prado" |
| Whistler's Mother – Whistler | solo | `whistlers-mother.jpg` | `Whistlers Mother high res.jpg` (place joints by hand) |
| The Sower – Millet | solo | `the-sower.jpg` | `Jean-François Millet - The Sower - Google Art Project.jpg` (place joints by hand) |
| Napoleon on his Imperial Throne – Ingres | solo | `napoleon-on-his-throne.jpg` | `Ingres, Napoleon on his Imperial throne.jpg` (place joints by hand) |
| Self-Portrait at 28 – Dürer | solo | `durer-self-portrait.jpg` | search "Dürer Selbstbildnis im Pelzrock" |
| Adele Bloch-Bauer I – Klimt | solo | `adele-bloch-bauer.jpg` | `Gustav Klimt, 1907, Adele Bloch-Bauer I, Neue Galerie New York.jpg` |
