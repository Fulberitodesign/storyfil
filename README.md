# Storyfil

Storyboards et process reliés par des fils, avec images, vidéos et vidéos TikTok / Instagram / Facebook lisibles directement dans le plan de travail. Un lien suffit pour montrer l'aperçu à quelqu'un.

Adresse une fois publié : **https://fulberitodesign.github.io/storyfil/**

## Ce que fait l'outil

**Plan de travail**
- Plan infini : glisser le fond pour se déplacer, molette ou pincement pour zoomer, mini-carte, « Tout voir ».
- Éléments : scène (cadre image / vidéo), étape, décision (losange), début / fin, note, texte libre, zone pour regrouper.
- Fils entre les éléments : courbe, droit ou coudé, flèche (fin, début, deux sens, aucune), plein ou pointillé, épaisseur, couleur, libellé (« Oui », « Non »…) et fil animé qui montre le sens du parcours.
- Glisser depuis un point ● pour relier ; cliquer sur un point crée la suite déjà reliée ; relâcher un fil dans le vide propose de créer l'élément suivant.
- Sortie d'une décision : les fils reçoivent « Oui » puis « Non » automatiquement.

**Médias**
- Images et vidéos de l'appareil (bouton, glisser-déposer, Ctrl+V). La durée des vidéos est reprise automatiquement.
- Vidéos par lien : TikTok (y compris les liens courts vm.tiktok.com), Instagram (reels et publications), Facebook (vidéos, reels, publications), YouTube (et Shorts), Vimeo, Google Drive, liens directs vers une image ou une vidéo.
- Seuls les lecteurs visibles à l'écran sont chargés, pour garder un plan fluide même avec beaucoup de vidéos. Bouton « Agrandir » pour regarder en grand.

**Texte mis en forme**
- Gras, italique, souligné, barré, surlignage, couleurs, listes, liens (barre de mise en forme qui apparaît pendant l'écriture, ou Ctrl+B / I / U).
- Taille, police (titre, texte, élégante, manuscrite, machine à écrire) et alignement par élément.

**Outils de storyboard**
- Pour chaque scène : plan (gros plan, plan large…), mouvement de caméra, transition, son / voix off / dialogue, durée, statut (À faire, En cours, Tourné, Monté, Validé), format du cadre (16:9, 9:16, 1:1, 4:5).
- Numérotation automatique des scènes dans l'ordre du parcours, durée totale et timecodes.
- Aligner, répartir, ranger en ligne / en grille / en suivant les fils, relier une sélection dans l'ordre, entourer d'une zone, verrouiller, premier plan / arrière-plan, dupliquer, copier-coller.
- Recherche (Ctrl+F), annuler / rétablir, modèles de départ (storyboard vidéo, process, parcours réseaux sociaux).

**Montrer et partager**
- **Présenter** : la caméra suit le parcours scène par scène ; aux embranchements, des boutons proposent chaque chemin.
- **Liste** : toutes les scènes dans l'ordre avec médias, notes et timecodes ; impression / PDF ; export du tableau (CSV) pour Excel ou Google Sheets.
- **Lien de consultation** : le storyboard est compressé dans l'adresse (rien n'est envoyé sur un serveur). La personne voit tout en lecture seule et peut « Copier et modifier » de son côté.
- **Fichier d'aperçu (.html)** : un seul fichier qui contient tout, même les vidéos importées, à envoyer par e-mail, WhatsApp ou WeTransfer.
- **Projet (.json)** : pour qu'une autre personne reprenne le storyboard et le modifie.

## Bon à savoir

- Les storyboards restent dans le navigateur (IndexedDB). Pour les garder ailleurs ou changer d'appareil : « Mes storyboards › Sauvegarder ce projet (.json) ».
- Une vidéo importée depuis l'appareil ne tient pas dans un lien : le lien montre son image d'aperçu. Pour qu'elle soit lisible par lien, mettez-la en ligne (TikTok, YouTube, Drive…) et ajoutez-la par lien, ou envoyez le fichier d'aperçu.
- Instagram et Facebook n'affichent que les contenus publics dont l'intégration est autorisée par leur auteur.
- Dans le fichier d'aperçu ouvert depuis l'ordinateur, YouTube refuse son lecteur : un bouton ouvre la vidéo sur YouTube.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Interface : barre du haut, outils, boîtes de dialogue, icônes |
| `storyboard.css` | Styles (thème sombre et clair) |
| `storyboard.js` | Application : plan de travail, fils, médias, texte enrichi, partage, présentation |

Site statique, aucune compilation : GitHub Pages publie la branche `main` (Settings › Pages › Deploy from a branch › main / root).
