import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className='p-4 text-center'>
      <h1 className='text-3xl font-bold mb-4'>404</h1>
      <p>Sivua ei löytynyt.</p>
      <p className='mt-4'>
        <Link to='/' className='text-green-700 underline'>
          Takaisin etusivulle
        </Link>
      </p>
    </div>
  )
}
