# Plastigia Customers

Εσωτερική εφαρμογή B2B CRM για την παρακολούθηση υποψήφιων και ενεργών πελατών
(καταστήματα ειδών υγιεινής, πλακιδίων και οικοδομικών υλικών) σε όλη την
Ελλάδα. Χτισμένη με Next.js (App Router), Tailwind CSS, react-leaflet και
Supabase.

## Δομή project

```
customers/
├── data/
│   ├── stores_raw.json      # εξαγωγή από το αρχικό Excel (script: extract_excel.py)
│   ├── city_coords.json     # cache geocoding ανά πόλη (script: geocode_cities.py)
│   └── stores.json          # τελικό dataset προς seeding (script: merge_coords.py)
├── scripts/
│   ├── extract_excel.py     # Excel -> data/stores_raw.json
│   ├── geocode_cities.py    # geocoding πόλεων μέσω Nominatim/OSM
│   ├── merge_coords.py      # συνδυάζει raw δεδομένα + συντεταγμένες -> stores.json
│   └── seed.ts              # data/stores.json -> πίνακας Supabase `stores`
├── supabase/
│   └── schema.sql           # SQL schema (πίνακας, enum, RLS policies)
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx          # κεντρική σελίδα: Header, FilterBar, List, Map, Detail
    │   └── globals.css
    ├── api/
    │   ├── extract-store/route.ts      # Vision AI (Claude Opus 5) → δομημένα στοιχεία από φωτογραφία
    │   ├── extract-stores-pdf/route.ts # Vision AI → λίστα καταστημάτων από PDF
    │   └── geocode/route.ts            # server-side proxy προς Nominatim (νέα καταστήματα → pin στον χάρτη)
    ├── components/
    │   ├── Header.tsx
    │   ├── StatsWidget.tsx    # % διείσδυση αγοράς
    │   ├── FilterBar.tsx      # αναζήτηση + φίλτρα διαμερίσματος/κατάστασης
    │   ├── ListView.tsx       # λίστα καταστημάτων με χρωματική κωδικοποίηση
    │   ├── MapView.tsx        # χάρτης react-leaflet με χρωματιστά pins
    │   ├── StoreDetailPanel.tsx    # modal: στοιχεία, status buttons, σημειώσεις, διαγραφή
    │   ├── AddStoreModal.tsx       # modal: χειροκίνητη καταχώρηση + "Έξυπνη Προσθήκη" με AI
    │   └── ImportStoresModal.tsx   # modal: μαζική εισαγωγή από Excel/CSV/PDF
    ├── lib/
    │   ├── types.ts             # τύποι Store/StoreStatus + χρωματικοί κανόνες
    │   ├── regions.ts           # σταθερή λίστα γεωγραφικών διαμερισμάτων
    │   ├── importParser.ts      # client-side parsing Excel/CSV (SheetJS) + column mapping
    │   ├── supabaseClient.ts
    │   └── useFilteredStores.ts
    └── store/
        └── useAppStore.ts       # Zustand store (κεντρικό state Map ↔ List ↔ Add ↔ Import)
```

## Χρωματική κωδικοποίηση κατάστασης

| Κατάσταση                          | Χρώμα           |
| ----------------------------------- | --------------- |
| Μη πελάτης (προεπιλογή)            | Λευκό            |
| Ενεργός πελάτης                    | Κόκκινο          |
| Σε επικοινωνία, χωρίς συμφωνία     | Κίτρινο          |
| Απορρίφθηκε                        | Μαύρο (λευκό κείμενο) |

Οι κανόνες ορίζονται σε ένα σημείο: [`src/lib/types.ts`](src/lib/types.ts)
(`STATUS_STYLES`), και χρησιμοποιούνται τόσο από τη λίστα όσο και από τα pins
του χάρτη — ώστε να μη χρειάζεται συγχρονισμός χρωμάτων σε πολλά σημεία.

## State management (Map ↔ List ↔ Detail)

Όλο το κοινό state ζει σε ένα μοναδικό Zustand store
([`src/store/useAppStore.ts`](src/store/useAppStore.ts)):

- `stores`: όλα τα καταστήματα (φορτώνονται μία φορά από το Supabase στο mount).
- `selectedStoreId`: ποιο κατάστημα είναι επιλεγμένο. Το click σε λίστα *και*
  σε pin του χάρτη γράφουν στο ίδιο πεδίο, οπότε:
  - Η λίστα κάνει scroll στο επιλεγμένο στοιχείο (`ListView`, `useEffect` +
    `scrollIntoView`).
  - Ο χάρτης κάνει `flyTo` στις συντεταγμένες του και ανοίγει το popup του
    (`MapView`, component `FlyToSelected`).
  - Το `StoreDetailPanel` εμφανίζεται ως modal όποτε το `selectedStoreId`
    δεν είναι `null`.
- `searchQuery`, `filterRegion`, `filterStatus`: τα φίλτρα. Ο υπολογισμός
  του φιλτραρισμένου συνόλου γίνεται σε ένα κοινό hook
  ([`useFilteredStores`](src/lib/useFilteredStores.ts)) που καταναλώνουν και
  η λίστα και ο χάρτης — έτσι δείχνουν πάντα ακριβώς τα ίδια καταστήματα.
- `updateStatus` / `updateNotes`: κάνουν optimistic update στο τοπικό state
  και ταυτόχρονα γράφουν στο Supabase· αν αποτύχει το write, γίνεται rollback.

Το στατιστικό διείσδυσης αγοράς (`StatsWidget`) υπολογίζεται πάνω στο **πλήρες**
σύνολο `stores` (όχι το φιλτραρισμένο), όπως ζητήθηκε: ποσοστό ενεργών πελατών
επί του συνόλου των καταστημάτων στη βάση.

## Προσθήκη νέου καταστήματος

Το κουμπί **"+ Νέο Κατάστημα"** (κάτω δεξιά) ανοίγει το [`AddStoreModal`](src/components/AddStoreModal.tsx)
με δύο τρόπους καταχώρησης:

1. **Χειροκίνητη καταχώρηση** — απλή φόρμα (Επωνυμία, Κατηγορία, Διεύθυνση,
   Τηλέφωνο, Πόλη, Διαμέρισμα).
2. **Έξυπνη Προσθήκη (AI)** — ανεβάζεις/φωτογραφίζεις πινακίδα καταστήματος,
   επαγγελματική κάρτα ή απόδειξη. Η εικόνα στέλνεται στο
   [`/api/extract-store`](src/app/api/extract-store/route.ts), το οποίο καλεί
   το **Claude Opus 5** (Vision) με ένα *forced tool call*
   (`extract_store_info`, `strict: true`) ώστε η απάντηση να είναι πάντα
   έγκυρο JSON με τα πεδία name/category/address/phone/city/region. Το
   αποτέλεσμα γεμίζει αυτόματα τη φόρμα χειροκίνητης καταχώρησης για έλεγχο
   πριν την αποθήκευση — ο χρήστης έχει πάντα τον τελευταίο λόγο.

Κατά την αποθήκευση (και στους δύο τρόπους), το `addStore` action στο
[`useAppStore`](src/store/useAppStore.ts):

1. Καλεί το [`/api/geocode`](src/app/api/geocode/route.ts) (proxy προς
   Nominatim) για να βρει συντεταγμένες με βάση την πόλη, ώστε το νέο
   κατάστημα να εμφανιστεί αμέσως και ως pin στον χάρτη.
2. Κάνει `insert` στον πίνακα `stores` του Supabase με status `not_client`
   (λευκό/προεπιλογή) και κενές σημειώσεις.
3. Προσθέτει το νέο κατάστημα στο τοπικό state και το επιλέγει αυτόματα.

Χρειάζεται `ANTHROPIC_API_KEY` στο `.env.local` μόνο για το Smart Add — η
χειροκίνητη καταχώρηση δουλεύει χωρίς αυτό.

## Μαζική εισαγωγή από αρχείο

Το κουμπί **"📁 Εισαγωγή Αρχείου"** ανοίγει το
[`ImportStoresModal`](src/components/ImportStoresModal.tsx), που δέχεται:

- **Excel (.xlsx/.xls) ή CSV** — γίνεται parsing 100% στο browser με τη
  βιβλιοθήκη SheetJS (`src/lib/importParser.ts`), χωρίς να στέλνεται το
  αρχείο πουθενά. Οι στήλες αναγνωρίζονται αυτόματα μέσω λίστας ελληνικών/
  αγγλικών συνωνύμων (π.χ. "Επωνυμία"/"Name", "Πόλη/Νησί"/"City",
  "Γεωγραφικό Διαμέρισμα"/"Region") — δεν χρειάζεται να ταιριάζουν ακριβώς
  με τις στήλες του αρχικού dataset.
- **PDF** — στέλνεται στο [`/api/extract-stores-pdf`](src/app/api/extract-stores-pdf/route.ts),
  που καλεί το Claude Opus 5 με το PDF ως document input και έναν forced
  tool call (`extract_store_list`, `strict: true`) που επιστρέφει έναν
  πίνακα έως 300 καταστημάτων σε δομημένο JSON.

Και στις δύο περιπτώσεις εμφανίζεται **preview πίνακας** πριν την εισαγωγή:
γραμμές χωρίς Επωνυμία/Πόλη/Διαμέρισμα αποεπιλέγονται αυτόματα, ο χρήστης
μπορεί να αποεπιλέξει κι άλλες, και μόνο οι επιλεγμένες εισάγονται. Η
εισαγωγή γίνεται γραμμή-γραμμή μέσω του ήδη υπάρχοντος `addStore` action
(άρα κάθε νέο κατάστημα γεωκωδικοποιείται αυτόματα μέσω `/api/geocode`
πριν αποθηκευτεί) με progress bar· αποτυχίες μεμονωμένων γραμμών δεν
σταματούν την υπόλοιπη εισαγωγή.

Το SheetJS (`xlsx`) είναι βαριά βιβλιοθήκη (~200KB) — το modal φορτώνεται
με `next/dynamic` ώστε να μην επιβαρύνει το αρχικό bundle της εφαρμογής για
όσους δεν χρησιμοποιούν ποτέ αυτό το feature. Σημείωση: το πακέτο `xlsx`
εγκαθίσταται από το επίσημο CDN της SheetJS (`cdn.sheetjs.com`), όχι από το
npm registry — η εκδοχή στο npm έχει γνωστά ανεπιδιόρθωτα security advisories.

## Αξιοπιστία & πωλήσεις (reliability / sales)

- **Error boundary** (`src/app/error.tsx`, `global-error.tsx`) — ένα απρόσμενο
  σφάλμα δείχνει πλέον ένα φιλικό μήνυμα με κουμπί "Δοκιμή Ξανά" αντί για το
  γενικό "Application error" του browser.
- **Marker clustering** στον χάρτη (`react-leaflet-cluster`) — απαραίτητο με
  εκατοντάδες pins σε πανελλαδικό zoom. Το click σε επιλεγμένο κατάστημα
  χρησιμοποιεί `zoomToShowLayer` ώστε να «σπάει» σωστά το cluster πριν
  ανοίξει το popup.
- **Ιστορικό σημειώσεων** (πίνακας `store_notes`) — κάθε σημείωση είναι μια
  ξεχωριστή, χρονοσημασμένη εγγραφή αντί να αντικαθιστά την προηγούμενη.
  Το παλιό πεδίο `stores.notes` παραμένει στη βάση για συμβατότητα αλλά δεν
  ενημερώνεται πια.
- **Υπενθύμιση επόμενης επαφής** (`stores.next_contact_date`) — πεδίο
  ημερομηνίας στο detail panel· όταν περάσει, το κατάστημα εμφανίζεται με
  κόκκινη ένδειξη "⏰ εκπρόθεσμο" στη λίστα, και υπάρχει φίλτρο
  "⏰ Εκπρόθεσμα" στο FilterBar για να τα βλέπεις όλα μαζί.
- **Φίλτρο κατηγορίας** στο FilterBar, δίπλα σε διαμέρισμα/κατάσταση.
- **Export σε Excel** (κουμπί στο Header) — κατεβάζει τη **φιλτραρισμένη**
  λίστα καταστημάτων ως `.xlsx`, client-side (ίδιο SheetJS με το import).

⚠️ Αν το project σου δημιουργήθηκε πριν από αυτές τις αλλαγές, τρέξε το
[`supabase/migrations/003_notes_history_and_reminders.sql`](supabase/migrations/003_notes_history_and_reminders.sql)
στο SQL editor του Supabase — προσθέτει τη στήλη `next_contact_date`, τον
πίνακα `store_notes`, και διορθώνει μια **λείπουσα DELETE policy** που
έκανε το κουμπί διαγραφής καταστήματος να αποτυγχάνει σιωπηλά.

## Εγκατάσταση & εκτέλεση

### 1. Δημιουργία project στο Supabase

1. Φτιάξε νέο project στο [supabase.com](https://supabase.com).
2. Άνοιξε το **SQL editor** και τρέξε ολόκληρο το περιεχόμενο του
   [`supabase/schema.sql`](supabase/schema.sql).
3. Από **Project Settings → API**, αντίγραψε το `Project URL`, το
   `anon public` key και το `service_role` key.

### 2. Μεταβλητές περιβάλλοντος

```bash
cp .env.example .env.local
```

Συμπλήρωσε το `.env.local` με τα στοιχεία του project σου.

### 3. Εγκατάσταση dependencies

```bash
npm install
```

### 4. Seed δεδομένων (μία φορά)

Τα δεδομένα των καταστημάτων έχουν ήδη επεξεργαστεί από το αρχικό Excel σε
`data/stores.json` (με geocoded συντεταγμένες ανά πόλη). Για να γεμίσεις τον
πίνακα `stores` στο Supabase:

```bash
npm run seed
```

Το script κάνει *upsert* με βάση το `id` — είναι ασφαλές να ξανατρέξει χωρίς
να διαγράψει status/σημειώσεις που έχεις ήδη καταχωρήσει μέσα από την
εφαρμογή (εκτός αν περάσεις `-- --force`, που αντικαθιστά τα πάντα από το
αρχείο πηγής).

Αν αλλάξεις/προσθέσεις δεδομένα στο αρχικό Excel, μπορείς να ξαναπαράγεις το
`data/stores.json` με:

```bash
python3 scripts/extract_excel.py     # Excel -> stores_raw.json
python3 scripts/geocode_cities.py    # γεωκωδικοποίηση νέων πόλεων (cache-aware)
python3 scripts/merge_coords.py      # -> stores.json
```

### 5. Εκκίνηση dev server

```bash
npm run dev
```

Άνοιξε [http://localhost:3000](http://localhost:3000).

## Σημειώσεις υλοποίησης

- **Συντεταγμένες**: το αρχικό Excel δεν περιείχε lat/lng, μόνο διευθύνσεις.
  Αρχικά έγινε geocoding σε επίπεδο **πόλης** μέσω του δωρεάν
  Nominatim/OpenStreetMap API (`scripts/geocode_cities.py` + `merge_coords.py`),
  με τυχαία μετατόπιση (jitter) ώστε τα pins της ίδιας πόλης να μην
  επικαλύπτονται. Για ακρίβεια σε επίπεδο **οδού**, υπάρχει δεύτερο πέρασμα
  μέσω Google Maps Geocoding API:
  1. `export GOOGLE_MAPS_API_KEY=...` και `python3 scripts/geocode_google.py`
     — γεωκωδικοποιεί την πλήρη διεύθυνση κάθε καταστήματος (cache ανά id σε
     `data/store_coords_google.json`, οπότε rerun μετά από αποτυχία δεν
     ξαναχρεώνει τα ήδη επιτυχημένα).
  2. `python3 scripts/merge_precise_coords.py` — συνδυάζει precise Google
     συντεταγμένες με city-level fallback (για ό,τι δεν βρέθηκε) σε
     `data/stores_precise.json`.
  3. `npx tsx scripts/update_coords.ts` — ενημερώνει **μόνο** τις στήλες
     lat/lng υπαρχόντων rows στο Supabase, χωρίς να πειράξει status/σημειώσεις
     που έχουν ήδη καταχωρηθεί μέσα από την εφαρμογή.
- **RLS**: το schema ανοίγει read/write σε οποιονδήποτε έχει το anon key,
  κατάλληλο για μικρή εσωτερική ομάδα πωλήσεων πίσω από ένα private URL. Αν
  χρειαστεί έλεγχος ανά χρήστη, πρόσθεσε Supabase Auth και προσάρμοσε τις
  policies στο `supabase/schema.sql`.
- **Πραγματικού χρόνου ενημέρωση μεταξύ χρηστών** δεν έχει προστεθεί (κάθε
  χρήστης φορτώνει τα δεδομένα στο mount). Εύκολη προσθήκη αργότερα μέσω
  Supabase Realtime (`supabase.channel(...).on('postgres_changes', ...)`).
