import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Web3Provider } from './contexts/Web3Context';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Elections from './pages/Elections';
import Vote from './pages/Vote';
import Results from './pages/Results';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import About from './pages/About';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <Web3Provider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-slate-900 text-white">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/elections" element={<Elections />} />
                  <Route path="/vote/:id" element={<Vote />} />
                  <Route path="/results/:id" element={<Results />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #475569'
                  }
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}

export default App;
