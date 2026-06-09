import React from 'react';
import { ExternalLink, Share2, Heart, Sparkles } from 'lucide-react';

function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <div className="logo">
                        <Sparkles size={20} className="logo-icon" />
                        <span className="logo-text">CleanImage <span className="logo-accent">AI</span></span>
                    </div>
                    <p className="footer-tagline">Instantly remove DALL-E watermarks from your AI-generated images. Fast, free, and private.</p>
                </div>

                <div className="footer-links">
                    <div className="footer-col">
                        <h4>Product</h4>
                        <a href="#tool">Remove Watermark</a>
                        <a href="#how-it-works">How it Works</a>
                        <a href="#features">Features</a>
                    </div>
                    <div className="footer-col">
                        <h4>Legal</h4>
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                    </div>
                    <div className="footer-col">
                        <h4>Connect</h4>
                        <a href="#" className="social-link"><Share2 size={14} /> Twitter</a>
                        <a href="#" className="social-link"><ExternalLink size={14} /> GitHub</a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} CleanImage AI. All rights reserved.</p>
                <p className="made-with">Made with <Heart size={12} fill="currentColor" /> for creators everywhere</p>
            </div>
        </footer>
    );
}

export default Footer;
