# n8n Monitor Dashboard

An open-source dashboard for monitoring and managing multiple n8n instances.

## Features

- 🔐 **Better Auth** - Secure authentication with single admin account per deployment
- 👥 **User Invitations** - Invite-only user registration system
- 📧 **Resend Integration** - Email notifications via Resend
- 📱 **PWA Support** - Install as Progressive Web App
- 🔔 **Push Notifications** - Real-time push notifications
- ⚙️ **Settings UI** - Beautiful settings interface for configurations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd n8n-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npx prisma migrate dev
```

5. Generate encryption keys:
```bash
# For BETTER_AUTH_SECRET
openssl rand -base64 32

# For ENCRYPTION_KEY
openssl rand -hex 32
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

8. On first run, you'll be redirected to `/setup` to create the admin account.

## Project Structure

```
n8n-monitor/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── auth/             # Better Auth configuration
│   ├── db/               # Prisma client
│   └── utils/            # Utility functions
├── prisma/                # Prisma schema and migrations
└── public/                # Static assets

```

## Development

### Database

This project uses Prisma with SQLite by default. For production, you can switch to PostgreSQL by updating the `datasource` in `prisma/schema.prisma` and updating `DATABASE_URL`.

### Running Migrations

```bash
npx prisma migrate dev
```

### Generating Prisma Client

```bash
npx prisma generate
```

## Next Steps

See `IMPLEMENTATION_GUIDE.md` for the complete implementation roadmap.

## License

MIT

