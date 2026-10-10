import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="kino-footer">
      <div className="kino-footer-inner">
        <Link to="/" className="kino-footer-brand" aria-label="Kino XII home">
          KINO <span>XII</span>
        </Link>
        <p>© {new Date().getFullYear()} Kino XII. All rights reserved.</p>
      </div>
    </footer>
  );
}
