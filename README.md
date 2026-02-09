# 🎯 Everon - AI-Powered Career Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646cff)](https://vitejs.dev/)

**Everon** is an intelligent AI-powered career assistant web application that helps job seekers optimize their resumes, prepare for interviews, and discover relevant job opportunities. Built with cutting-edge technologies including OpenAI GPT-4, LiveKit voice integration, and Firebase authentication, Everon provides a comprehensive suite of tools to accelerate your career journey.

> **Note:** The main application code is located in the `everon-final_001/` directory.

## ✨ Features

- **📄 AI Resume Analysis** - Upload your resume (PDF) and receive instant AI-powered feedback with:
  - Professional summary and career level assessment
  - Strengths and areas for improvement
  - Actionable recommendations for enhancement
  - Keywords and ATS (Applicant Tracking System) optimization tips

- **🤖 AI Career Coaching** - Interactive chat with an AI assistant for:
  - Personalized career advice and guidance
  - Interview preparation and mock interviews
  - Job search strategies and tips
  - Career development planning

- **💼 Job Search Integration** - Search and discover job opportunities from:
  - LinkedIn job listings
  - Indeed job postings
  - AI-powered job matching based on your profile

- **🎤 Voice Interaction** - Natural voice conversations with your AI career coach using:
  - Real-time voice input and output
  - LiveKit-powered audio streaming
  - Hands-free career coaching experience

- **🔐 User Authentication** - Secure user management with:
  - Email/password authentication
  - Google OAuth sign-in
  - Password reset functionality
  - User profile management

- **💾 Chat History** - Automatic saving of conversations:
  - Access past career coaching sessions
  - Review previous resume feedback
  - Track your career development journey

- **📱 Progressive Web App (PWA)** - Install Everon on any device:
  - Works offline with service worker support
  - Native app-like experience on mobile and desktop
  - Push notification support (future)

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - Modern UI library with hooks
- **TypeScript 5.5** - Type-safe development
- **Vite 5.3** - Lightning-fast build tool and dev server
- **Custom CSS** - Modern gradients, animations, and responsive design
- **Lottie Animations** - Beautiful animated UI elements

### AI & Voice
- **OpenAI GPT-4** - Advanced AI for resume analysis and career coaching
- **LiveKit** - Real-time voice and audio streaming
- **PDF.js** - Client-side PDF parsing and text extraction

### Backend & Services
- **Firebase Authentication** - Secure user authentication
- **Firebase Firestore** - NoSQL database for user profiles and chat history
- **Vercel** - Serverless deployment platform

### Development Tools
- **TypeScript** - Static type checking
- **Vite Plugin React** - Fast refresh and optimized builds
- **SVGR** - SVG to React component conversion

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Firebase Account** - [Sign up](https://firebase.google.com/)
- **OpenAI API Key** - [Get API key](https://platform.openai.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/erose2502/Everon-final.git
   cd Everon-final
   ```

2. **Navigate to the application directory**
   ```bash
   cd everon-final_001
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   
   Create a `.env` file in the `everon-final_001/` directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   ```env
   # OpenAI API Key for AI chat and resume analysis
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # Perplexity API Key for job search (optional)
   VITE_PERPLEXITY_API_KEY=your_perplexity_api_key_here
   
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Configure Firebase** (required for authentication)
   
   Follow the detailed setup guide in [FIREBASE_SETUP.md](everon-final_001/FIREBASE_SETUP.md) which includes:
   - Creating a Firebase project
   - Enabling Authentication (Email/Password and Google)
   - Setting up Firestore database
   - Configuring security rules

6. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production-ready files will be generated in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
everon-final_001/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── AuthModal.tsx          # Login/signup modal
│   │   ├── ChatBubble.tsx         # Chat message component
│   │   ├── SwipeableJobCards.tsx  # Job search cards
│   │   ├── VoiceSpectrum.tsx      # Voice visualization
│   │   └── ...
│   ├── config/           # Configuration files
│   │   └── firebase.ts            # Firebase initialization
│   ├── services/         # Service layer
│   │   ├── authService.ts         # Authentication logic
│   │   ├── chatHistoryService.ts  # Chat persistence
│   │   └── livekitVoiceAgent.ts   # Voice integration
│   ├── utils/            # Utility functions
│   │   ├── jobSearchService.ts    # Job search API
│   │   ├── openaiTtsService.ts    # Text-to-speech
│   │   └── ...
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main application component
│   └── main.tsx          # Application entry point
├── .env.example          # Environment variable template
├── FIREBASE_SETUP.md     # Firebase setup guide
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
└── vercel.json           # Deployment configuration
```

## 🔥 Firebase Setup

Everon uses Firebase for authentication and data storage. To set up Firebase:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication methods (Email/Password and Google)
3. Create a Firestore database
4. Set up security rules for user data protection

For detailed step-by-step instructions, see [FIREBASE_SETUP.md](everon-final_001/FIREBASE_SETUP.md).

## 🌐 Deployment

Everon is configured for deployment on **Vercel** with automatic builds.

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variables in the Vercel dashboard:
   - Navigate to your project settings
   - Add all variables from your `.env` file
   - Redeploy for changes to take effect

The `vercel.json` configuration file at the root automatically builds from the `everon-final_001/` directory.

### Other Platforms

Everon can also be deployed to:
- **Netlify** - Drag and drop the `dist/` folder
- **GitHub Pages** - Use `gh-pages` package
- **AWS Amplify** - Connect your GitHub repository
- **Any static hosting** - Upload the `dist/` folder

## 🤝 Contributing

We welcome contributions to Everon! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed
4. **Test your changes**
   ```bash
   npm run build
   npm run preview
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Style

- Use TypeScript for all new code
- Follow React best practices and hooks
- Write meaningful commit messages
- Keep components focused and reusable
- Add proper error handling

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Everon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

- **OpenAI** for the GPT-4 API
- **LiveKit** for real-time voice communication
- **Firebase** for authentication and database services
- **React** and **Vite** communities for excellent tools
- All contributors who help improve Everon

## 📧 Support

If you encounter any issues or have questions:

- Open an issue on [GitHub Issues](https://github.com/erose2502/Everon-final/issues)
- Check the [FIREBASE_SETUP.md](everon-final_001/FIREBASE_SETUP.md) for setup help
- Review the `.env.example` file for required environment variables

---

**Built with ❤️ to help you succeed in your career journey**