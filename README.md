# InfoVault - Discord-like Chat & Money Making Platform

A full-stack application combining chat functionality with money-making information sharing.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase
- **Styling**: CSS with custom dark brown/gold theme

## Project Structure

```
infovault/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   └── Login.css
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
├── backend/           # Node.js backend
│   ├── server.js
│   ├── package.json
│   └── .env
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

### Environment Setup

1. Create a Supabase project
2. Copy your Supabase URL and anon key
3. Update `backend/.env` with your credentials:
   ```
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Features

### Current Features
- ✅ Beautiful login page with dark brown/gold theme
- ✅ Responsive design
- ✅ Form validation and error handling
- ✅ API integration structure

### Planned Features
- 🔄 User authentication with Supabase
- 🔄 Real-time chat functionality
- 🔄 Money-making information sharing
- 🔄 User profiles and settings
- 🔄 Channel organization (like Discord)

## API Endpoints

- `POST /api/auth/login` - User login
- `GET /api/health` - Health check

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
