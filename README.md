# Career Launchpad

**Career Launchpad** is a modern, intuitive internship application tracker designed to help you organize your job search effectively. 

![Project Banner](https://via.placeholder.com/1200x600/2563EB/FFFFFF?text=Career+Launchpad)

## ✨ Features

- **Smart Metadata Extraction**: Automatically parses Company and Position details from LinkedIn job URLs.
- **Status Tracking**: Keep tabs on your applications with statuses like *Pending*, *Interview*, *Decline*, and *Accepted*.
- **Undo Deletion**: Accidentally deleted an application? Restore it instantly with the undo toast notification.
- **Sort / Filter / Columns**: Spreadsheet-style sorting and customizable columns.
- **Risk Badge (Heuristic)**: Lightweight signals for potentially suspicious postings (not a verdict).
- **Prep Sheet per Application**: Company/role notes, JD keywords, interview prep templates, and quick-start auto-fill.
- **Cloud Persistence**: Applications and prep notes are stored per-user in Supabase.

## 🛠️ Tech Stack

- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS (Modern Variables & Layouts)
- **Backend**: Supabase (Auth + Database + Edge Functions)
- **Optional AI**: OpenAI API (server-side auto-fill for prep notes)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/minseo1103/CareerLaunchpad.git
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Environment variables**
   - Create a `.env` file with:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

5. **Open your browser**
   Navigate to `http://localhost:5173` to start tracking!

## 📝 Usage

1. **Add Application**: Paste a LinkedIn or job URL into the input field and hit Enter.
2. **Edit Details**: Click on the Company or Position text to edit them directly.
3. **Change Status**: specific dropdowns to update the status of each application.
4. **Delete**: Click the trash icon to remove an entry (undo available for 4 seconds).
5. **Prep Sheet**: Click 📝 to open the Prep Sheet and use Auto-fill + interview quick-start templates.

## 📄 License

This project is licensed under the MIT License.
