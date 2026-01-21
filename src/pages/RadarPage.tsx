import { useParams } from 'react-router-dom';

const RadarPage = () => {
  const { id } = useParams<{ id: string }>();

  // Auth is handled by route loader (requireAuth)
  // This component only renders when user is authenticated

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Radar: {id}</h1>
      <p className="text-gray-600 mt-2">Placeholder - will show radar collection</p>
    </div>
  );
};

export default RadarPage;
