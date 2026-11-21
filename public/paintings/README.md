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

All four were downloaded from Wikimedia Commons, where each file is marked
"Public domain", and resized to about 1300–1600 px tall.

| File name                        | Painting                                        | Source |
| -------------------------------- | ----------------------------------------------- | ------ |
| `mona-lisa.jpg`                  | Mona Lisa, Leonardo da Vinci                    | https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg |
| `the-scream.jpg`                 | The Scream, Edvard Munch                        | https://commons.wikimedia.org/wiki/File:Edvard_Munch,_1893,_The_Scream,_oil,_tempera_and_pastel_on_cardboard,_91_x_73_cm,_National_Gallery_of_Norway.jpg |
| `napoleon-crossing-the-alps.jpg` | Napoleon Crossing the Alps, Jacques-Louis David | https://commons.wikimedia.org/wiki/File:David_-_Napoleon_crossing_the_Alps_-_Malmaison2.jpg |
| `girl-with-a-pearl-earring.jpg`  | Girl with a Pearl Earring, Johannes Vermeer     | https://commons.wikimedia.org/wiki/File:1665_Girl_with_a_Pearl_Earring.jpg |

Tips:
- Keep images under about 1 MB so the gallery loads quickly.
- Paintings where the arms and head are clearly visible work best for pose
  matching.
