# Painting images

Put the painting images in this folder. A file here called `mona-lisa.jpg` is
loaded by the app as `/paintings/mona-lisa.jpg`. The file names must match the
`imageUrl` values in `src/paintings.ts`.

## Where to get public-domain images

Only use paintings that are in the **public domain**: usually the artist died
more than 70 years ago, *and* the image is a straight photo of a 2D painting.

- **Wikimedia Commons**: https://commons.wikimedia.org. Search for the
  painting and check that the file page has a "Public domain" licence box.
  Click "Download" and choose a size around 1000–1500 px tall.
- **The Met Open Access**: https://www.metmuseum.org/art/collection. Tick
  "Open Access" in the filters.
- **Rijksmuseum**: https://www.rijksmuseum.nl/en/rijksstudio. Free
  downloads of their public-domain collection.
- **National Gallery of Art (Washington) Open Access**: https://www.nga.gov/open-access-images.html
- **Art Institute of Chicago**: https://www.artic.edu/collection. Filter by
  "Public domain".

Write down where each image came from in the table below so you can credit it
in the demo.

## Images the app expects right now

| File name                        | Painting                                     | Source URL |
| -------------------------------- | -------------------------------------------- | ---------- |
| `mona-lisa.jpg`                  | Mona Lisa, Leonardo da Vinci                 |            |
| `the-scream.jpg`                 | The Scream, Edvard Munch                     |            |
| `napoleon-crossing-the-alps.jpg` | Napoleon Crossing the Alps, Jacques-Louis David |         |
| `girl-with-a-pearl-earring.jpg`  | Girl with a Pearl Earring, Johannes Vermeer  |            |

Tips:
- Keep images under about 1 MB so the gallery loads quickly.
- Paintings where the arms and head are clearly visible work best for pose
  matching.
