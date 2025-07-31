
import './App.css'

function App() {

  async function handleClick(){
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/signin`  
}

  return (
    <>
      <div className="MainContainer">
        <button onClick={handleClick}>Sign in to Microsoft </button>
      </div>
    </>
  )
}

export default App
