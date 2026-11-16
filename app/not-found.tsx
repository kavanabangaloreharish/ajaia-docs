import Link from "next/link";

export default function NotFound() {
  return (
    <div className="login-card">
      <h1>Document not found</h1>
      <p className="muted">It may have been deleted, or it hasn't been shared with you.</p>
      <Link className="btn" href="/">Back to my documents</Link>
    </div>
  );
}
