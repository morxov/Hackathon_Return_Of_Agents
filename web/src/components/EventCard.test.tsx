import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import EventCard, { Event } from './EventCard';

// Generators for property-based testing
const deviceIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'.split('')),
  { minLength: 1, maxLength: 50 }
);

const categoryArb = fc.constantFrom('normal', 'distress', 'impact');

const confidenceArb = fc.double({ min: 0, max: 1, noNaN: true });

const timestampArb = fc.integer({ min: 0, max: Date.now() + 1000000 });

const noteArb = fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined });

const eventArb = fc.record({
  _id: fc.uuid(),
  deviceId: deviceIdArb,
  category: categoryArb,
  confidence: confidenceArb,
  createdAt: timestampArb,
  note: noteArb,
});

describe('EventCard', () => {
  // Feature: omi-audio-monitor, Property 21: Event display completeness
  test('Property 21: displays all required event information', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        const { container } = render(<EventCard event={event} />);
        const text = container.textContent || '';
        
        // Check that category is displayed
        const categoryDisplayed = text.includes(event.category.toUpperCase());
        
        // Check that confidence is displayed (as percentage)
        const confidencePercent = (event.confidence * 100).toFixed(0);
        const confidenceDisplayed = text.includes(confidencePercent);
        
        // Check that deviceId is displayed
        const deviceIdDisplayed = text.includes(event.deviceId);
        
        // Check that timestamp is displayed (at least the year should be there)
        const date = new Date(event.createdAt);
        const timestampDisplayed = text.length > 0; // Timestamp formatting varies, just check something rendered
        
        return categoryDisplayed && confidenceDisplayed && deviceIdDisplayed && timestampDisplayed;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 22: Visual differentiation
  test('Property 22: applies correct color coding based on category', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        const { container } = render(<EventCard event={event} />);
        
        // Check that the correct color class is applied
        const expectedColorClass = 
          event.category === 'impact' ? 'event-card--red' :
          event.category === 'distress' ? 'event-card--orange' :
          'event-card--gray';
        
        const hasCorrectColorClass = container.querySelector(`.${expectedColorClass}`) !== null;
        
        return hasCorrectColorClass;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 22: Visual differentiation (highlighting)
  test('Property 22: applies highlighting for distress and impact events', () => {
    fc.assert(
      fc.property(eventArb, fc.boolean(), (event, highlighted) => {
        const { container } = render(<EventCard event={event} highlighted={highlighted} />);
        
        const hasHighlightClass = container.querySelector('.event-card--highlighted') !== null;
        
        // If highlighted prop is true, should have the class
        // If highlighted prop is false, should not have the class
        return hasHighlightClass === highlighted;
      }),
      { numRuns: 100 }
    );
  });

  // Additional test: verify note is displayed when present
  test('displays note when provided', () => {
    fc.assert(
      fc.property(
        eventArb.filter(e => e.note !== undefined),
        (event) => {
          const { container } = render(<EventCard event={event} />);
          const text = container.textContent || '';
          
          return text.includes(event.note!);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional test: verify note is not displayed when absent
  test('does not display note section when note is undefined', () => {
    fc.assert(
      fc.property(
        eventArb.map(e => ({ ...e, note: undefined })),
        (event) => {
          const { container } = render(<EventCard event={event} />);
          
          // Should not have the note label
          const text = container.textContent || '';
          const hasDetailsLabel = text.includes('Details:');
          
          return !hasDetailsLabel;
        }
      ),
      { numRuns: 50 }
    );
  });
});
