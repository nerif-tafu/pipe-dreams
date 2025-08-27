# Pipe Dreams

A modern web application built with SvelteKit and Tailwind CSS.

## 🚀 Tech Stack

- **SvelteKit** - Full-stack web framework
- **Tailwind CSS** - Utility-first CSS framework

## ✨ Features

- 🎨 Modern, responsive UI with Tailwind CSS
- ⚡ Fast development with hot reload
- 💾 Local data persistence with localStorage
- 📱 Mobile-first responsive design
- 🎮 Rust Conveyor Planner - Plan item sorting systems
- 📊 Game Data Management - SteamCMD integration for Rust files

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

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
pipe-dreams/
├── src/
│   ├── routes/          # SvelteKit routes
│   │   ├── +page.svelte # Main conveyor planner
│   │   ├── data/        # Game data management
│   │   └── rules/       # Item rules management
│   ├── lib/             # Shared utilities and components
│   │   ├── steamcmd.js      # SteamCMD wrapper
│   │   └── steamcmd-manager.js # SteamCMD manager
│   ├── app.css          # Global styles with Tailwind CSS
│   └── app.html         # HTML template
├── steamcmd/            # SteamCMD installation (auto-managed)
├── static/              # Static assets
└── package.json         # Dependencies and scripts
```

## 🎨 Tailwind CSS

This project uses Tailwind CSS v4 with the new `@tailwindcss/vite` plugin. The configuration is already set up in:

- `vite.config.js` - Vite plugin configuration
- `src/app.css` - Tailwind CSS import
- `src/routes/+layout.svelte` - Global CSS import

## 💾 Data Storage

The application uses localStorage for data persistence:
- **Item Exclusions** - Items that won't appear in the available items list
- **Item Variations** - Groups of functionally identical items
- **Conveyor Saves** - Saved conveyor layouts and configurations

All data is stored locally in the browser and persists between sessions.

## 🎮 Rust Conveyor Planner

The main application allows you to:
- Browse and search through Rust items by category
- Create and manage conveyor systems
- Assign items to specific conveyors
- Plan efficient item sorting systems
- Save and load conveyor layouts
- Export conveyor configurations as JSON

## 📊 Game Data Management

The `/data` page provides SteamCMD integration for downloading Rust game files:

1. **Automatic Setup**: SteamCMD is automatically downloaded and installed when needed
2. **Authentication**: Login with your Steam credentials (never stored)
3. **Download**: Download and validate Rust game files to `/steamcmd/rust/`
4. **Processing**: Extract item data and images for the conveyor planner

### SteamCMD Integration

The application includes a custom SteamCMD wrapper that:
- Automatically downloads and installs SteamCMD
- Manages authentication and game downloads
- Provides real-time progress tracking
- Handles error cases and cleanup

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Development

The project is set up with:
- Hot reload for fast development
- Tailwind CSS for styling
- Local data persistence with localStorage
- Responsive design out of the box

## 📚 Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
 