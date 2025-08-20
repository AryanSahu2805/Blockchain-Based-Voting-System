import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Mail, 
  Shield, 
  Globe, 
  Zap 
} from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Blockchain Voting</span>
            </div>
            <p className="text-slate-400 mb-4 max-w-md">
              Secure, transparent, and decentralized voting powered by blockchain technology. 
              Every vote is cryptographically secured and immutable.
            </p>
            <div className="flex gap-4">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <Github className="w-5 h-5 text-slate-400" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <Twitter className="w-5 h-5 text-slate-400" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <Linkedin className="w-5 h-5 text-slate-400" />
              </a>
              <a 
                href="mailto:contact@blockchainvoting.com" 
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <Mail className="w-5 h-5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/" 
                  className="text-slate-400 hover:text-white transition-colors duration-200"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/elections" 
                  className="text-slate-400 hover:text-white transition-colors duration-200"
                >
                  Elections
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className="text-slate-400 hover:text-white transition-colors duration-200"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  to="/profile" 
                  className="text-slate-400 hover:text-white transition-colors duration-200"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-slate-400">
                <Shield className="w-4 h-4 text-cyan-400" />
                Secure Voting
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Globe className="w-4 h-4 text-blue-400" />
                Global Access
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Zap className="w-4 h-4 text-yellow-400" />
                Real-time Results
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Shield className="w-4 h-4 text-green-400" />
                Blockchain Security
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-slate-400 text-sm">
            © {currentYear} Blockchain Voting. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link 
              to="/privacy" 
              className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <Link 
              to="/support" 
              className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
            >
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
