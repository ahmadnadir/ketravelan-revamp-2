import { Link } from "react-router-dom";

export function FooterSection() {
  return (
    <footer className="border-t border-border/50 mt-4">
      {/* Main footer grid */}
      <div className="py-10 sm:py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* Brand */}
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <h3 className="text-lg font-bold text-foreground">Ketravelan</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Connecting travelers worldwide through authentic group travel experiences.
            Discover new destinations, meet like-minded travelers, and create unforgettable memories.
          </p>
          <p className="text-xs text-muted-foreground">Built for travelers, by travelers.</p>

          {/* Powered by MDEC */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Powered by</span>
            <img src="/mdec-logo.png" alt="MDEC" className="h-5 w-auto object-contain" />
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
          <ul className="space-y-2.5">
            <li>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Browse Trips
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Legal</h4>
          <ul className="space-y-2.5">
            <li>
              <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/50 py-5 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Rekasaksa Solutions Sdn. Bhd. 202501029027 (1630439-K). All rights reserved.
        </p>
      </div>
    </footer>
  );
}
