# 🕵️ Rapport de Pentest - runable.com

**Date:** 24 septembre 2026  
**Cible:** https://runable.com  
**Outils utilisés:** Python requests, Browser automation, Custom scripts

---

## 📋 Résumé Exécutif

Le site **runable.com** est une application SaaS AI bien protégée par Cloudflare. Plusieurs vulnérabilités potentielles ont été identifiées, notamment l'absence de Content-Security-Policy et l'accessibilité de l'endpoint `/admin` sans authentification visible.

**Niveau de sécurité global:** ⚠️ **Moyen**

---

## 🔍 Informations Générales

| Paramètre | Valeur |
|-----------|--------|
| Status HTTP | 200 OK |
| Server | Cloudflare |
| SSL/TLS | HSTS activé (max-age=15552000) |
| CDN | Cloudflare |
| Framework | Next.js / React (SPA) |

---

## 🛡️ Headers de Sécurité

| Header | Statut | Valeur |
|--------|--------|--------|
| X-Frame-Options | ✅ | SAMEORIGIN |
| X-Content-Type-Options | ✅ | nosniff |
| Strict-Transport-Security | ✅ | max-age=15552000 |
| Content-Security-Policy | ❌ | MANQUANT |
| X-XSS-Protection | ❌ | MANQUANT |
| Referrer-Policy | ✅ | strict-origin-when-cross-origin |

---

## 🎯 Endpoints Découverts

| Endpoint | Status | Description |
|----------|--------|-------------|
| `/admin` | 200 | Panel admin potentiel |
| `/admin/users` | 200 | Liste utilisateurs |
| `/admin/settings` | 200 | Paramètres |
| `/robots.txt` | 200 | Fichier robots |
| `/sitemap.xml` | 200 | Sitemap (1261 URLs) |
| `/sign-in` | 200 | Page de connexion |

---

## 🐛 Vulnérabilités Identifiées

### 🔴 HIGH: /admin accessible sans authentification
```
GET /admin HTTP/1.1
Host: runable.com

Status: 200 OK
Content-Length: 13953
```
L'endpoint `/admin` est accessible sans authentification visible. Les sous-endpoints `/admin/users` et `/admin/settings` retournent également du contenu.

### 🟡 MEDIUM: Pas de Content-Security-Policy
Absence de header CSP, augmentant le risque d'attaques XSS et d'injection de scripts malveillants.

### 🟢 LOW: API GraphQL exposée
L'API GraphQL est hébergée sur `graphql.runable.com` mais protégée par Cloudflare (404 sans authentification).

### 🟢 LOW: Pas de X-XSS-Protection
Header de protection XSS manquant (bien que la plupart des navigateurs modernes le gèrent nativement).

---

## 🧪 Tests Effectués

| Test | Résultat |
|------|----------|
| XSS (Cross-Site Scripting) | ✅ Filtré |
| SQL Injection | ✅ Filtré |
| Open Redirect | ✅ Non trouvé |
| CSRF Token | ⚠️ Non détecté |
| Directory Bruteforce | ⚠️ 3 endpoints trouvés |
| API GraphQL | ✅ 404 (protégé) |

---

## 🏗️ Technologies Détectées

- **CDN/WAF:** Cloudflare
- **Framework:** Next.js / React (SPA)
- **Analytics:** PostHog, Google Tag Manager, Ahrefs, Dub
- **Anti-bot:** Cloudflare Turnstile
- **AI:** OpenAI SDK
- **Auth:** Connexion par numéro de téléphone

---

## 📂 Assets JavaScript Découverts

Plus de 100 chunks JavaScript chargés dynamiquement:
- `assets/index-SW1V8PR8.js` (main bundle)
- `assets/auth-queries-mNHJ23eT.js` (auth)
- `assets/posthog-DvHSGVaB.js` (analytics)
- `assets/orpc-Ad6qB_iO.js` (oRPC client)
- `assets/useLiveQuery-BLdnHUml.js` (live queries)

---

## 💡 Recommandations

1. **Ajouter un Content-Security-Policy strict**
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
   ```

2. **Protéger /admin avec authentification**
   - Ajouter un middleware d'authentification
   - Ou déplacer sous un sous-domaine privé

3. **Désactiver l'introspection GraphQL en production**

4. **Ajouter X-XSS-Protection header**
   ```
   X-XSS-Protection: 1; mode=block
   ```

5. **Réduire le contenu du sitemap.xml** (1261 URLs est beaucoup)

6. **Ajouter un token CSRF** sur les formulaires

---

## 📝 Conclusion

Le site runable.com présente une sécurité **globalement correcte** grâce à Cloudflare, mais plusieurs améliorations sont recommandées pour renforcer la protection contre les attaques XSS et l'exposition de données sensibles via l'endpoint `/admin`.

---

*Généré par Argus - Autonomous Agent*
