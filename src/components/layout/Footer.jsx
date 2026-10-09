export default function Footer() {
  return (
    <footer className="footer">
      <div className="logo">
        KINO <span>XII</span>
      </div>
      <p>© {new Date().getFullYear()} Kino XII. All rights reserved.</p>
    </footer>
  );
}
