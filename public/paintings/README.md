# Artwork images

Put artwork images in this folder. A file here called `mona-lisa.jpg` is
loaded by the app as `/paintings/mona-lisa.jpg`. The file names must match the
`imageUrl` values in `src/paintings.ts`.

**Where each image came from, and its licence, is listed in `CREDITS.md`**
(section "Artworks"). Images are resized to at most 1200 px on the long side.

## The rules for adding an artwork

- Exactly **one person** with a clear pose you can copy.
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

## Famous works still to add

While building the collection, Wikimedia Commons blocked our downloads
("429 Too Many Requests"), so these famous works are **not in the app yet**.
To add one: open https://commons.wikimedia.org, search for the file name below,
download it, save it here under the suggested name, resize it
(`sips -Z 1200 file.jpg` on a Mac), then make its target pose.

| Artwork | Save as | Wikimedia Commons file name |
| ------- | ------- | --------------------------- |
| Discobolus (Roman copy of Myron) | `discobolus.jpg` | `Discobolus in National Roman Museum Palazzo Massimo alle Terme.JPG` |
| David – Michelangelo | `david-michelangelo.jpg` | `Galleria dell'Accademia Michelangelo’s David, Florence 2019.jpg` |
| David – Bernini | `david-bernini.jpg` | `David by Bernini, 1623-1624, Villa Borghese, Rome.jpg` |
| David – Donatello | `david-donatello.jpg` | `David, Donatello, ca. 1440, Bargello Florenz-01-168.jpg` |
| Apollo Belvedere | `apollo-belvedere.jpg` | `Belvedere Apollo Pio-Clementino Inv1015 n5.jpg` |
| Vitruvian Man – Leonardo da Vinci | `vitruvian-man.jpg` | `Da Vinci Vitruve Luc Viatour.jpg` |
| Mona Lisa – Leonardo da Vinci | `mona-lisa.jpg` | `Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg` |
| Bacchus – Caravaggio | `bacchus.jpg` | `Bacchus by Caravaggio 1.jpg` |
| The Sower – Millet | `the-sower.jpg` | `Jean-François Millet - The Sower - Google Art Project.jpg` |
| The Desperate Man – Courbet | `the-desperate-man.jpg` | `Gustave Courbet - Le Désespéré (1843).jpg` |
| Portrait of Henry VIII – after Holbein | `henry-viii.jpg` | `After Hans Holbein the Younger - Portrait of Henry VIII - Google Art Project.jpg` |
| Madame X – Sargent | `madame-x.jpg` | `Sargent MadameX.jpeg` |
| Whistler's Mother – Whistler | `whistlers-mother.jpg` | `Whistlers Mother high res.jpg` |
| Self-Portrait at 28 – Dürer | `durer-self-portrait.jpg` | `Albrecht Dürer - 1500 self-portrait (High resolution and detail).jpg` |
| Saint Sebastian – Mantegna | `saint-sebastian.jpg` | `Saint Sebastian by Mantegna (Louvre).jpg` |
| Pope Innocent X – Velázquez | `innocent-x.jpg` | `Portrait of Pope Innocent X (by Diego Velázquez) - Doria Pamphilj Gallery, Rome.jpg` |
| Adele Bloch-Bauer I – Klimt | `adele-bloch-bauer.jpg` | `Gustav Klimt, 1907, Adele Bloch-Bauer I, Neue Galerie New York.jpg` |
| Little Dancer Aged Fourteen – Degas | `little-dancer.jpg` | `Edgar Degas, Little Dancer Aged Fourteen, 1878-1881, NGA 110292.jpg` |
| George Washington (Lansdowne portrait) – Gilbert Stuart | `lansdowne-washington.jpg` | `Gilbert Stuart - George Washington - Google Art Project.jpg` |
| Napoleon I on his Imperial Throne – Ingres | `napoleon-on-his-throne.jpg` | `Ingres, Napoleon on his Imperial throne.jpg` |
| The Laughing Cavalier – Frans Hals | `laughing-cavalier.jpg` | `Frans Hals – The Laughing Cavalier.jpg` |

The Thinker is already in the app (a Cleveland Museum of Art photo).
