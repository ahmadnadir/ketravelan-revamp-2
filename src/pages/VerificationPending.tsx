
import { useNavigate } from "react-router-dom";

export default function VerificationPending() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-2 bg-gradient-to-br from-[#f5f3ff] via-[#f0f4ff] to-[#e0e7ff] font-sans">
      <div
        className="w-full max-w-md bg-white/90 rounded-3xl border border-gray-100 p-5 sm:p-10 pt-8 pb-8 text-center shadow-2xl backdrop-blur-md"
        style={{ boxShadow: '0 8px 32px 0 rgba(80, 60, 180, 0.10)' }}
      >
        <div className="flex flex-col items-center justify-center gap-2 mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img 
              src="/ketravelan_logo.png" 
              alt="Ketravelan Logo" 
              style={{
                display: 'block',
                width: '200px',
                height: '48px',
                borderRadius: '12px',
                objectFit: 'contain'
              }}
            />
            <span style={{fontSize: '30px', lineHeight: 1}}>🚀</span>
          </div>
        </div>
        <h2 className="text-[1.2em] sm:text-[1.8em] mb-3.5 font-bold text-gray-900 tracking-[0.5px] drop-shadow-sm">Confirm your signup</h2>
        <p className="message text-[1em] sm:text-[1.1em] mb-2 text-gray-800 leading-relaxed">
          You're just one click away from joining the <span className="brand font-bold" style={{color: 'rgb(103, 15, 255)'}}>Ketravelan</span> adventure.<br />
          Let's get this party started.
        </p>
        <div className="text-[0.97em] sm:text-[1em] text-gray-700 mb-6">
          We’ve sent a verification link to your email. Please check your inbox to verify your account.
        </div>
        <button
          className="inline-block mt-5 px-6 sm:px-8 py-3 bg-black text-white font-semibold rounded-xl text-[1em] sm:text-[1.1em] border-0 shadow-lg transition-all duration-200 hover:bg-gray-900 hover:scale-[1.03] w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-gray-500"
          onClick={() => navigate('/auth?mode=login')}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
