export default function Landing({ onPrimary }: { onPrimary?: () => void }) {
  return (
    <div className="landing">
      <div>
        <h1>Memento°</h1>
        <p>Create a wall for someone special</p>

        <button onClick={onPrimary} className="btn-primary">
          Create New Wall
        </button>
        <a href="#/dashboard" className="link-secondary">
          View My Walls
        </a>
      </div>
    </div>
  );
}
