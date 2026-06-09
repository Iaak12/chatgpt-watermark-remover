import React from 'react';
import { Sparkles } from 'lucide-react';

function Header() {
    return (
        <header className="site-header">
            <div className="header-inner">
                <div className="logo">
                    <Sparkles size={24} className="logo-icon" />
                    <span className="logo-text">CleanImage <span className="logo-accent">AI</span></span>
                </div>
                <nav className="header-nav">
                    <a href="#how-it-works">How it works</a>
                    <a href="#features">Features</a>
                    <a href="#tool" className="nav-cta">Try Now</a>
                </nav>
            </div>
        </header>
    );
}

export default Header;
