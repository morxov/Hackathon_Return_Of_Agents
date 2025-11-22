import React from 'react';
import './EventCard.css';

export interface Event {
  _id: string;
  deviceId: string;
  category: string;
  confidence: number;
  createdAt: number;
  note?: string;
  transcript?: string;
  threatKeywords?: string[];
  threatLevel?: string;
  sessionId?: string;
}

interface EventCardProps {
  event: Event;
  highlighted?: boolean;
}

function EventCard({ event, highlighted = false }: EventCardProps) {
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'threat':
        return 'red';
      case 'impact':
        return 'red';
      case 'distress':
        return 'orange';
      case 'monitor':
        return 'yellow';
      case 'normal':
      default:
        return 'gray';
    }
  };

  const categoryColor = getCategoryColor(event.category);
  const cardClassName = `event-card event-card--${categoryColor}${highlighted ? ' event-card--highlighted' : ''}`;

  return (
    <div className={cardClassName}>
      <div className="event-card__header">
        <span className={`event-card__category event-card__category--${categoryColor}`}>
          {event.category.toUpperCase()}
        </span>
        <span className="event-card__confidence">
          {(event.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="event-card__body">
        <div className="event-card__info">
          <span className="event-card__label">Device:</span>
          <span className="event-card__value">{event.deviceId}</span>
        </div>
        <div className="event-card__info">
          <span className="event-card__label">Time:</span>
          <span className="event-card__value">{formatTimestamp(event.createdAt)}</span>
        </div>
        {event.threatLevel && (
          <div className="event-card__info">
            <span className="event-card__label">Threat Level:</span>
            <span className="event-card__value" style={{ fontWeight: 'bold', color: categoryColor }}>
              {event.threatLevel.toUpperCase()}
            </span>
          </div>
        )}
        {event.threatKeywords && event.threatKeywords.length > 0 && (
          <div className="event-card__info">
            <span className="event-card__label">Keywords:</span>
            <span className="event-card__value" style={{ color: 'red', fontWeight: 'bold' }}>
              {event.threatKeywords.join(', ')}
            </span>
          </div>
        )}
        {event.transcript && (
          <div className="event-card__info">
            <span className="event-card__label">Transcript:</span>
            <span className="event-card__value event-card__note" style={{ fontStyle: 'italic' }}>
              "{event.transcript.substring(0, 150)}{event.transcript.length > 150 ? '...' : ''}"
            </span>
          </div>
        )}
        {event.note && !event.transcript && (
          <div className="event-card__info">
            <span className="event-card__label">Details:</span>
            <span className="event-card__value event-card__note">{event.note}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventCard;
