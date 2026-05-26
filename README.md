# VedaAI – Full Stack AI Assessment Creator

This project is a high-fidelity, production-grade **AI Assessment Creator** built for the VedaAI hiring assignment. It empowers educators to construct curriculum-aligned, structured exam papers by specifying criteria (due dates, question distributions, total marks, additional instructions) and optionally uploading reference PDFs/textbooks.

---

## 🚀 Key Features & High-Signal Highlights

*   **Real-time WebSocket Progress Stepper:** Submission enqueues a background job. The progress (`10% -> 25% -> 50% -> 85% -> 100%`) and compilation/worker logs are streamed in real-time to a visual terminal on the dashboard.
*   **Fail-safe Redis-to-Memory Queue Fallback:** If Docker or local Redis is unavailable, the backend automatically transitions to a custom in-memory queue. This guarantees that the application runs successfully out-of-the-box on any system.
*   **Structured AI & Dynamic Generator Fallback:** Attempts to call Gemini 1.5 Flash using structured JSON schemas. If a `GEMINI_API_KEY` is absent or rates limit out, it falls back to a template-based assessment generator aligned with the topic parameters.
*   **Inline Question & Mark Editing:** In the preview layout, teachers can click and edit any question text, MCQ options, difficulty level, or marks inline. Clicking "Save Edits" updates MongoDB and regenerates the PDF file.
*   **Print Stylesheet & PDF Exports:** Integrates `pdfkit` on the backend to render formal academic exam papers with student detail fields (Name, Roll No, Section). A customized `@media print` CSS stylesheet handles browser printing.

---

## 🛠️ Tech Stack & Architecture

```
                                  +-----------------------+
                                  |   Next.js Frontend    |
                                  | (Zustand + Socket.io) |
                                  +-----------+-----------+
                                              |
                                     HTTP / WebSockets
                                              |
                                              v
                                  +-----------------------+
                                  |    Express Backend    |
                                  +-----+-----+-----+-----+
                                        |     |     |
                 +----------------------+     |     +----------------------+
                 |                            |                            |
                 v                            v                            v
        +----------------+           +----------------+           +----------------+
        |  MongoDB (DB)  |           | Redis / BullMQ |           |  Gemini AI API |
        | (Assignments)  |           | (Job Queues)   |           | (or Fallback)  |
        +----------------+           +----------------+           +----------------+
```

*   **Frontend:** Next.js 14+ (App Router) + TypeScript + Zustand + Socket.io-client + Vanilla CSS (Custom layout and print styles).
*   **Backend:** Node.js + Express + TypeScript + Mongoose (MongoDB) + BullMQ + Socket.io + PDFKit + Multer + PDF-Parse.
*   **Services:** Gemini 1.5 Flash SDK, Custom PDF Generator, Socket.io room broadcaster.

---

## 🗄️ Database Schema (`Assignment`)

Stored in MongoDB:
*   `title` (String): Assessment heading.
*   `topic` (String): Syllabus subject area.
*   `dueDate` (Date): Due date.
*   `questionTypes` (Array): MCQ, SHORT, LONG, TRUE_FALSE.
*   `totalQuestions` (Number) & `totalMarks` (Number).
*   `status` (String): `pending` | `processing` | `completed` | `failed`.
*   `progress` (Number): `0` to `100`.
*   `statusMessage` (String): Current active step log.
*   `sections` (Array):
    *   `sectionLetter` (e.g. "A", "B").
    *   `title` (e.g. "Section A: Multiple Choice Questions").
    *   `instructions` (e.g. "Answer all questions").
    *   `questions`: Array of `questionText`, `type`, `difficulty`, `marks`, `options` (for MCQs).
*   `pdfPath` (String): Path to the generated static PDF.

---

## 💻 Setup & Run Instructions

Ensure you have **Node.js (v18+)** and **npm** installed.

### 1. Database & Queue Setup (MongoDB & Redis)

*   **MongoDB:** The backend connects to `mongodb://127.0.0.1:27017/vedaai`. Ensure your local MongoDB service is running (Port 27017 is standard).
*   **Redis:** Start the Redis service using Docker Compose:
    ```bash
    docker-compose up -d
    ```
    *(Note: If Docker/Redis is not running, the application will automatically fall back to the In-Memory Queue seamlessly!)*

### 2. Backend Installation & Start

1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure variables (optional):
    Copy `.env` and fill in `GEMINI_API_KEY` to test with actual AI:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://127.0.0.1:27017/vedaai
    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379
    GEMINI_API_KEY=your_key_here
    ```
4.  Start in development mode:
    ```bash
    npm run dev
    ```
    The server will listen on `http://localhost:5000`.

### 3. Frontend Installation & Start

1.  Navigate into the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start Next.js development server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` in your web browser.

---

## 🎨 UI/UX Highlights

*   **Glowing Dark Mode:** Built with HSL color tokens, glassmorphic cards, responsive sizing, and stateful hover/focus micro-animations.
*   **Realistic Stepper Logs:** Streams exact compiler/parsing logs from the worker queue.
*   **Clean Exam Print Out:** Emulates a real exam paper sheet. Standard web headers, side panels, and action buttons are automatically omitted when triggering browser printing (Ctrl+P).
