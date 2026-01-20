import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/icons';

const RepoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status">
        <LoadingSpinner className="h-12 w-12 text-indigo-600" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Repository Details</h1>
      <p className="text-gray-600 mt-2">Placeholder - will show details for repo ID: {id}</p>
    </div>
  );
};

export default RepoDetailPage;
