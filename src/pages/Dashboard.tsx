import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoanSection from '../components/LoanSection';
import InvestmentChart from '../components/InvestmentChart';
import GenerateToken from '../components/GenerateToken';
import SetPin from '../components/SetPin';

export default function Dashboard() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Hyvää huomenta');
    else if (h < 18) setGreeting('Hyvää iltapäivää');
    else setGreeting('Hyvää iltaa');
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold mb-1">
          {greeting}{user ? `, ${user.displayName || user.username}` : ''} – Tervetuloa HenryBankkiin
        </h1>
        <p className="text-sm text-gray-600">
          Käytä ylävalikkoa siirtyäksesi sijoituksiin, lainoihin, token-maksuihin tai admin-paneeliin.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-2">Lainapalvelut</h2>
        <LoanSection />
      </section>
      
<Link to="/adminpanel">Admin Panel</Link>

      <section>
        <h2 className="text-xl font-semibold mb-2">Sijoitukset</h2>
        <InvestmentChart />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Maksutoken & PIN</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <GenerateToken />
          <SetPin />
        </div>
      </section>
    </div>
  );
}
