export default function Landing({
  onPrimary,
  onViewWalls,
}: {
  onPrimary?: () => void;
  onViewWalls?: () => void;
}) {
  return (
    <div className="landing">
      <div className="panel">
        <div className="panel-inner">
          <h1 className="title">Memento°</h1>
          <p className="subtitle">Create a wall for someone special</p>

          <div className="actions">
            <button onClick={onPrimary} className="btn-primary">
              Create New Wall
            </button>

            {/* use a button so App can decide where to route */}
            <button
              onClick={onViewWalls}
              className="link-secondary"
              style={{ background: "none", border: 0 }}
            >
              View My Walls
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
