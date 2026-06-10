import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Menu, X, Calendar, ArrowLeft } from "lucide-react";
import { FaInstagram, FaLinkedin, FaFacebook } from "react-icons/fa";

const PRIMARY = "#0E679D";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function renderBody(body: string) {
  return body.split(/\n\n+/).map((para, i) => (
    <p key={i} className="text-gray-700 leading-relaxed mb-5 text-base sm:text-[17px]">
      {para.split("\n").map((line, j, arr) => (
        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
      ))}
    </p>
  ));
}

export default function BlogPost() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blog/${slug}`)
      .then(r => { if (r.status === 404) { setNotFound(true); setLoading(false); return null; } return r.json(); })
      .then(d => { if (d) { setPost(d); document.title = `${d.title} | ReviewOptic Blog`; } setLoading(false); });
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-200 ${scrolled ? "shadow-sm border-b border-gray-100" : ""}`}>
        <div className="max-w-6xl mx-auto px-5 h-24 flex items-center justify-between">
          <button onClick={() => navigate("/")}>
            <img src="/logo.png" alt="ReviewOptic" className="h-20 w-auto object-contain" />
          </button>
          <div className="hidden md:flex items-center gap-7">
            <button onClick={() => navigate("/blog")} className="text-sm font-medium transition-colors" style={{ color: PRIMARY }}>Blog</button>
            <button onClick={() => navigate("/pricing")} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</button>
            <button onClick={() => navigate("/faq")} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">FAQ</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="hidden md:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5">Sign In</button>
            <button onClick={() => navigate("/register")} className="hidden md:block text-sm font-semibold text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-90" style={{ backgroundColor: PRIMARY }}>Start Free Trial</button>
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
            <button onClick={() => { navigate("/blog"); setMenuOpen(false); }} className="text-sm font-medium text-left" style={{ color: PRIMARY }}>Blog</button>
            <button onClick={() => { navigate("/pricing"); setMenuOpen(false); }} className="text-sm font-medium text-gray-700 text-left">Pricing</button>
            <button onClick={() => { navigate("/faq"); setMenuOpen(false); }} className="text-sm font-medium text-gray-700 text-left">FAQ</button>
            <hr className="border-gray-100" />
            <button onClick={() => navigate("/login")} className="text-sm font-medium text-gray-700 text-left">Sign In</button>
            <button onClick={() => navigate("/register")} className="text-sm font-semibold text-white px-4 py-2.5 rounded-lg w-full" style={{ backgroundColor: PRIMARY }}>Start Free Trial</button>
          </div>
        )}
      </nav>

      <div className="pt-24">
        {loading && (
          <div className="max-w-2xl mx-auto px-5 py-20 animate-pulse space-y-4">
            <div className="h-4 bg-gray-100 rounded w-1/4" />
            <div className="h-8 bg-gray-100 rounded" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
          </div>
        )}

        {!loading && notFound && (
          <div className="max-w-2xl mx-auto px-5 py-20 text-center">
            <p className="text-gray-400 text-lg mb-6">Post not found.</p>
            <button onClick={() => navigate("/blog")} className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: PRIMARY }}>
              <ArrowLeft className="w-4 h-4" /> Back to blog
            </button>
          </div>
        )}

        {!loading && post && (
          <article className="max-w-2xl mx-auto px-5 py-14">
            <button onClick={() => navigate("/blog")} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to blog
            </button>

            {post.published_at && (
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
                <Calendar className="w-4 h-4" />
                {formatDate(post.published_at)}
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-6">{post.title}</h1>

            {post.excerpt && (
              <p className="text-lg text-gray-500 leading-relaxed mb-8 pb-8 border-b border-gray-100">{post.excerpt}</p>
            )}

            <div className="prose-content">
              {renderBody(post.body)}
            </div>

            {/* CTA at bottom of every post */}
            <div className="mt-14 rounded-2xl p-8 text-center" style={{ backgroundColor: `${PRIMARY}12` }}>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to get more reviews?</h3>
              <p className="text-gray-500 text-sm mb-5">Start your 30-day free trial — no credit card required.</p>
              <button onClick={() => navigate("/register")} className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: PRIMARY }}>
                Start Free Trial
              </button>
            </div>
          </article>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-5 mt-12">
        <div className="max-w-6xl mx-auto text-sm text-center space-y-3">
          <div className="flex flex-wrap justify-center gap-5">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => navigate("/blog")} className="hover:text-white transition-colors">Blog</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms & Conditions</button>
            <button onClick={() => navigate("/pricing")} className="hover:text-white transition-colors">Pricing</button>
          </div>
          <div className="flex items-center justify-center gap-4 mb-1">
            <a href="https://www.instagram.com/reviewopticapp/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors"><FaInstagram size={18} /></a>
            <a href="https://www.linkedin.com/company/reviewoptic" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors"><FaLinkedin size={18} /></a>
            <a href="https://www.facebook.com/reviewopticapp/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors"><FaFacebook size={18} /></a>
          </div>
          <p>© {new Date().getFullYear()} ReviewOptic Limited &nbsp;·&nbsp; <a href="mailto:hello@reviewoptic.com" className="hover:text-white transition-colors">hello@reviewoptic.com</a></p>
        </div>
      </footer>
    </div>
  );
}
