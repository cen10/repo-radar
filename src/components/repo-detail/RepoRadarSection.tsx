import { useState } from 'react';
import type { Repository } from '../../types';
import { useRadars } from '../../hooks/useRadars';
import { ManageRadarsModal } from '../ManageRadarsModal';
import { StaticRadarIcon } from '../icons';
import { Button } from '../Button';

interface RepoRadarSectionProps {
  repository: Repository;
  radarIds: string[];
}

export function RepoRadarSection({ repository, radarIds }: RepoRadarSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { radars } = useRadars();

  const isOnRadars = radarIds.length > 0;

  const radarNames = radars.filter((r) => radarIds.includes(r.id)).map((r) => r.name);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      {isOnRadars ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <StaticRadarIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              On {radarIds.length} radar{radarIds.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {radarNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
              >
                {name}
              </span>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
            Manage radars
          </Button>
        </>
      ) : (
        <div className="text-center">
          <StaticRadarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Track this repository</h2>
          <p className="text-gray-500 mb-4">Add this repo to a radar to monitor its activity</p>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Add to Radar
          </Button>
        </div>
      )}

      {isModalOpen && (
        <ManageRadarsModal githubRepoId={repository.id} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
