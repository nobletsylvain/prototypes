# Générer les « fake stories » de La Bascule (prompt Grok)

Maquette **Snapshit** (parodie de Snapchat) du prologue *La Bascule*. Les stories
sont éphémères, plein écran **9:16**, et servent à donner vie au quartier autour du
joueur. Ce doc contient :

1. le **prompt à coller dans Grok** (texte) ;
2. l'**output attendu** : un JSON pluggable + un prompt visuel 9:16 par slide ;
3. comment **brancher** le résultat dans `la-bascule/index.html`.

---

## 1) Anatomie d'une slide (référence visuelle du proto)

Le viewer affiche, de haut en bas :

| Élément | Source dans le JSON | Exemple (cf. capture) |
|---|---|---|
| Nom + avatar emoji | `author`, `avatar` | `Momo` 💀 |
| Barre de progression | nb d'éléments de `slides` | 1 segment / slide |
| Brief du clip 9:16 | `clip_txt` | `STORY 9:16 — Momo sur SON corner, liasse au poing, grain de nuit` |
| Légende (gros texte) | `caption` | `le block C, c'est MOI 💀` |
| Vues (toujours **opaque**) | `views` | `— vu par tout le quartier (opaque)` |
| Barre de réponse | `reply_emojis` | ❄️ 🌿 💸 |

`clip_txt` est le **brief court affiché in-app** (placeholder). `clip_prompt` est le
**prompt riche** à coller dans un générateur d'image/vidéo (Grok Imagine, etc.).

---

## 2) Prompt à coller dans Grok

> Copie tout le bloc ci-dessous dans Grok.

```
Tu es l'auteur des contenus sociaux d'un jeu mobile narratif : « La Bascule »,
le prologue de CrimWorld. L'app fictive s'appelle SNAPSHIT (parodie de Snapchat).
Le joueur, criblé de dettes envers Momo (un usurier, emoji 💀), revend de la
« savonnette » (hash) coupée en barrettes, et poste sa vitrine en story pour
attirer des clients qui le DM.

UNIVERS & TON
- Banlieue française, nuit, néons, grain de tél, argot/verlan, humour noir sec.
- C'est de la FICTION parodique : aucune marque réelle, aucune personne réelle,
  aucun mode d'emploi de fabrication de drogue. On reste dans l'AMBIANCE sociale
  (frime, came, dette, quartier), pas dans la recette.
- La RÉPUTATION et les VUES sont OPAQUES : jamais de chiffre exact. Toujours une
  formule floue (ex. « vu par tout le quartier (opaque) », « 🔥 •••• (opaque) »).
- La QUALITÉ est le seul levier : came « propre » (A) = classe, discrète, premium ;
  came « à l'arrache » (C) = cheap, agressive, ça fait du volume mais ça crame.

PERSONNAGES / CHAÎNES À PEUPLER (stories d'ambiance NPC)
- comptoir  — « Le Comptoir » 🏪 : le bar-tabac relais, ragots du quartier, prix qui montent.
- campus    — « Le Campus » 🎓 : étudiants fauchés, demande qui flambe en période d'exam.
- arrivage  — « Arrivage » 🌃 (LIVE) : un gros arrivage vient de tomber, hype, urgence.
- ruelle    — « La Ruelle » 🚬 : la concurrence, les gros bras, les embrouilles de corner.
- momo      — « Momo » 💀 : l'usurier qui rappelle la dette, menace voilée, frime.

VITRINE DU JOUEUR (2 variantes, à fournir aussi)
- vitrine_A — came coupée PROPRE (qualité A) : premium, soignée, sobre, ça inspire confiance.
- vitrine_C — came coupée À L'ARRACHE (qualité C) : cheap, criarde, « ça part vite » mais sale.

CONSIGNES DE RÉDACTION
- Pour CHAQUE chaîne ci-dessus, produis 1 à 2 slides.
- Chaque slide a :
  • clip_txt   : brief COURT du clip 9:16 affiché in-app, format « STORY 9:16 — <description visuelle nuit, grain> ». Max ~12 mots.
  • caption    : la punchline en gros, argot + 1-2 emojis max, ≤ 6 mots. Percutante.
  • views      : ligne de vues OPAQUE, commence par « — », jamais de chiffre.
  • reply_emojis : 3 emojis de réaction cohérents (parmi ❄️ 🌿 💸 🔥 👀 💀 🥶 🤝 …).
  • clip_prompt : prompt RICHE pour générer le clip vertical 9:16 (style néon nuit,
    grain de tél, gros plan produit/quartier, AUCUN visage identifiable, pas de logo réel,
    pas de texte incrusté). 1 à 2 phrases.

SORTIE
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au schéma exact
  donné plus bas (clé "stories", liste d'objets). Respecte les "id" imposés ci-dessus.
- Français pour author/clip_txt/caption/views ; clip_prompt peut être en anglais.
```

---

## 3) Output attendu (schéma + exemple)

### Schéma

```json
{
  "stories": [
    {
      "id": "comptoir",
      "author": "Le Comptoir",
      "avatar": "🏪",
      "ring": "seen",            // "seen" | "unseen" | "live"
      "live_label": null,         // ex. "● ARRIVAGE" quand ring === "live", sinon null
      "slides": [
        {
          "ts": "il y a 2 h",
          "clip_txt": "STORY 9:16 — ...",
          "caption": "...",
          "views": "— vu par ... (opaque)",
          "reply_emojis": ["❄️", "🌿", "💸"],
          "clip_prompt": "9:16 vertical, night, phone grain, ... no faces, no logos, no text."
        }
      ]
    }
  ]
}
```

### Exemple rempli (ce que « bon » veut dire — calé sur la capture)

```json
{
  "stories": [
    {
      "id": "momo",
      "author": "Momo",
      "avatar": "💀",
      "ring": "unseen",
      "live_label": null,
      "slides": [
        {
          "ts": "à l'instant",
          "clip_txt": "STORY 9:16 — Momo sur SON corner, liasse au poing, grain de nuit",
          "caption": "le block C, c'est MOI 💀",
          "views": "— vu par tout le quartier (opaque)",
          "reply_emojis": ["💀", "💸", "🥶"],
          "clip_prompt": "9:16 vertical night street corner under sodium streetlight, gloved hand fanning a thick cash roll, heavy phone-camera grain, shallow depth of field, no faces, no logos, no on-screen text."
        }
      ]
    },
    {
      "id": "arrivage",
      "author": "Arrivage",
      "avatar": "🌃",
      "ring": "live",
      "live_label": "● ARRIVAGE",
      "slides": [
        {
          "ts": "live",
          "clip_txt": "STORY 9:16 — cartons qui débarquent dans un parking sombre",
          "caption": "ça vient de tomber 🌃🔥",
          "views": "— le quartier est déjà au courant (opaque)",
          "reply_emojis": ["🔥", "👀", "🤝"],
          "clip_prompt": "9:16 vertical, dim underground parking at night, sealed brown boxes stacked on a car trunk, single harsh flashlight, cold blue tint, heavy grain, no faces, no logos, no text."
        }
      ]
    },
    {
      "id": "vitrine_A",
      "author": "Ta vitrine",
      "avatar": "⚡",
      "ring": "seen",
      "live_label": null,
      "slides": [
        {
          "ts": "à l'instant",
          "clip_txt": "STORY 9:16 — barrette nette sur balance, lumière propre",
          "caption": "coupe propre, que du beau 🧊",
          "views": "— vu par les bons clients (opaque)",
          "reply_emojis": ["🧊", "🤝", "🌿"],
          "clip_prompt": "9:16 vertical, clean macro of a neatly pressed brown bar on a small digital scale, warm soft key light, premium calm mood, slight grain, no faces, no logos, no text."
        }
      ]
    },
    {
      "id": "vitrine_C",
      "author": "Ta vitrine",
      "avatar": "⚡",
      "ring": "seen",
      "live_label": null,
      "slides": [
        {
          "ts": "à l'instant",
          "clip_txt": "STORY 9:16 — barrette baclée, flash cru, fond crade",
          "caption": "ça part vite 💨💨",
          "views": "— vu par n'importe qui (opaque)",
          "reply_emojis": ["💨", "💸", "👀"],
          "clip_prompt": "9:16 vertical, harsh on-camera flash on a roughly cut crumbly bar over a messy table, oversaturated cheap look, heavy noise, no faces, no logos, no text."
        }
      ]
    }
  ]
}
```

---

## 4) Brancher dans le proto

> ✅ **Déjà câblé** : les stories NPC (Comptoir, Campus, Arrivage, Ruelle, Momo)
> sont désormais embarquées dans `la-bascule/index.html` (const `STORIES` +
> viewer `#npcviewer`). Taper une story du tray l'ouvre, tap = slide suivante.
> Le bloc ci-dessous décrit le câblage, pour **étendre** avec du contenu Grok.

Pour ajouter/remplacer des stories : enrichis la const `STORIES` au schéma
ci-dessus (clés `comptoir/campus/arrivage/ruelle/momo`). Le viewer reprend :

1. Coller l'objet dans une constante `const STORIES = { ... }` du module.
2. Générer les `.story`/`.ring` du tray à partir de `stories` (avatar + ring +
   `live_label` → reprend la classe `.live` existante).
3. Au clic sur une story, peupler le `#viewer` : `clip_txt` → `.txt`,
   `caption` → `.big`, `views` → `.sub` (`#viewer-views`), `reply_emojis` →
   `.vreply .emojis`, et un segment de `.progress` par slide.
4. Les `clip_prompt` partent dans Grok Imagine / un générateur 9:16 ; les .mp4
   bakés remplacent les placeholders 📦 (cf. devnote « clips IA = placeholders »).

> ⚠️ Garder l'opacité : ne jamais afficher un nombre de vues réel — toujours la
> formule floue de `views`. C'est un invariant de design de CrimWorld.
