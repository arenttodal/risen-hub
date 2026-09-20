# Småbruk Støttehub – Rauma

En lokal arbeidsportal for aggressiv, strukturert støttefinansiering av småbruket: seks prosjektområder, støtteordninger, søknadsmaler, dokumentkrav, budsjett, frister og AI-assistent.

## Raskeste bruk
Åpne `index.html` direkte i nettleseren. Data lagres i nettleserens `localStorage`. Bruk **Eksporter data** jevnlig for backup.

## Med AI-assistent
AI-nøkkel skal aldri ligge i HTML/JavaScript i nettleseren. Portalen inkluderer derfor `server.mjs`, som holder nøkkelen server-side og sender kontekst til OpenAI Responses API.

På Mac/Linux med Node 18+:

```bash
cd smabruk-stottehub
export OPENAI_API_KEY="din-nøkkel"
# Valgfritt: export OPENAI_MODEL="gpt-5.6"
node server.mjs
```

Åpne deretter `http://localhost:8787`.

Uten API-nøkkel har portalen fortsatt en enkel lokal copilot som prioriterer frister og dokumentmangler.

## Viktig om frister og regler
Portalen er forhåndsutfylt 8. september 2026. Offisielle utlysninger kan endres. Klikk alltid **offisiell kilde** i støtteordningen før innsending, og oppdater frist/krav dersom ny utlysning avviker.

## Innebygde finansieringsspor
1. Kulturmiljø & bygningsvern
2. Låven som kulturarena
3. Kreativ produksjonsarena
4. Festival & arrangement
5. Frivillighet & lokalsamfunn
6. Næring & reiseliv

## Datasikkerhet
Direkte åpning av `index.html`: informasjon blir liggende lokalt i den aktuelle nettleserprofilen. Filvedlegg lagres ikke i denne første versjonen; dokumentbanken holder status + filnavn/lenke/notat. For flerbruker-/skyversjon bør neste steg være innlogging, database og objektlagring.
