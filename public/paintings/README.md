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

## Images the app uses

All ten were downloaded from Wikimedia Commons, where each file is marked
"Public domain", at 1280 px wide.

| File name | Painting | Source |
| --------- | -------- | ------ |
| `napoleon-crossing-the-alps.jpg` | Napoleon Crossing the Alps, Jacques-Louis David | https://commons.wikimedia.org/wiki/File:David_-_Napoleon_crossing_the_Alps_-_Malmaison2.jpg |
| `liberty-leading-the-people.jpg` | Liberty Leading the People, Eugène Delacroix | https://commons.wikimedia.org/wiki/File:Eug%C3%A8ne_Delacroix_-_Le_28_Juillet._La_Libert%C3%A9_guidant_le_peuple.jpg |
| `the-creation-of-adam.jpg` | The Creation of Adam, Michelangelo | https://commons.wikimedia.org/wiki/File:Michelangelo_-_Creation_of_Adam_(cropped).jpg |
| `washington-crossing-the-delaware.jpg` | Washington Crossing the Delaware, Emanuel Leutze | https://commons.wikimedia.org/wiki/File:Washington_Crossing_the_Delaware_by_Emanuel_Leutze,_MMA-NYC,_1851.jpg |
| `oath-of-the-horatii.jpg` | Oath of the Horatii, Jacques-Louis David | https://commons.wikimedia.org/wiki/File:Jacques-Louis_David,_Le_Serment_des_Horaces.jpg |
| `wanderer-above-the-sea-of-fog.jpg` | Wanderer above the Sea of Fog, Caspar David Friedrich | https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg |
| `the-fifer.jpg` | The Fifer, Édouard Manet | https://commons.wikimedia.org/wiki/File:Manet,_Edouard_-_Young_Flautist,_or_The_Fifer,_1866_(2).jpg |
| `the-blue-boy.jpg` | The Blue Boy, Thomas Gainsborough | https://commons.wikimedia.org/wiki/File:Thomas_Gainsborough_-_The_Blue_Boy_(c._1770).jpg |
| `louis-xiv.jpg` | Louis XIV, Hyacinthe Rigaud | https://commons.wikimedia.org/wiki/File:Rigaud_Louis_XIV_1701.jpg |
| `napoleon-in-his-study.jpg` | Napoleon in His Study, Jacques-Louis David | https://commons.wikimedia.org/wiki/File:Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg |

After adding an image, give it a target pose with the pose picker (see the
main README, "Making a target pose").

Tips:
- Keep images under about 1 MB so the gallery loads quickly.
- Paintings with one clear, full-body figure work best for pose matching.
