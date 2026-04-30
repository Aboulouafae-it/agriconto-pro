# Centro Statistiche e Analisi

Il Centro Statistiche e Analisi e il modulo BI di AgriConto Pro. Non sostituisce commercialista, consulente del lavoro, INPS, INAIL, Agenzia delle Entrate o sistemi ufficiali: organizza dati gestionali e prepara letture verificabili.

## Sicurezza

- Ogni endpoint e sotto `/api/v1/farms/{farm_id}/analytics`.
- `farm_id` resta il confine tenant.
- Il backend verifica membership e ruolo prima di generare aggregazioni.
- `OWNER` e `ACCOUNTANT` possono vedere analytics economiche, documentali, colture, campi e confronto.
- `LABOR_CONSULTANT` puo vedere solo analytics lavoratori/manodopera.
- `WORKER` non puo vedere analytics aziendali.
- I filtri sono validati lato server.
- La UI nasconde sezioni non pertinenti al ruolo, ma non e una misura di sicurezza.

## Endpoint

- `GET /overview`
- `GET /financial`
- `GET /crops`
- `GET /fields`
- `GET /labor`
- `GET /expenses`
- `GET /sales`
- `GET /documents`
- `GET /comparison`
- `GET /advanced-metrics`
- `GET /tables`

## Performance

La prima implementazione usa aggregazioni server-side su dati farm-scoped. Quando i volumi cresceranno:

- materializzare riepiloghi mensili,
- paginare tabelle pesanti,
- aggiungere cache per filtri ricorrenti,
- separare export asincroni con `report_exports`,
- creare indici compositi su `farm_id` + date operative.

## Estensioni previste

- budget vs consuntivo,
- anomaly detection,
- forecast stagionale,
- mappe con coordinate campo/cliente,
- snapshot condivisibili,
- pacchetto analitico inviabile al commercialista.
