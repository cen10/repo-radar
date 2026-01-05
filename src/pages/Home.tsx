import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      void navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Repo Radar</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Track momentum and activity across your starred GitHub repositories. Monitor star growth,
          releases, and issue activity all in one place.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left max-w-3xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-indigo-600 text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-1">Track Growth</h3>
            <p className="text-gray-600 text-sm">
              Monitor star counts and growth trends across repositories
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-indigo-600 text-2xl mb-2">🚀</div>
            <h3 className="font-semibold text-gray-900 mb-1">Release Updates</h3>
            <p className="text-gray-600 text-sm">
              Stay informed about new releases and version updates
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-indigo-600 text-2xl mb-2">🔔</div>
            <h3 className="font-semibold text-gray-900 mb-1">Activity Alerts</h3>
            <p className="text-gray-600 text-sm">
              Get notified about trending repos and increased activity
            </p>
          </div>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Sign in with GitHub
        </Link>
      </div>
    </div>
  );
};

export default Home;
