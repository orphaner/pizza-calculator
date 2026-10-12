# 🍕 Pizza Calculator

Un calculateur intelligent d'ingrédients pour pâte à pizza, développé avec Angular. Ce projet vous aide à calculer les proportions parfaites d'ingrédients en fonction du nombre de portions désirées.

## ✨ Fonctionnalités

### 🎯 Calcul Intelligent
- Calcul automatique des proportions de farine, eau, sel, levure et huile d'olive
- Validation des entrées avec messages d'erreur informatifs
- Calculs basés sur les ratios professionnels de boulangerie

### 🍕 Styles de Pizza Prédéfinis
- **Classique**: Pâte à pizza traditionnelle (56% hydratation)
- **Napolitaine**: Style authentique napolitain (65% hydratation)
- **New York**: Style new-yorkais avec plus d'huile (58% hydratation)
- **Sicilienne**: Pâte épaisse sicilienne très huilée (70% hydratation)

### 💾 Gestion des Recettes
- Sauvegarde de vos recettes personnalisées au format JSON
- Chargement de recettes précédemment sauvegardées
- Export facile pour partager vos créations

### 📱 Design Moderne
- Interface responsive optimisée pour mobile
- Cartes d'ingrédients avec dégradés colorés et animations
- Design moderne avec CSS Grid et Flexbox

### 🔧 Fonctionnalités Techniques
- TypeScript avec interfaces strictes
- Validation complète des entrées utilisateur
- Gestion d'erreurs robuste
- Tests unitaires complets
- Code bien documenté et maintenable

## 🚀 Développement

### Prérequis
- [mise](https://mise.jdx.dev/) pour gérer la version de Node.js (voir `mise.toml`)
- npm

### Installation
```bash
mise install   # installe la version de Node.js définie dans mise.toml
npm install
```

### Serveur de développement
```bash
npm start
```
Naviguer vers `http://localhost:4200/`. L'application se recharge automatiquement lors des modifications.

### Build
```bash
npm run build          # Build de développement
npm run build:prod     # Build de production
```

### Tests
```bash
npm test              # Tests unitaires
npm run e2e           # Tests end-to-end
```

## 🎨 Utilisation

1. **Configurer les portions**: Définissez le nombre et le poids des pâtons adultes et enfants
2. **Choisir un style**: Sélectionnez un style de pizza prédéfini ou personnalisez les paramètres
3. **Consulter les ingrédients**: Les proportions sont calculées automatiquement
4. **Sauvegarder**: Exportez votre recette pour la réutiliser plus tard

## 🏗️ Architecture

- **Angular 9** avec Ivy renderer
- **Bootstrap 4** pour le design responsive
- **ngx-bootstrap** pour les composants UI
- **TypeScript** avec typage strict
- **SCSS** pour les styles avancés

## 🤝 Contribution

Les contributions sont les bienvenues! N'hésitez pas à:
- Signaler des bugs
- Proposer de nouvelles fonctionnalités
- Améliorer la documentation
- Ajouter de nouveaux styles de pizza

## 📄 Licence

Ce projet est sous licence MIT.
