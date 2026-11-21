# Credits

## Music

**Background music: generated in the browser.** There is no
`public/audio/gallery.mp3` in the project yet, so the site plays soft
classical-style music that our own code makes with the Web Audio API
(`src/audio.ts`). It's our own work: no licence or credit needed.

If you add a recording as `public/audio/gallery.mp3`, it must be public
domain, CC0 or CC BY (see `public/audio/README.md`), and you must fill this in:

- Track title:
- Composer:
- Performer:
- Source URL:
- Licence: (Public Domain / CC0 / CC BY 4.0 …)

## Sound effects

Every sound effect is generated in the browser by our own code
(`src/audio.ts`, Web Audio API): the button click, success, fail,
celebration, whoosh and tick sounds, and the chimes. No recordings are used,
so no licence or credit is needed. (Higher or Lower's original piano loop and
chime were Swarit's own code too; the site now uses the shared sounds.)

## Narration voice

The history voiceover is pre-generated offline with **Piper**
(https://github.com/rhasspy/piper, MIT licence) and stored in `public/narration/`.
If those files are missing, the browser's built-in speech is used instead.

| Voice | Used | Source | Licence |
| ----- | ---- | ------ | ------- |
| en_GB-cori-high ("Cori") | yes (default) | https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/cori/high | Trained on LibriVox recordings: public domain |
| en_GB-jenny_dioco-medium ("Jenny (Dioco)") | alternative | https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/jenny_dioco/medium | Jenny dataset licence: commercial use allowed; attribution required ("Jenny (Dioco)") |
| en_GB-southern_english_female-low | alternative | https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/southern_english_female/low | Dataset CC BY-SA 4.0 (OpenSLR 83): attribution required |

If you switch to Jenny, keep the credit "Jenny (Dioco)" visible (it's here in
the app's credits).

## Artworks: Strike a Pose

Every artwork is public domain (the artist died more than 70 years ago).
The images in `public/paintings/` are resized copies downloaded from
**Wikimedia Commons** and the **Cleveland Museum of Art Open Access**
collection (CC0). The hub's two picture cards reuse two of them (Napoleon
Crossing the Alps and the Mona Lisa). Source and licence of each image file:

| Artwork | Artist | Image source | Image licence |
| ------- | ------ | ------------ | ------------- |
| Napoleon Crossing the Alps | Jacques-Louis David | https://commons.wikimedia.org/wiki/File:David_-_Napoleon_crossing_the_Alps_-_Malmaison2.jpg | Public domain (Wikimedia Commons) |
| Wanderer above the Sea of Fog | Caspar David Friedrich | https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg | Public domain (Wikimedia Commons) |
| The Fifer | Édouard Manet | https://commons.wikimedia.org/wiki/File:Manet,_Edouard_-_Young_Flautist,_or_The_Fifer,_1866_(2).jpg | Public domain (Wikimedia Commons) |
| The Blue Boy | Thomas Gainsborough | https://commons.wikimedia.org/wiki/File:Thomas_Gainsborough_-_The_Blue_Boy_(c._1770).jpg | Public domain (Wikimedia Commons) |
| Louis XIV | Hyacinthe Rigaud | https://commons.wikimedia.org/wiki/File:Rigaud_Louis_XIV_1701.jpg | Public domain (Wikimedia Commons) |
| Napoleon in His Study | Jacques-Louis David | https://commons.wikimedia.org/wiki/File:Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg | Public domain (Wikimedia Commons) |
| Colonel Charles Heathcote | Joseph Wright of Derby | https://clevelandart.org/art/2017.100 | CC0 (Cleveland Museum of Art Open Access) |
| Saint Jerome | Jusepe de Ribera | https://clevelandart.org/art/1961.219 | CC0 (Cleveland Museum of Art Open Access) |
| Portrait of a Man | Gustave Caillebotte | https://clevelandart.org/art/2009.157 | CC0 (Cleveland Museum of Art Open Access) |
| Portrait of a Man | Lorenzo Lotto | https://clevelandart.org/art/1950.250 | CC0 (Cleveland Museum of Art Open Access) |
| Saint Peter Repentant | Georges de La Tour | https://clevelandart.org/art/1951.454 | CC0 (Cleveland Museum of Art Open Access) |
| The Tired Gleaner | Jules Breton | https://clevelandart.org/art/1915.721 | CC0 (Cleveland Museum of Art Open Access) |
| Charles II of England | Philippe de Champaigne | https://clevelandart.org/art/1959.38 | CC0 (Cleveland Museum of Art Open Access) |
| Saint Peter of Alcántara | Pedro de Mena | https://clevelandart.org/art/2009.81 | CC0 (Cleveland Museum of Art Open Access) |
| Standing Apostle | Master of the Saint-Omer Apostles | https://clevelandart.org/art/2022.41.2 | CC0 (Cleveland Museum of Art Open Access) |
| Portrait of a Woman as Diana | Jean-Marc Nattier | https://clevelandart.org/art/1942.643 | CC0 (Cleveland Museum of Art Open Access) |
| Saint Mary Magdalen | Simon Vouet | https://clevelandart.org/art/1988.108 | CC0 (Cleveland Museum of Art Open Access) |
| The Arnolfini Portrait | Jan van Eyck | https://commons.wikimedia.org/wiki/File:Van_Eyck_-_Arnolfini_Portrait.jpg | Public domain (Wikimedia Commons) |
| The Ambassadors | Hans Holbein the Younger | https://commons.wikimedia.org/wiki/File:Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg | Public domain (Wikimedia Commons) |
| Romeo and Juliet | Ford Madox Brown | https://commons.wikimedia.org/wiki/File:Romeo_and_Juliet_(watercolour)_by_Ford_Maddox_Brown.jpg | Public domain (Wikimedia Commons) |
| Mr and Mrs Andrews | Thomas Gainsborough | https://commons.wikimedia.org/wiki/File:Thomas_Gainsborough_-_Mr_and_Mrs_Andrews.jpg | Public domain (Wikimedia Commons) |
| The Jewish Bride | Rembrandt van Rijn | https://commons.wikimedia.org/wiki/File:Rembrandt_Harmensz._van_Rijn_-_Portret_van_een_paar_als_oudtestamentische_figuren,_genaamd_%27Het_Joodse_bruidje%27_-_Google_Art_Project.jpg | Public domain (Wikimedia Commons) |
| Portrait of Henry VIII | After Hans Holbein the Younger | https://commons.wikimedia.org/wiki/File:After_Hans_Holbein_the_Younger_-_Portrait_of_Henry_VIII_-_Google_Art_Project.jpg | Public domain (Wikimedia Commons) |
| George Washington | Gilbert Stuart | https://commons.wikimedia.org/wiki/File:Gilbert_Stuart_-_George_Washington_-_Google_Art_Project.jpg | Public domain (Wikimedia Commons) |
| The Laughing Cavalier | Frans Hals | https://commons.wikimedia.org/wiki/File:Frans_Hals_%E2%80%93_The_Laughing_Cavalier.jpg | Public domain (Wikimedia Commons) |
| Madame X | John Singer Sargent | https://commons.wikimedia.org/wiki/File:Sargent_MadameX.jpeg | Public domain (Wikimedia Commons) |
| Little Dancer Aged Fourteen | Edgar Degas | https://commons.wikimedia.org/wiki/File:Edgar_Degas,_Little_Dancer_Aged_Fourteen,_1878-1881,_NGA_110292.jpg | CC0 (Wikimedia Commons) |
| Mona Lisa | Leonardo da Vinci | https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg | Public domain (Wikimedia Commons) |
| Portrait of Innocent X | Diego Velázquez | https://commons.wikimedia.org/wiki/File:Portrait_of_Pope_Innocent_X_(by_Diego_Vel%C3%A1zquez)_-_Doria_Pamphilj_Gallery,_Rome.jpg | Public domain (Wikimedia Commons) |

## Artworks: Art vs Music (Higher or Lower)

The 100 artwork images in `public/art/` were downloaded from **Wikimedia
Commons** by Swarit's data scripts (`scripts/higher-lower/`), unmodified
thumbnails. The full records (source URL, author, licence, SHA-256) are in
`data/wiki/images.json`, and each card in the game has an "Image credit" link.

The paintings themselves are public domain, but some images are **photos of
sculptures or buildings**, and the photo has its own licence. 12 of
them are CC BY or CC BY-SA: those **must** keep the photographer credit below
(and CC BY-SA means changed copies must use the same licence).

| Artwork | Artist | Image by | Image licence | Source |
| ------- | ------ | -------- | ------------- | ------ |
| A Girl with a Watering Can | Pierre-Auguste Renoir | Pierre-Auguste Renoir | Public domain | https://commons.wikimedia.org/wiki/File:Auguste_Renoir_-_A_Girl_with_a_Watering_Can_-_Google_Art_Project.jpg |
| Along the River During the Qingming Festival | Zhang Zeduan | Zhang Zeduan | Public domain | https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg |
| Annunciation | Leonardo da Vinci | Leonardo da Vinci | Public domain | https://commons.wikimedia.org/wiki/File:Annunciation_(Leonardo)_(cropped).jpg |
| Arnolfini Portrait | Jan van Eyck | Jan van Eyck | Public domain | https://commons.wikimedia.org/wiki/File:Van_Eyck_-_Arnolfini_Portrait.jpg |
| Augustus of Prima Porta | Unknown Roman sculptor | Till Niermann | Public domain | https://commons.wikimedia.org/wiki/File:Statue-Augustus.jpg |
| Bacchus | Caravaggio | Caravaggio | Public domain | https://commons.wikimedia.org/wiki/File:Baco,_por_Caravaggio.jpg |
| Bal du moulin de la Galette | Pierre-Auguste Renoir | Pierre-Auguste Renoir | Public domain | https://commons.wikimedia.org/wiki/File:Renoir,_Pierre-Auguste_-_Dance_at_Le_Moulin_de_la_Galette,_1876.jpg |
| Barge Haulers on the Volga | Ilya Repin | Ilya Repin | Public domain | https://commons.wikimedia.org/wiki/File:Ilya_Repin_-_Barge_Haulers_on_the_Volga_-_Google_Art_Project.jpg |
| Café Terrace at Night | Vincent van Gogh | Vincent van Gogh | Public domain | https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Terrace_of_a_Caf%C3%A9_at_Night_(Place_du_Forum)_1888.jpg |
| Carnation, Lily, Lily, Rose | John Singer Sargent | John Singer Sargent | Public domain | https://commons.wikimedia.org/wiki/File:John_Singer_Sargent_-_Carnation,_Lily,_Lily,_Rose_-_Google_Art_Project.jpg |
| Dancing Girl | Unknown Harappan sculptor | Jen with modifications by Ismoon 20 February 2012 (earlier version by Calliopejen1) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | https://commons.wikimedia.org/wiki/File:Dancing_girl.jpg |
| David | Michelangelo | Commonists | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Michelangelo%27s_David_-_right_view_2.jpg |
| David | Donatello | original file by Patrick A. Rodgers | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | https://commons.wikimedia.org/wiki/File:Donatello_-_David_-_Floren%C3%A7a.jpg |
| Diana and Actaeon | Titian | Titian | Public domain | https://commons.wikimedia.org/wiki/File:Titian_-_Diana_and_Actaeon_-_Google_Art_Project.jpg |
| Discobolus | After Myron | Livioandronico2013 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Discobolus_in_National_Roman_Museum_Palazzo_Massimo_alle_Terme.JPG |
| Dwelling in the Fuchun Mountains | Huang Gongwang | Huang Gongwang | Public domain | https://commons.wikimedia.org/wiki/File:%E5%AF%8C%E6%98%A5%E5%B1%B1%E5%B1%85%E5%9C%96(%E7%84%A1%E7%94%A8%E5%B8%AB%E5%8D%B7).jpg |
| Girl with a Pearl Earring | Johannes Vermeer | Johannes Vermeer | Public domain | https://commons.wikimedia.org/wiki/File:1665_Girl_with_a_Pearl_Earring.jpg |
| Great Sphinx of Giza | Unknown ancient Egyptian sculptors | MusikAnimal | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | https://commons.wikimedia.org/wiki/File:Great_Sphinx_of_Giza_May_2015.JPG |
| Impression, Sunrise | Claude Monet | Claude Monet | Public domain | https://commons.wikimedia.org/wiki/File:Monet_-_Impression,_Sunrise.jpg |
| Irises | Vincent van Gogh | Vincent van Gogh | Public domain | https://commons.wikimedia.org/wiki/File:Irises-Vincent_van_Gogh.jpg |
| Ivan the Terrible and His Son Ivan | Ilya Repin | Ilya Repin | Public domain | https://commons.wikimedia.org/wiki/File:Iv%C3%A1n_el_Terrible_y_su_hijo,_por_Ili%C3%A1_Repin.jpg |
| Lady with an Ermine | Leonardo da Vinci | Leonardo da Vinci | Public domain | https://commons.wikimedia.org/wiki/File:Lady_with_an_Ermine_-_Leonardo_da_Vinci_-_Google_Art_Project.jpg |
| Laocoön and His Sons | Agesander of Rhodes, Athanadoros, Polydoros | Wilfredor | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:Laoco%C3%B6n_and_his_sons_group.jpg |
| Las Hilanderas | Diego Velázquez | Diego Velázquez | Public domain | https://commons.wikimedia.org/wiki/File:Velazquez-las_hilanderas.jpg |
| Leshan Giant Buddha | Tang-dynasty sculptors | xiquinhosilva | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | https://commons.wikimedia.org/wiki/File:Leshan_Giant_Buddha_(1).jpg |
| Liberty Leading the People | Eugène Delacroix | Eugène Delacroix | Public domain | https://commons.wikimedia.org/wiki/File:La_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg |
| Lion Capital of Ashoka | Unknown Mauryan sculptors | Chrisi1964 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Sarnath_capital.jpg |
| Luncheon of the Boating Party | Pierre-Auguste Renoir | Pierre-Auguste Renoir | Public domain | https://commons.wikimedia.org/wiki/File:Pierre-Auguste_Renoir_-_Luncheon_of_the_Boating_Party_-_Google_Art_Project.jpg |
| Mona Lisa | Leonardo da Vinci | Leonardo da Vinci | Public domain | https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg |
| Morning in a Pine Forest | Ivan Shishkin, Konstantin Savitsky | Ivan Shishkin / Konstantin Savitsky | Public domain | https://commons.wikimedia.org/wiki/File:Shishkin,_Ivan_-_Morning_in_a_Pine_Forest.jpg |
| Mr and Mrs Andrews | Thomas Gainsborough | Thomas Gainsborough | Public domain | https://commons.wikimedia.org/wiki/File:Thomas_Gainsborough_-_Mr._und_Mrs._Andrews_(c._1750).jpg |
| Napoleon Crossing the Alps | Jacques-Louis David | Jacques-Louis David / Formerly attributed to Jérôme-Martin Langlois | Public domain | https://commons.wikimedia.org/wiki/File:Jacques_Louis_David_-_Bonaparte_franchissant_le_Grand_Saint-Bernard,_20_mai_1800_-_Google_Art_Project.jpg |
| Netherlandish Proverbs | Pieter Bruegel the Elder | Pieter Bruegel the Elder | Public domain | https://commons.wikimedia.org/wiki/File:Pieter_Brueghel_the_Elder_-_The_Dutch_Proverbs_-_Google_Art_Project.jpg |
| Oath of the Horatii | Jacques-Louis David | Jacques-Louis David | Public domain | https://commons.wikimedia.org/wiki/File:Le_Serment_des_Horaces_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3692_;_MR_1432.jpg |
| Primavera | Sandro Botticelli | Sandro Botticelli | Public domain | https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_Primavera_-_Google_Art_Project.jpg |
| Reply of the Zaporozhian Cossacks | Ilya Repin | Ilya Repin | Public domain | https://commons.wikimedia.org/wiki/File:Ilja_Jefimowitsch_Repin_-_Reply_of_the_Zaporozhian_Cossacks_-_Yorck.jpg |
| Salvator Mundi | Attributed to Leonardo da Vinci | Leonardo da Vinci | Public domain | https://commons.wikimedia.org/wiki/File:Leonardo_da_Vinci,_Salvator_Mundi,_c.1500,_oil_on_walnut,_45.4_%C3%97_65.6_cm.jpg |
| Sistine Madonna | Raphael | Raphael | Public domain | https://commons.wikimedia.org/wiki/File:Raphael_-_The_Sistine_Madonna_-_Google_Arts_%26_Culture.jpg |
| Statue of Liberty | Frédéric Auguste Bartholdi | Christian David | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Statue_of_Liberty_and_a_sightseeing_boat,_Liberty_Island,_New_York.jpg |
| Supper at Emmaus | Caravaggio | Caravaggio | Public domain | https://commons.wikimedia.org/wiki/File:Caravaggio_-_Supper_at_Emmaus_-_National_Gallery_London.jpeg |
| The Accolade | Edmund Blair Leighton | Edmund Blair Leighton | Public domain | https://commons.wikimedia.org/wiki/File:Accolade_by_Edmund_Blair_Leighton.jpg |
| The Anatomy Lesson of Dr. Nicolaes Tulp | Rembrandt | Rembrandt | Public domain | https://commons.wikimedia.org/wiki/File:Rembrandt_-_The_Anatomy_Lesson_of_Dr_Nicolaes_Tulp.jpg |
| The Angelus | Jean-François Millet | Jean-François Millet | Public domain | https://commons.wikimedia.org/wiki/File:JEAN-FRAN%C3%87OIS_MILLET_-_El_%C3%81ngelus_(Museo_de_Orsay,_1857-1859._%C3%93leo_sobre_lienzo,_55.5_x_66_cm).jpg |
| The Apotheosis of War | Vasily Vereshchagin | Vasily Vereshchagin | Public domain | https://commons.wikimedia.org/wiki/File:1871_Vereshchagin_Apotheose_des_Krieges_anagoria.JPG |
| The Art of Painting | Johannes Vermeer | Johannes Vermeer | Public domain | https://commons.wikimedia.org/wiki/File:Jan_Vermeer_-_The_Art_of_Painting_-_Google_Art_Project.jpg |
| The Birth of Venus | Sandro Botticelli | Sandro Botticelli | Public domain | https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg |
| The Blue Boy | Thomas Gainsborough | Thomas Gainsborough | Public domain | https://commons.wikimedia.org/wiki/File:Thomas_Gainsborough_-_The_Blue_Boy_(c._1770).jpg |
| The Boating Party | Mary Cassatt | Mary Cassatt | Public domain | https://commons.wikimedia.org/wiki/File:Mary_Cassatt_-_The_Boating_Party_-_Google_Art_Project.jpg |
| The Burghers of Calais | Auguste Rodin | Auguste Rodin | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:The_Burghers_of_Calais_MET_DP221863.jpg |
| The Cardsharps | Caravaggio | Caravaggio | Public domain | https://commons.wikimedia.org/wiki/File:Caravaggio_-_The_Cardsharps_(1596-97)_Kimbell_Art_Museum.jpg |
| The Child's Bath | Mary Cassatt | Mary Cassatt | Public domain | https://commons.wikimedia.org/wiki/File:The_Child%27s_Bath_by_Mary_Cassatt_1893.jpg |
| The Coronation of Napoleon | Jacques-Louis David | Jacques-Louis David | Public domain | https://commons.wikimedia.org/wiki/File:Le_Sacre_de_Napol%C3%A9on_-_Jacques-Louis_David_-_Mus%C3%A9e_du_Louvre_Peintures_INV_3699_;_MR_1437.jpg |
| The Cradle | Berthe Morisot | Berthe Morisot | Public domain | https://commons.wikimedia.org/wiki/File:Berthe_Morisot_-_Le_berceau.jpg |
| The Creation of Adam | Michelangelo | Michelangelo | Public domain | https://commons.wikimedia.org/wiki/File:The_Creation_of_Adam_perspective_fix.jpg |
| The Daughters of Edward Darley Boit | John Singer Sargent | John Singer Sargent | Public domain | https://commons.wikimedia.org/wiki/File:John_Singer_Sargent_001.jpg |
| The Death of Marat | Jacques-Louis David | Jacques-Louis David | Public domain | https://commons.wikimedia.org/wiki/File:Jacques-Louis_David_-_Marat_assassinated_-_Google_Art_Project_2.jpg |
| The Dream | Henri Rousseau | Henri Rousseau | Public domain | https://commons.wikimedia.org/wiki/File:Henri_Rousseau_005.jpg |
| The Entombment of Christ | Caravaggio | Caravaggio | Public domain | https://commons.wikimedia.org/wiki/File:The_Entombment_of_Christ-Caravaggio_(c.1602-3).jpg |
| The Fairy Feller's Master-Stroke | Richard Dadd | Richard Dadd | Public domain | https://commons.wikimedia.org/wiki/File:Richard_Dadd_-_The_Fairy_Feller%27s_Master-Stroke_-_Google_Art_Project.jpg |
| The Gates of Hell | Auguste Rodin | Till Niermann | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | https://commons.wikimedia.org/wiki/File:Rodin_Porte_enfer.jpg |
| The Gleaners | Jean-François Millet | Jean-François Millet | Public domain | https://commons.wikimedia.org/wiki/File:Jean-Fran%C3%A7ois_Millet_-_Des_glaneuses.jpg |
| The Goldfinch | Carel Fabritius | Carel Fabritius | Public domain | https://commons.wikimedia.org/wiki/File:Carel_Fabritius_-_The_Goldfinch_-_605_-_Mauritshuis.jpg |
| The Gross Clinic | Thomas Eakins | Thomas Eakins, American, 1844 - 1916 (1844 - 1916) – Artist/Maker (American) Born in Philadelphia, Pennsylvania, United States. Died in Philadelphia, Pennsylvania, United States. Details on Google Art Project | Public domain | https://commons.wikimedia.org/wiki/File:Thomas_Eakins,_American_-_Portrait_of_Dr._Samuel_D._Gross_(The_Gross_Clinic)_-_Google_Art_Project.jpg |
| The Hay Wain | John Constable | John Constable | Public domain | https://commons.wikimedia.org/wiki/File:John_Constable_-_The_Hay_Wain_(1821).jpg |
| The Heart of the Andes | Frederic Edwin Church | Frederic Edwin Church | Public domain | https://commons.wikimedia.org/wiki/File:Church_Heart_of_the_Andes.jpg |
| The Horse Fair | Rosa Bonheur | Rosa Bonheur | Public domain | https://commons.wikimedia.org/wiki/File:Rosa_Bonheur,_The_Horse_Fair,_1852%E2%80%9355.jpg |
| The Hunters in the Snow | Pieter Bruegel the Elder | Pieter Bruegel the Elder | Public domain | https://commons.wikimedia.org/wiki/File:Pieter_Bruegel_the_Elder_-_Hunters_in_the_Snow_(Winter)_-_Google_Art_Project.jpg |
| The Kiss | Gustav Klimt | Gustav Klimt | Public domain | https://commons.wikimedia.org/wiki/File:The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg |
| The Kiss | Auguste Rodin | Tylwyth Eldar | Public domain | https://commons.wikimedia.org/wiki/File:Rodin_-_Le_Baiser_06.jpg |
| The Lacemaker | Johannes Vermeer | Johannes Vermeer | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:La_Dentelli%C3%A8re.jpg |
| The Last Judgment | Michelangelo | Burkhard Mücke | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Altarraum_mit_J%C3%BCngstem_Gericht.jpg |
| The Milkmaid | Johannes Vermeer | Johannes Vermeer | Public domain | https://commons.wikimedia.org/wiki/File:Johannes_Vermeer_-_Het_melkmeisje_-_Google_Art_Project.jpg |
| The Night Watch | Rembrandt | Rembrandt | Public domain | https://commons.wikimedia.org/wiki/File:La_ronda_de_noche,_por_Rembrandt_van_Rijn.jpg |
| The Ninth Wave | Ivan Aivazovsky | Hovhannes Aivazovsky (1817 - 1900) – painter (Russian) Born in Rossiiskaya imperiya, Feodosia. Died in Rossiiskaya imperiya, Feodosia. Details on Google Art Project | Public domain | https://commons.wikimedia.org/wiki/File:Hovhannes_Aivazovsky_-_The_Ninth_Wave_-_Google_Art_Project.jpg |
| The Peasant Wedding | Pieter Bruegel the Elder | Pieter Bruegel the Elder | Public domain | https://commons.wikimedia.org/wiki/File:Pieter_Bruegel_the_Elder_-_Peasant_Wedding_-_Google_Art_Project.jpg |
| The Potato Eaters | Vincent van Gogh | Vincent van Gogh | Public domain | https://commons.wikimedia.org/wiki/File:Van-willem-vincent-gogh-die-kartoffelesser-03850.jpg |
| The Raft of the Medusa | Théodore Géricault | Théodore Géricault | Public domain | https://commons.wikimedia.org/wiki/File:JEAN_LOUIS_TH%C3%89ODORE_G%C3%89RICAULT_-_La_Balsa_de_la_Medusa_(Museo_del_Louvre,_1818-19).jpg |
| The Rape of Europa | Titian | Titian | Public domain | https://commons.wikimedia.org/wiki/File:Tizian_085.jpg |
| The Red Vineyard | Vincent van Gogh | Vincent van Gogh | Public domain | https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Red_Vineyard_at_Arles_(1888).jpg |
| The Return of the Prodigal Son | Rembrandt | Rembrandt | Public domain | https://commons.wikimedia.org/wiki/File:Rembrandt_Harmensz_van_Rijn_-_Return_of_the_Prodigal_Son_-_Google_Art_Project.jpg |
| The School of Athens | Raphael | Raphael | Public domain | https://commons.wikimedia.org/wiki/File:%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg |
| The Sleeping Gypsy | Henri Rousseau | Henri Rousseau | Public domain | https://commons.wikimedia.org/wiki/File:La_Boh%C3%A9mienne_endormie.jpg |
| The Starry Night | Vincent van Gogh | Vincent van Gogh | Public domain | https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg |
| The Stone Breakers | Gustave Courbet | Gustave Courbet | Public domain | https://commons.wikimedia.org/wiki/File:Gustave_Courbet_018.jpg |
| The Storm on the Sea of Galilee | Rembrandt | Rembrandt | Public domain | https://commons.wikimedia.org/wiki/File:Rembrandt_Christ_in_the_Storm_on_the_Lake_of_Galilee.jpg |
| The Surrender of Breda | Diego Velázquez | Diego Velázquez | Public domain | https://commons.wikimedia.org/wiki/File:Velazquez-The_Surrender_of_Breda.jpg |
| The Swing | Pierre-Auguste Renoir | Pierre-Auguste Renoir | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:Swing-Renoir.jpeg |
| The Thinker | Auguste Rodin | AndrewHorne (talk) | Public domain | https://commons.wikimedia.org/wiki/File:The_Thinker,_Rodin.jpg |
| The Third of May 1808 | Francisco Goya | Francisco Goya | Public domain | https://commons.wikimedia.org/wiki/File:El_Tres_de_Mayo,_by_Francisco_de_Goya,_from_Prado_in_Google_Earth.jpg |
| The Triumph of Death | Pieter Bruegel the Elder | Pieter Bruegel the Elder | Public domain | https://commons.wikimedia.org/wiki/File:The_Triumph_of_Death_by_Pieter_Bruegel_the_Elder.jpg |
| The Umbrellas | Pierre-Auguste Renoir | Pierre-Auguste Renoir | Public domain | https://commons.wikimedia.org/wiki/File:Pierre-Auguste_Renoir,_The_Umbrellas,_ca._1881-86.jpg |
| The Yellow House | Vincent van Gogh | Vincent van Gogh | Public domain | https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_The_yellow_house_(%27The_street%27).jpg |
| Transfiguration | Raphael | Raphael | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | https://commons.wikimedia.org/wiki/File:Transfigurazione_(Raffaello)_September_2015-1a.jpg |
| Venus de Milo | Attributed to Alexandros of Antioch | Shonagon | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:V%C3%A9nus_de_Milo_-_Mus%C3%A9e_du_Louvre_AGER_LL_299_;_N_527_;_Ma_399.jpg |
| View of Delft | Johannes Vermeer | Johannes Vermeer | Public domain | https://commons.wikimedia.org/wiki/File:Johannes_Vermeer_-_View_of_Delft_-_92_-_Mauritshuis.jpg |
| Wheatfield with Crows | Vincent van Gogh | Vincent van Gogh | Public domain | https://commons.wikimedia.org/wiki/File:Korenveld_met_kraaien_-_s0149V1962_-_Van_Gogh_Museum.jpg |
| Whistler's Mother | James McNeill Whistler | James McNeill Whistler | Public domain | https://commons.wikimedia.org/wiki/File:Whistlers_Mother_high_res.jpg |
| Wind God and Thunder God | Ogata Kōrin | 尾形光琳 (Ogata Korin) (1658-1716) | Public domain | https://commons.wikimedia.org/wiki/File:Wind_God_and_Thunder_God_Screens_by_Ogata_Korin.png |
| Winged Victory of Samothrace | Unknown Greek sculptor | Shonagon | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) | https://commons.wikimedia.org/wiki/File:Victoire_de_Samothrace_-_Musee_du_Louvre_-_20190812.jpg |
| Woman with a Parasol – Madame Monet and Her Son | Claude Monet | Claude Monet | Public domain | https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Woman_with_a_Parasol_-_Madame_Monet_and_Her_Son_-_Google_Art_Project.jpg |

## Data: Art vs Music

- **View counts**: Wikimedia Analytics API (page views, 2016–2025). Wikimedia
  statistics are CC0. https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/
- **Song list**: the 100 songs come from the "Spotify Streaming Insights
  2010–2019" CSV by Demibolt007:
  https://github.com/Demibolt007/Spotify-Streaming-Insights-2010-2019
  Only song titles, artists and years are used; no audio or album art.
  The record sleeves in the game are drawn by our own CSS.
- **Song and artwork details** (titles, dates): Wikipedia and Wikidata.

## Software and fonts

- Pose detection and background removal: Google MediaPipe (Apache License 2.0).
- Narration voices: Piper (MIT licence), voices listed above.
- Art vs Music: React (MIT licence).
- Headings font: Playfair Display by Claus Eggers Sørensen, from Google Fonts
  (SIL Open Font License 1.1).

## Made by

- Sachin Ragu and Suvir: Strike a Pose, Old Masters; the combined site
- Swarit Kapoor: Art vs Music: Higher or Lower
