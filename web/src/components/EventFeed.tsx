import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import EventCard, { Event } from './EventCard';
import './EventFeed.css';

function EventFeed() {
  const events = useQuery(api.events.recentEvents, { limit: 50 });

  if (events === undefined) {
    return (
      <div className="event-feed">
        <div className="event-feed__loading">Loading events...</div>
      </div>
    );
  }

  if (events === null) {
    return (
      <div className="event-feed">
        <div className="event-feed__error">Error loading events. Please check your connection.</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="event-feed">
        <div className="event-feed__empty">No events yet. Waiting for audio data...</div>
      </div>
    );
  }

  return (
    <div className="event-feed">
      <div className="event-feed__list">
        {events.map((event) => {
          const highlighted = 
            event.category === 'threat' || 
            event.category === 'distress' || 
            event.category === 'impact' ||
            (event.threatLevel && ['critical', 'high'].includes(event.threatLevel));
          return (
            <EventCard
              key={event._id}
              event={event as Event}
              highlighted={highlighted}
            />
          );
        })}
      </div>
    </div>
  );
}

export default EventFeed;
