# Mimouni Music Studio

Web application and management portal for Mimouni Music Studio (Tunis, Tunisia). Built with React, Vite, Tailwind CSS, TypeScript, and live Firebase (Auth, Firestore, Storage).

---

## Setup

Follow these exact steps in the Firebase Console to configure Firebase for this project.

### 1. Create a Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g. `mimouni-music-studio`), toggle Google Analytics according to your preference, and click **Create project**.

### 2. Register a Web App
1. On your Firebase project overview page, click the **Web** icon (`</>`) to add an app.
2. Enter an app nickname (e.g. `Mimouni Web App`). Do not check Firebase Hosting unless desired.
3. Click **Register app**.
4. Copy the `firebaseConfig` keys from the SDK snippet:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`
5. Place these values in your local `.env` file (copied from `.env.example`).

### 3. Enable Authentication
1. In the Firebase console left navigation, select **Build > Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab:
   - **Email/Password**: Click **Email/Password**, toggle **Enable**, and click **Save**. (Leave "Email link (passwordless sign-in)" disabled).
   - **Google**: Click **Google**, toggle **Enable**, set the project support email, and click **Save**.
4. In the **Authorized domains** list under Authentication Settings:
   - Ensure `localhost` and your application's domain are present.
5. Create or identify the administrator account:
   - Under the **Users** tab, click **Add user** (or sign up via the app).
   - Enter the admin email and a secure password.
   - Copy the generated **UID** from the user's row in the table.
   - Set `VITE_ADMIN_UID="<the-copied-uid>"` in your `.env` file.
   - In `firestore.rules` and `storage.rules`, replace `"REPLACE_ME"` on line 12 with the same UID.

### 4. Enable Cloud Firestore
1. In the Firebase console left navigation, select **Build > Firestore Database**.
2. Click **Create database**.
3. Select your Cloud Firestore location (e.g., `eur3` or `europe-west1` for low latency to Tunisia).
4. Choose **Start in production mode** (or test mode; our rules will secure it) and click **Create**.
5. Once created, click the **Rules** tab at the top.
6. Copy the entire contents of `firestore.rules` from this repository, paste it into the editor (ensuring your `ADMIN_UID` is set), and click **Publish**.

### 5. Enable Cloud Storage
1. In the Firebase console left navigation, select **Build > Storage**.
2. Click **Get started**.
3. Keep default security rules temporarily and choose your Cloud Storage bucket location (match your Firestore region).
4. Click **Done**.
5. Click the **Rules** tab at the top.
6. Copy the entire contents of `storage.rules` from this repository, paste it into the editor (ensuring your `ADMIN_UID` is set), and click **Publish**.
7. *(Optional)* Configure CORS on your Storage bucket if uploading photos directly from the browser domain:
   ```bash
   echo '[{"origin": ["*"], "method": ["GET", "PUT", "POST", "HEAD"], "responseHeader": ["*"], "maxAgeSeconds": 3600}]' > cors.json
   gsutil cors set cors.json gs://<your-storage-bucket>
   ```

### 6. Local Development
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Fill in all `VITE_FIREBASE_*` and `VITE_ADMIN_UID` values with those from the steps above.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server on port 3000:
   ```bash
   npm run dev
   ```

---

## Architecture & Features

### Public Site
- Bilingual (English & French) responsive landing page with custom branding.
- **Instrument Courses**: Dynamic course cards with duration and curriculum details.
- **Interactive Tuition Calculator**: Real-time pricing calculation based on sessions per week and lesson length, backed by the single admin rate setting (`ratePer30Min`).
- **Direct Enrollment / Request Modal**: Visitor booking requests with phone and email validation, submitted directly to Firestore.
- **Photo Gallery**: Clean, edge-to-edge photo showcase with lightbox viewer.
- **Promo Banner**: Slim top announcement bar with schedule window (start/end date) and optional link.
- **Contact Details**: Synced phone, email, address, and social links editable by the admin.

### Student Portal
- **Authentication**: Email/Password and Google Sign-In with email verification notices.
- **Approval Gating**: Accounts start as `pending`; students see clean pending notices until approved by the admin.
- **Recurring Schedule Selection**: Approved students select their weekly recurring schedule within configured opening hours. Enforces transactional read-before-write to prevent race conditions.
- **Lesson Rescheduling**: Allows students to reschedule a single lesson up to the allowed advance notice window (`minNoticeHours`, default 12h), verifying capacity (`maxStudentsPerDay`), opening hours, and slot conflicts atomically.
- **Attendance & History**: Students view their past lessons and attendance marks (`attended`, `missed`, `cancelled`).

### Admin Dashboard
- **Protected Access**: Enforces verification by Firebase UID (`VITE_ADMIN_UID`).
- **Calendar**: Month and week views with daily student rosters, daily count against `maxStudentsPerDay`, blocked dates management, and actions to move, cancel, or mark attendance on any lesson.
- **Calendar Settings**: Configurable open days, opening hours, max students per day, lesson lengths, and minimum reschedule notice.
- **Student Profiles**: Dedicated student view with contact details, plan calculation, approval switch, weekly schedule, upcoming lessons, lesson history with attendance, payment records, and private admin notes.
- **Payment Tracking**: Record date, amount (TND), method (cash, bank transfer, check, other), and notes. Real-time computation of total paid, amount due, and next payment due date.
- **PDF-style Invoices**: Generates printable invoices including studio contact details and payment histories.
- **Site Content Manager**: Visual editor for Hero, About, Courses, Pricing (`ratePer30Min`), Photo Gallery (upload, delete, reorder), and Promo Banner.
