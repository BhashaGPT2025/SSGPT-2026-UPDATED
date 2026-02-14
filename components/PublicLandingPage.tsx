import React from 'react';
import { SSGPT_LOGO_URL } from '../constants';

interface PublicLandingPageProps {
  onGetStarted: () => void;
}

const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-9 h-9" />
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">SSGPT</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#why-ssgpt" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Why SSGPT</a>
            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">How it works</a>
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#founders" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Founders</a>
          </div>

          <button 
            onClick={onGetStarted}
            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all text-sm"
          >
            Get Started Free
          </button>
        </nav>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 z-10 text-left animate-fade-in-up">
              <h1 className="text-5xl md:text-7xl font-[900] text-slate-900 leading-[1.1] tracking-tight">
                Intelligent Exam Paper Creation in <span className="text-indigo-600">Minutes</span>, Not Hours.
              </h1>
              <p className="mt-8 text-xl text-slate-500 leading-relaxed max-w-2xl font-medium">
                Create customized question papers using AI with full control over language, difficulty, question types, and structure.
              </p>
              <div className="mt-10">
                <button 
                  onClick={onGetStarted} 
                  className="px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all text-xl"
                >
                  Get Started Free
                </button>
                <p className="mt-4 text-sm font-semibold text-slate-400">
                  No credit card required
                </p>
              </div>
            </div>

            {/* Right Image */}
            <div className="lg:col-span-5 relative animate-fade-in flex justify-center items-center">
              {/* Yellow Abstract Blob Accent */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-amber-400/25 rounded-full blur-[80px] -z-10" />
              
              <div className="relative z-10 transform origin-center transition-all duration-700 select-none pointer-events-none">
                <img 
                  src="https://res.cloudinary.com/dqxzwguc7/image/upload/v1769503413/output-onlinepngtools_1_p3lr6n.png" 
                  className="w-full h-auto drop-shadow-2xl scale-110 md:scale-125" 
                  alt="Modern Teacher Visualization" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Cards Info */}
        <section id="why-ssgpt" className="py-32 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-20">The SSGPT Advantage</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <WhyCard 
                title="100+ Language Support"
                description="Create papers in regional and global languages with proper academic tone."
                icon="🌍"
              />
              <WhyCard 
                title="Full Customization"
                description="Control difficulty, question types, marks distribution, sections, and question order."
                icon="⚙️"
              />
              <WhyCard 
                title="Question Bank Integration"
                description="Upload your own questions. SSGPT intelligently blends them with AI-generated content."
                icon="📦"
              />
              <WhyCard 
                title="Quality-Focused AI"
                description="Generates relevant, structured, grade-appropriate questions. No random output."
                icon="🎯"
              />
            </div>
          </div>
        </section>

        {/* Section 3: How it Works */}
        <section id="how-it-works" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">How It Works</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
              {/* Connector line for desktop */}
              <div className="hidden md:block absolute top-24 left-[15%] right-[15%] h-0.5 bg-slate-100 -z-10" />
              
              <Step 
                num="1" 
                title="Enter Details" 
                desc="Subject, topics, marks, language." 
              />
              <Step 
                num="2" 
                title="Customize Format" 
                desc="Select difficulty, question types, structure." 
              />
              <Step 
                num="3" 
                title="Generate Paper" 
                desc="Download instantly." 
              />
            </div>
          </div>
        </section>

        {/* Section 4: Features Grid (Why teachers love SSGPT) */}
        <section id="features" className="py-32 bg-slate-900 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
                 <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">Why teachers love SSGPT</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <FeatureGridCard title="Multi-language support" />
              <FeatureGridCard title="Difficulty control" />
              <FeatureGridCard title="Question bank integration" />
              <FeatureGridCard title="Multiple question types" />
              <FeatureGridCard title="Export-ready format" />
              <FeatureGridCard title="Clean layout" />
            </div>
          </div>
        </section>

        {/* Section 5: Meet the Founders */}
        <section id="founders" className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
             <div className="text-center mb-20">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full mb-6">
                    <img src={SSGPT_LOGO_URL} alt="SSGPT" className="w-5 h-5" />
                    <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">The Visionaries</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                    The Minds Behind <span className="text-indigo-600">SSGPT AI</span>
                </h2>
                <p className="mt-6 text-xl text-slate-500 max-w-3xl mx-auto font-medium">
                    Built by educators and engineers who believe in the power of AI to transform education.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                <FounderLandingCard 
                    name="Swaroop P"
                    role="Visionary Founder & Co-developer"
                    bio="Swaroop is the driving force behind SSGPT. With a deep passion for educational technology, he envisioned a world where high-quality exam papers could be generated instantly."
                />
                <FounderLandingCard 
                    name="Shreyas Gunjal"
                    role="Co-developer & Product Architect"
                    bio="Shreyas is the architect of the SSGPT experience. He focuses on building robust, scalable systems and intuitive interfaces for a high-performing pedagogical platform."
                />
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 bg-white relative overflow-hidden">
          {/* Yellow blob accent */}
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-400/20 rounded-full blur-[100px] -z-10" />
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-5xl md:text-6xl font-[900] text-slate-900 tracking-tight mb-10">Start Creating Question Papers Today</h2>
            <button 
              onClick={onGetStarted} 
              className="px-12 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all text-xl"
            >
              Get Started Free
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-slate-100 bg-slate-50/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-6 h-6 grayscale opacity-60" />
              <span className="text-lg font-bold text-slate-400 tracking-tight">SSGPT</span>
            </div>
            <p className="text-sm font-semibold text-slate-400">SSGPT — Built for Teachers.</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

const WhyCard = ({ title, description, icon }: { title: string, description: string, icon: string }) => (
  <div className="bg-white p-10 rounded-[32px] text-left shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="text-4xl mb-6">{icon}</div>
    <h4 className="text-xl font-bold text-slate-900 mb-4">{title}</h4>
    <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
  </div>
);

const Step = ({ num, title, desc }: { num: string, title: string, desc: string }) => (
  <div className="text-center group">
    <div className="w-20 h-20 bg-white border-4 border-slate-50 rounded-full flex items-center justify-center text-2xl font-black text-indigo-600 shadow-xl mx-auto mb-8 transition-all group-hover:scale-110 group-hover:border-indigo-100">
      {num}
    </div>
    <h4 className="text-2xl font-bold text-slate-900 mb-3">{title}</h4>
    <p className="text-slate-500 font-medium max-w-[200px] mx-auto">{desc}</p>
  </div>
);

const FeatureGridCard = ({ title }: { title: string }) => (
  <div className="bg-white/5 p-8 rounded-2xl border border-white/10 flex items-center gap-4 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-default text-white">
    <div className="w-2 h-2 rounded-full bg-amber-400" />
    <span className="text-lg font-bold tracking-tight">{title}</span>
  </div>
);

const FounderLandingCard = ({ name, role, bio }: { name: string; role: string; bio: string }) => (
    <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 hover:-translate-y-2">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 mb-6">
            <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                <span className="text-3xl font-black text-indigo-600">{name.charAt(0)}</span>
            </div>
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{name}</h3>
        <p className="text-indigo-600 font-bold uppercase text-xs tracking-widest mb-4">{role}</p>
        <p className="text-slate-500 font-medium leading-relaxed">{bio}</p>
    </div>
);

export default PublicLandingPage;