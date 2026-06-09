import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, Image as ImageIcon, Download, Eraser, Loader2, AlertCircle, Zap, ShieldCheck, Lock } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import './index.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setProcessedUrl(null);
    setProcessedBlob(null);
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  };

  const removeWatermark = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      if (apiUrl.endsWith('/api')) {
        apiUrl = apiUrl.slice(0, -4);
      }
      const response = await axios.post(`${apiUrl}/api/remove-watermark`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const objectUrl = URL.createObjectURL(blob);
      setProcessedBlob(blob);
      setProcessedUrl(objectUrl);
    } catch (err) {
      console.error(err);
      setError('Failed to process the image. Please ensure the backend is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const url = URL.createObjectURL(processedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `watermark-removed-${selectedFile.name}`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedUrl(null);
    setProcessedBlob(null);
    setError(null);
  };

  return (
    <div className="page-wrapper">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">AI-Powered Tool</div>
          <h1>Remove DALL-E Watermarks <span className="gradient-text">Instantly</span></h1>
          <p className="hero-subtitle">Upload your ChatGPT-generated image and get a clean, watermark-free version in seconds. No sign-up required.</p>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="steps-section container">
          <h2 className="section-title">How it Works</h2>
          <div className="steps-grid">
            <div className="step-card glass-card">
              <div className="step-number">01</div>
              <h3>Upload Image</h3>
              <p>Drag & drop or click to upload your ChatGPT / DALL-E generated image.</p>
            </div>
            <div className="step-card glass-card">
              <div className="step-number">02</div>
              <h3>Remove Watermark</h3>
              <p>Click the button and our AI-powered backend strips the watermark instantly.</p>
            </div>
            <div className="step-card glass-card">
              <div className="step-number">03</div>
              <h3>Download</h3>
              <p>Preview the clean image side-by-side and download your fresh, watermark-free file.</p>
            </div>
          </div>
        </section>

        {/* Tool Section */}
        <section id="tool" className="tool-section container">
          <div className="glass-card">
            {error && (
              <div className="error-banner">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {!selectedFile ? (
              <div
                className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="upload-icon" />
                <div>
                  <h3>Click or drag your image here</h3>
                  <p>Supports JPG, PNG, WebP — up to 10MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
              </div>
            ) : (
              <div>
                <div className="preview-container">
                  <div className="image-card">
                    <h3><ImageIcon size={18} /> Original</h3>
                    <div className="image-wrapper">
                      <img src={previewUrl} alt="Original" />
                    </div>
                  </div>
                  <div className="image-card">
                    <h3><Eraser size={18} /> Processed</h3>
                    <div className="image-wrapper">
                      {isProcessing ? (
                        <div className="processing-state">
                          <Loader2 size={40} className="spinner" />
                          <p>Removing watermark...</p>
                        </div>
                      ) : processedUrl ? (
                        <img src={processedUrl} alt="Processed" />
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>Ready to process</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="action-bar">
                  <button className="btn btn-ghost" onClick={resetAll} disabled={isProcessing}>
                    Start Over
                  </button>
                  {!processedUrl ? (
                    <button className="btn" onClick={removeWatermark} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="spinner" size={18} /> : <Eraser size={18} />}
                      Remove Watermark
                    </button>
                  ) : (
                    <button className="btn btn-success" onClick={handleDownload}>
                      <Download size={18} />
                      Download Image
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="features-section container">
          <h2 className="section-title">Why CleanImage AI?</h2>
          <div className="features-grid">
            <div className="feature-card glass-card">
              <Zap size={32} className="feature-icon" />
              <h3>Lightning Fast</h3>
              <p>Watermark removal processed in milliseconds directly on our server — no waiting around.</p>
            </div>
            <div className="feature-card glass-card">
              <ShieldCheck size={32} className="feature-icon" />
              <h3>No Sign-Up</h3>
              <p>No account needed. Just upload, process, and download. Completely free to use.</p>
            </div>
            <div className="feature-card glass-card">
              <Lock size={32} className="feature-icon" />
              <h3>Private & Secure</h3>
              <p>Your images are processed in-memory and never stored on our servers permanently.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
