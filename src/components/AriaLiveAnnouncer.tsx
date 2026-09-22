import React from 'react';

interface AriaLiveAnnouncerProps {
  politeMessage: string;
  assertiveMessage: string;
}

export const AriaLiveAnnouncer: React.FC<AriaLiveAnnouncerProps> = ({
  politeMessage,
  assertiveMessage,
}) => {
  return (
    <div className="sr-only" aria-hidden="false">
      {/* Polite live region for general updates (scans, filters, status) */}
      <div
        id="aerosight-polite-announcer"
        aria-live="polite"
        aria-atomic="true"
      >
        {politeMessage}
      </div>

      {/* Assertive live region for critical direct target lock and urgent alerts */}
      <div
        id="aerosight-assertive-announcer"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertiveMessage}
      </div>
    </div>
  );
};
