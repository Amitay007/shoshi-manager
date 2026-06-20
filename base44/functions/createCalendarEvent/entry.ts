/**
 * Creates a Google Calendar event for a Silshuch
 * Requires Google Calendar connector to be authorized
 */

export default async function createCalendarEvent({ silshuchData }, { base44 }) {
  try {
    // Get Google Calendar access token
    const { access_token } = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    
    if (!access_token) {
      throw new Error('Google Calendar not authorized. Please authorize in Settings.');
    }

    let events = [];
    
    if (silshuchData.mode === 'static' && silshuchData.hasDates && silshuchData.executionDate) {
      // Create single event for static silshuch
      const eventDate = new Date(silshuchData.executionDate);
      const endDate = new Date(eventDate);
      endDate.setHours(endDate.getHours() + 2); // 2 hour default duration
      
      const event = {
        summary: `🎭 ${silshuchData.assignmentName}`,
        description: `שיבוץ משקפות VR\n\n${silshuchData.details || ''}\n\nמשקפות: ${silshuchData.selectedHeadsets?.length || 0}\nמספרי משקפות: ${silshuchData.selectedHeadsets?.join(', ') || 'לא צוין'}`,
        start: {
          dateTime: eventDate.toISOString(),
          timeZone: 'Asia/Jerusalem'
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'Asia/Jerusalem'
        },
        colorId: '9' // Purple color for VR events
      };
      
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create calendar event: ${error}`);
      }
      
      const createdEvent = await response.json();
      events.push({ eventId: createdEvent.id, sessionNumber: null });
      
    } else if (silshuchData.mode === 'dynamic' && silshuchData.hasDates && silshuchData.sessions) {
      // Create multiple events for dynamic silshuch
      for (const session of silshuchData.sessions) {
        if (session.sessionDate) {
          const eventDate = new Date(session.sessionDate);
          const endDate = new Date(eventDate);
          endDate.setHours(endDate.getHours() + 2);
          
          const event = {
            summary: `🎭 ${silshuchData.assignmentName} - מפגש ${session.sessionNumber}`,
            description: `שיבוץ משקפות VR - מפגש ${session.sessionNumber}\n\n${silshuchData.details || ''}\n\nמשקפות: ${session.headsets?.length || 0}\nמספרי משקפות: ${session.headsets?.join(', ') || 'לא צוין'}`,
            start: {
              dateTime: eventDate.toISOString(),
              timeZone: 'Asia/Jerusalem'
            },
            end: {
              dateTime: endDate.toISOString(),
              timeZone: 'Asia/Jerusalem'
            },
            colorId: '7' // Cyan color for VR events
          };
          
          const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          });
          
          if (!response.ok) {
            const error = await response.text();
            console.error(`Failed to create event for session ${session.sessionNumber}: ${error}`);
            continue;
          }
          
          const createdEvent = await response.json();
          events.push({ eventId: createdEvent.id, sessionNumber: session.sessionNumber });
        }
      }
    }
    
    return {
      success: true,
      eventsCreated: events.length,
      events
    };
    
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: error.message
    };
  }
}