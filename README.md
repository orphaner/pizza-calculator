# 🍕 Pizza Calculator

Calcule le poids de chaque ingrédient d'une pâte à pizza à partir du nombre de pâtons voulus, avec ou sans biga.

👉 **https://pizza.beroot.org**

## ✨ Fonctionnalités

- **Portions** : nombre et poids des pâtons adultes et enfants.
- **Paramètres de la pâte** : taux d'hydratation (%), levure, sel et huile d'olive (en g par kg de farine).
- **Biga** (activée par défaut) : la part de farine qui part dans la biga (%), puis la recette en deux temps, la biga à préparer la veille et la pâte finale du jour J.
- Recalcul instantané à chaque modification, sans bouton.
- Responsive : les sections s'empilent sur mobile et se placent côte à côte sur grand écran.

## 🧮 Le calcul

Le poids total de pâte (somme des pâtons) est réparti entre farine et eau selon l'hydratation :

```
farine = total / (1 + hydratation)
eau    = total − farine
```

Le sel, la levure et l'huile sont proportionnels à la farine, et **ne comptent pas** dans le poids total des pâtons.

Avec la biga, la farine de biga correspond au pourcentage choisi de la farine totale. La biga est hydratée à 50 % (valeur fixe), et la levure se répartit au prorata de la farine. La pâte finale reçoit la biga entière, puis le reste de farine, d'eau et de levure, ainsi que tout le sel et toute l'huile.

## 🚀 Développement

### Prérequis
- [mise](https://mise.jdx.dev/), qui installe la version de Node.js épinglée dans `mise.toml`.

### Installation
```bash
mise install
npm ci
```

### Serveur de développement
```bash
mise run start        # http://localhost:4200
mise run start-lan    # accessible depuis le réseau local, pour tester sur mobile
```

### Build
```bash
npm run build         # build de développement
mise run build-prod   # build de production → dist/pizza-calculator/browser
```

### Tests et qualité
```bash
npm test                         # tests unitaires (Vitest, mode watch)
npm test -- --watch=false        # une seule exécution
mise run e2e                     # tests d'intégration Playwright (desktop + mobile)
mise run e2e-ui                  # mode UI de Playwright, interactif
npm run lint                     # ESLint
```

Les tests e2e démarrent eux-mêmes le serveur de développement. Ils n'utilisent que Chromium, à installer une fois avec `npx playwright install chromium`.

## ☁️ Déploiement

L'app est 100 % statique. Elle est servie par **Cloudflare Workers** (assets statiques, configuration dans `wrangler.jsonc`).

- **Automatique** : chaque push sur `main` lance lint, tests unitaires et tests e2e, puis déploie si tout passe (`.github/workflows/deploy.yml`). Les pull requests lancent les mêmes tests, sans déployer.
- **Manuel** :
  ```bash
  mise run cf-login     # une fois par machine
  mise run cf-dev       # sert le build de production en local, sur le runtime Workers
  mise run cf-deploy    # build de production + déploiement
  ```

Pour héberger l'app soi-même, une image Docker (NGINX) est aussi disponible :

```bash
docker build -t pizza-calculator:local .
docker run --rm -p 8080:80 pizza-calculator:local   # http://localhost:8080
```

## 🏗️ Stack

- **Angular 22**, composant standalone, sans zone.js (zoneless)
- **Bootstrap 5** et SCSS
- **TypeScript** en mode strict
- **Vitest** (tests unitaires) et **Playwright** (tests d'intégration)
- **Cloudflare Workers** (hébergement) et **GitHub Actions** (CI/CD)

## 📄 Licence

Ce projet est sous licence MIT, voir [LICENSE](LICENSE).
