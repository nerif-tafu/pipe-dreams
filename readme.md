# Pipe Dreams

A modern web application built with SvelteKit, Tailwind CSS, and Prisma.

## 🚀 Tech Stack

- **SvelteKit** - Full-stack web framework
- **Tailwind CSS** - Utility-first CSS framework
- **Prisma** - Next-generation ORM for Node.js

## ✨ Features

- 🎨 Modern, responsive UI with Tailwind CSS
- ⚡ Fast development with hot reload
- 🗄️ Database-ready with Prisma ORM
- 📱 Mobile-first responsive design
- 🎯 Type-safe database operations

## 🛠️ Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd pipe-dreams
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
```bash
cp .env.example .env
```

4. Configure your database in the `.env` file and update the Prisma schema as needed.

5. Run database migrations:
```bash
npx prisma migrate dev
```

6. Start the development server:
```bash
npm run dev
```

7. Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
pipe-dreams/
├── src/
│   ├── routes/          # SvelteKit routes
│   ├── lib/             # Shared utilities and components
│   ├── app.css          # Global styles with Tailwind CSS
│   └── app.html         # HTML template
├── prisma/
│   └── schema.prisma    # Database schema
├── static/              # Static assets
└── package.json         # Dependencies and scripts
```

## 🎨 Tailwind CSS

This project uses Tailwind CSS v4 with the new `@tailwindcss/vite` plugin. The configuration is already set up in:

- `vite.config.js` - Vite plugin configuration
- `src/app.css` - Tailwind CSS import
- `src/routes/+layout.svelte` - Global CSS import

## 🗄️ Database

Prisma is configured and ready to use. To get started:

1. Update the database URL in your `.env` file
2. Define your models in `prisma/schema.prisma`
3. Run `npx prisma migrate dev` to create and apply migrations
4. Use `npx prisma studio` to view and edit your data

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npx prisma studio` - Open Prisma Studio
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma generate` - Generate Prisma client

## 🔧 Development

The project is set up with:
- Hot reload for fast development
- Tailwind CSS for styling
- Prisma for database operations
- Responsive design out of the box

## 📚 Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
 