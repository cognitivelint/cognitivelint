export function ProjectActions() {
  return (
    <button onClick={deleteProject}>
      <TrashIcon />
    </button>
  );
}

function TrashIcon() {
  return <svg aria-hidden={false} />;
}

function deleteProject() {}
