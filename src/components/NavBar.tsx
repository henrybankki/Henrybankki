import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { user, logout } = useAuth()
  const loc = useLocation()

  const active = (path: string) =>
    loc.pathname === path ? 'font-bold underline' : ''

  return (
    <nav className='w-full bg-white border-b mb-4'>
      <div className='max-w-5xl mx-auto px-4 py-2 flex gap-4 items-center'>
        <Link to='/' className='text-green-700 font-bold'>
          HenryBankki
        </Link>
        {user && (
          <>
            <Link to='/' className={active('/')}>
              Etusivu
            </Link>
            <Link to='/bills' className={active('/bills')}>
              Laskut
            </Link>
            <Link to='/investments' className={active('/investments')}>
              Sijoitukset
            </Link>
            {user.role === 'admin' && (
              <Link to='/admin' className={active('/admin')}>
                Admin
              </Link>
            )}
            <button
              onClick={logout}
              className='ml-auto text-sm text-red-600 underline'
            >
              Kirjaudu ulos
            </button>
          </>
        )}
        {!user && (
          <>
            <Link to='/login' className={active('/login')}>
              Kirjaudu
            </Link>
            <Link to='/register' className={active('/register')}>
              Rekisteröidy
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
