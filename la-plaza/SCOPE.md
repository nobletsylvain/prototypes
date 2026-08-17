# La Plaza — scope

**Statut :** proto jouable · **thèse NON validée en l'état** (voir §4)
**Ce qu'il teste :** une seule hypothèse, et rien d'autre.

> **Est-ce qu'un punto disputé rend le choix de destination vivant ?**

C'est la question qui décide si le PvP économique — « on se bat pour un **débit**,
pas pour un butin » — a des fondations. Si elle est fausse, un jeu multijoueur
bâti dessus est mort avant le premier serveur.

## 1. Le montage

Trois cartels, trois sorties, une saison de 120 jours. On a **retiré** la chaîne
d'El Patrón (fincas, labos, précurseurs, blanchiment) pour ne pas diluer le
test : production abstraite, une seule monnaie.

- **Tes 100 points de production** se répartissent entre les trois plazas. C'est
  le seul vrai levier.
- **Tenir une plaza** demande 45 % du volume qui y passe. Le tenant prélève
  **25 %** sur ce que les autres y font passer.
- **Une plaza disputée chauffe**, et elle chauffe *ceux qui y passent* — donc
  les deux camps, jamais le troisième.
- **L'État frappe le plus bruyant** : c'est ta **part du corridor**, pas ton
  tonnage, qui te met la cible dans le dos. Anti-snowball diégétique.
- **Rien n'est tiré au sort** (R4), y compris les rivaux : leur politique est une
  fonction pure de l'état, écrite en toutes lettres dans l'onglet Rivaux.

## 2. Les rivaux

| Cartel | Politique, affichée dans le jeu |
|---|---|
| **Los Águilas** | « Prend toujours la plaza la plus rentable, quitte à payer le péage. » |
| **La Familia** | « Évite le conflit : va toujours vers la plaza la moins tendue. » |

Elles sont testées comme **fonctions pures** : deux appels de suite donnent la
même réponse. Un joueur doit pouvoir prévoir leur prochain coup.

## 3. Ce que le banc a corrigé en route

`tools/balance-plaza.mjs` balaie les 66 allocations fixes (pas de 10 %) × 4
politiques d'avocats, plus 5 stratégies adaptatives. Il a trouvé quatre défauts
que la lecture n'aurait pas vus :

1. **Le monopole était récompensé deux fois** — aucun péage à verser, et une
   plaza non disputée reste froide. « Tout sur la plus chère » écrasait tout
   (×3,8 sur la pire ligne). D'où `CHALEUR_DOMINANCE` : ta part du corridor te
   coûte de la chaleur.
2. **Erreur dimensionnelle** — la saturation comparait un *stock* (le volume
   mémorisé, ~8,7 jours cumulés) à un *débit* (la capacité en kg/**jour**). Le
   plafond à 100 % masquait le bug ; en l'ôtant, la saturation partait à ×20 et
   l'économie mourait (542 k€ au lieu de 53 M€).
3. **Les rivaux ne grandissaient pas** — 66/66 des allocations finissaient 1res.
   Il n'y avait pas de course, donc pas de jeu. Ils réinvestissent maintenant sur
   la même courbe que le joueur.
4. **Le verdict lui-même était faux, deux fois.** Il a d'abord crié victoire sur
   une économie morte (tout le monde à zéro, donc « personne ne domine ») ; puis
   il a comparé le 1er au 2e alors que les deux étaient *la même stratégie* à 10
   points près. Il mesure désormais la **diversité du haut de tableau** et
   compare le meilleur adaptatif au meilleur figé.

## 4. Le verdict — et pourquoi il est négatif

```
économie vivante        ✅   meilleure ligne : 59,0 M€
course disputée         ✅   16/66 des allocations finissent 1res
défaite atteignable     ❌   0/66 tombent
haut de tableau varié   ❌   les 8 meilleures misent toutes sur frontera
réagir vaut le coup     ❌   meilleur adaptatif 52,9 M€ contre 59,0 M€ figé
```

**Trois constats, tous mesurés :**

- **Une seule plaza rafle le haut du tableau.** La destination se choisit une
  fois, au début. Ce n'est pas une décision vivante, c'est une énigme qu'on
  résout puis qu'on oublie.
- **Lire le plateau ne bat pas un réglage figé.** Et la raison est structurelle :
  tenir une plaza demande **45 % de part soutenue**. Qui réalloue sans cesse ne
  franchit jamais le seuil, ne touche jamais de péage, et en paie toujours. Le
  système récompense l'**engagement**, pas la réactivité.
- **Le péage ne rentre presque jamais.** Un rival rationnel *contourne* la plaza
  qu'on taxe — mesuré en partie réelle : 721 k€ versés contre 124 k€ encaissés.
  Tenir une plaza n'est pas une rente, c'est un **refus de terrain**.

## 5. Ce que ça dit pour la suite

La thèse « on se bat pour un débit » ne tient **que si les sorties ne sont pas
des substituts parfaits**. Ici, les trois plazas sont interchangeables : rien
n'empêche un rival taxé d'aller ailleurs le lendemain, gratuitement. Trois pistes
si on veut sauver l'idée :

1. **Un coût de bascule** — changer de plaza prend des jours, ou coûte. Le
   contournement cesse d'être gratuit et le péage se met à rentrer.
2. **Des capacités serrées** — si la somme des capacités est inférieure à la
   production totale du serveur, personne ne peut éviter une plaza tenue.
3. **Des plazas non substituables** — chaque cartel a un marché de destination
   qui lui est propre, donc un couloir qu'il ne peut pas abandonner.

C'est (1) que je testerais en premier : une constante, et le banc redonne son
verdict en une minute.

## 6. Vérifier

```bash
cd tools
node check.mjs la-plaza          # syntaxe
node invariants-plaza.mjs        # 25 invariants mécaniques
node balance-plaza.mjs           # le balayage et le verdict
node shots-plaza.mjs             # joue la page dans Chromium + captures
```

## 7. [DÉCISION REQUISE]

1. **Sauver la thèse, ou l'abandonner ?** Les trois pistes du §5 sont chiffrables
   en une soirée chacune. Si aucune ne tient, « attaquer pour un débit » n'est
   pas le bon verbe pour un cartel multijoueur, et il vaut mieux le savoir
   maintenant qu'après un backend.
2. **La défaite est hors d'atteinte** (0/66). L'étau existe mécaniquement — un
   invariant le prouve — mais aucune ligne de jeu ne l'atteint. Réglage à
   trancher : seuil du `cerco`, `CHALEUR_K`, ou `CHALEUR_DOMINANCE`.
3. **Tout l'équilibrage est en placeholder**, nommé et groupé en tête de
   `sim.mjs`.
