import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

interface User {
  id: string;
  email: string;
  status: string;
  balance: number;
}

const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const usersData: User[] = [];
    querySnapshot.forEach((docSnap) => {
      usersData.push({ id: docSnap.id, ...(docSnap.data() as User) });
    });
    setUsers(usersData);
    setLoading(false);
  };

  const approveUser = async (userId: string) => {
    await updateDoc(doc(db, "users", userId), { status: "active" });
    fetchUsers();
  };

  const addFunds = async (userId: string, amount: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    await updateDoc(doc(db, "users", userId), { balance: user.balance + amount });
    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <p>Ladataan käyttäjiä...</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Saldo</th>
            <th className="p-2 border">Toiminnot</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="p-2 border">{user.email}</td>
              <td className="p-2 border">{user.status}</td>
              <td className="p-2 border">{user.balance} €</td>
              <td className="p-2 border space-x-2">
                {user.status === "pending" && (
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() => approveUser(user.id)}
                  >
                    Hyväksy
                  </button>
                )}
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                  onClick={() => addFunds(user.id, 100)}
                >
                  +100€
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
