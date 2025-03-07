# Trading Journal

A desktop web application for tracking and analyzing your trading activities. Built with React, TypeScript, and SQLite.

## Features

- Dashboard with key metrics and charts
- Trade record management
- Trade notes and analysis
- Filter and sort trades
- Beautiful and responsive UI

## Tech Stack

- Frontend: React.js + TypeScript + Tailwind CSS + Recharts
- Backend: Node.js (Express.js)
- Database: SQLite
- Development Tools: Vite, TypeScript, ESLint

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd trading-journal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
# Start the backend server
npm run server

# In a new terminal, start the frontend development server
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Development

- Frontend development server runs on port 3000
- Backend API server runs on port 5000
- SQLite database file is created automatically in the project root

## Project Structure

```
trading-journal/
├── src/
│   ├── components/     # Reusable React components
│   ├── pages/         # Page components
│   ├── server/        # Backend server code
│   ├── App.tsx        # Main App component
│   └── main.tsx       # Application entry point
├── public/            # Static assets
├── index.html         # HTML template
├── package.json       # Project dependencies
├── tsconfig.json      # TypeScript configuration
├── vite.config.ts     # Vite configuration
└── tailwind.config.js # Tailwind CSS configuration
```

## API Endpoints

- `GET /api/trades` - Get all trades
- `GET /api/trades/:id` - Get a specific trade
- `POST /api/trades` - Create a new trade
- `PUT /api/trades/:id` - Update a trade
- `DELETE /api/trades/:id` - Delete a trade

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 