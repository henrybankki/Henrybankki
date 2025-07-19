import { useAdminStatus } from '../hooks/useAdminStatus';

export default function AdminPanel() {
  const isAdmin = useAdminStatus();

  if (isAdmin === null) return <p>Ladataan...</p>;
  if (!isAdmin) return <p>Ei oikeuksia.</p>;

  return (
    <div>
      <h1>Admin paneeli</h1>
      {/* admin sisällöt */}
    </div>
  );
}
