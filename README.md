# Tennis for Two

Et lite Pong/Tennis for Two-inspirert spill laget med HTML, CSS og JavaScript.

## Kontroller

- Spiller 1: `W` og `S`
- Spiller 2: `Pil opp` og `Pil ned`

## Firebase

Resultater lagres i Firestore-samlingen `tennisForTwoScores`. Hvis Firebase ikke er tilgjengelig, lagres resultatet lokalt i nettleseren.

## Sikkerhet

Firebase web-API-nøkkelen er synlig i frontend-kode. Det er normalt for Firebase, så sikkerheten må ligge i Firebase-reglene og prosjektinnstillingene.

Dette prosjektet har `firestore.rules` som:

- kun tillater lesing av resultater
- kun tillater oppretting av nye score-dokumenter med forventede felter
- blokkerer endring og sletting
- blokkerer alle andre Firestore-samlinger

Anbefalt i Firebase Console:

- Begrens API-nøkkelen til egne domener under Google Cloud Credentials.
- Slå på Firebase App Check for webappen.
- Bruk strengere regler med innlogging hvis resultatene ikke skal kunne lagres anonymt.

For Firebase Hosting kan prosjektet publiseres fra denne mappen med:

```powershell
firebase deploy
```
