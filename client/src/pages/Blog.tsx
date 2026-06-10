import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Menu, X, ArrowRight, ArrowLeft, Calendar } from "lucide-react";
import { FaInstagram, FaLinkedin, FaFacebook } from "react-icons/fa";

const PRIMARY = "#0E679D";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function Blog() {
  const [, navigate] = useLocation();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  usePageMeta({
    title: "Blog | ReviewOptic — Review Management Tips & Advice",
    description: "Tips, guides and advice on getting more customer reviews and growing your business reputation online.",
    path: "/blog",
  });

  useEffect(() => {
    fetch("/api/blog").then(r => r.json()).then(d => { setPosts(d); setLoading(false); });
  }, []);

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

      {/* ── HEADER ── */}
      <div className="pt-24">
        <div className="py-16 px-5 text-center" style={{ backgroundColor: PRIMARY }}>
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">ReviewOptic Blog</h1>
            <p className="text-white/80 text-lg">Tips, guides and advice on getting more customer reviews.</p>
          </div>
        </div>
      </div>

      {/* ── POSTS ── */}
      <main className="max-w-4xl mx-auto px-5 py-16">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded mb-3 w-1/3" />
                <div className="h-6 bg-gray-100 rounded mb-3" />
                <div className="h-4 bg-gray-100 rounded mb-2 w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/6" />
              </div>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No posts yet — check back soon.</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map(post => (
              <button
                key={post.id}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="text-left rounded-2xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                {post.published_at && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.published_at)}
                  </div>
                )}
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors leading-snug">{post.title}</h2>
                {post.excerpt && <p className="text-sm text-gray-500 leading-relaxed mb-4">{post.excerpt}</p>}
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: PRIMARY }}>
                  Read more <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-5">
        <div className="max-w-6xl mx-auto text-sm text-center space-y-3">
          <div className="flex flex-wrap justify-center gap-5">
            <button onClick={() => navigate("/")} className="hover:text-white transition-colors">Home</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white transition-colors">Terms & Conditions</button>
            <button onClick={() => navigate("/pricing")} className="hover:text-white transition-colors">Pricing</button>
            <button onClick={() => navigate("/faq")} className="hover:text-white transition-colors">FAQ</button>
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
