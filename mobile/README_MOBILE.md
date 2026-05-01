# AgriConto Pro - Mobile Companion App

App compagna da campo per Android, pensata per inserire rapidamente spese, giornate, vendite e documenti senza duplicare il desktop.

## Configurazione API

`EXPO_PUBLIC_API_URL` deve puntare al backend FastAPI.

Per Android emulator con backend locale su porta `8001`:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8001
```

Per un telefono Android fisico collegato alla stessa rete del PC:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:8001
```

Sostituisci `192.168.x.x` con l'IP LAN del PC. Su Debian puoi trovarlo con:

```bash
hostname -I
```

Se il backend non risponde, l'app mostra: "Server non raggiungibile. Controlla la connessione o l'indirizzo API." In `Altro -> Profilo e impostazioni` trovi lo stato backend: `Online`, `Non raggiungibile`, `In verifica`.

## Installazione

```bash
cd mobile
npm install
cp .env.example .env
```

## Avvio Backend Su Debian

Dal root del progetto:

```bash
docker compose up
```

Se usi le porte già preparate per lo sviluppo locale, il backend deve essere raggiungibile da host su:

```text
http://localhost:8001
```

Verifica:

```bash
curl http://localhost:8001/health
```

## Android Emulator

1. Avvia un emulatore da Android Studio.
2. In `mobile/.env`, usa:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8001
```

3. Avvia Expo:

```bash
npm run android
```

In alternativa:

```bash
npx expo start
```

Poi premi `a` nella console Expo.

Nota: l'emulatore Android usa normalmente `10.0.2.2` per raggiungere il `localhost` del PC. `adb reverse tcp:8001 tcp:8001` puo essere utile in alcuni setup, ma non e il percorso principale per Expo su emulator.

## Telefono Android Fisico

1. Collega PC e telefono alla stessa rete Wi-Fi.
2. Trova l'IP LAN del PC:

```bash
hostname -I
```

3. In `mobile/.env`, imposta:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:8001
```

4. Avvia Expo:

```bash
npx expo start
```

5. Apri Expo Go sul telefono e scansiona il QR code.

Se non si connette, controlla firewall Debian, rete Wi-Fi ospite, VPN, IP corretto e che il backend ascolti su una porta raggiungibile dalla LAN.

## Permessi Fotocamera

La prima acquisizione da `Documenti` mostra il prompt permessi. Se viene negato:

Android: Impostazioni -> App -> Expo Go o AgriConto Pro -> Permessi -> Fotocamera -> Consenti.

## Log

Console Expo:

```bash
npx expo start
```

Log dispositivo Android:

```bash
adb logcat
```

## Sicurezza

- Token JWT solo in `expo-secure-store`.
- Nessun token o password nei log.
- Logout e risposta `401` rimuovono la sessione.
- RBAC e isolamento azienda restano autorita del backend.
- Le bozze offline non sono record finali finche il backend non le accetta.

## Offline

Spese, giornate e vendite possono essere salvate come bozze offline. Ogni bozza contiene ID unico, tipo, payload, data creazione, stato, ultimo tentativo, errore e retry count.

Stati:

- `pending`: in attesa
- `syncing`: invio in corso
- `synced`: accettata dal backend
- `error`: non sincronizzata

La sincronizzazione non marca mai una bozza come completata prima del successo backend. Le bozze fallite possono essere ritentate o eliminate da `Altro -> Sincronizzazione`.

Limitazione MVP: il caricamento documenti offline non salva ancora file/immagini in modo persistente. Se provi offline, l'app mostra: "Il caricamento documenti offline sarà disponibile in una prossima versione. Puoi riprovare quando la connessione è attiva."

## API Usate

| Metodo | Endpoint |
|---|---|
| GET | `/health` |
| POST | `/api/v1/auth/login` |
| GET | `/api/v1/auth/me` |
| GET | `/api/v1/farms` |
| GET | `/api/v1/farms/{farm_id}/workers` |
| GET | `/api/v1/farms/{farm_id}/workdays` |
| POST | `/api/v1/farms/{farm_id}/workdays` |
| POST | `/api/v1/farms/{farm_id}/workdays/{id}/entries` |
| GET | `/api/v1/farms/{farm_id}/expenses` |
| POST | `/api/v1/farms/{farm_id}/expenses` |
| GET | `/api/v1/farms/{farm_id}/sales` |
| POST | `/api/v1/farms/{farm_id}/sales` |
| POST | `/api/v1/farms/{farm_id}/documents/upload` |
| GET | `/api/v1/farms/{farm_id}/reports/monthly` |

## Quality Check

```bash
npm run lint
npx expo start
npm run android
```

Checklist manuale campo:

- Login successo e fallimento.
- `/auth/me` carica il profilo.
- Una sola azienda viene selezionata automaticamente.
- Piu aziende possono essere selezionate.
- Cambio azienda aggiorna le query.
- Spesa online arriva al backend; offline resta bozza.
- Giornata online arriva al backend; offline resta bozza e poi si sincronizza.
- Vendita online arriva al backend; offline resta bozza.
- Documento online carica; offline comunica la limitazione.
- `401` riporta al login.
- Nessun segreto nel bundle o nei log.
