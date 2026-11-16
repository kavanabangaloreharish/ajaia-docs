const LABELS = { owner: "Owner", editor: "Can edit", viewer: "View only" } as const;

export default function RoleBadge({ role }: { role: keyof typeof LABELS }) {
  return <span className={`badge badge-${role}`}>{LABELS[role]}</span>;
}
