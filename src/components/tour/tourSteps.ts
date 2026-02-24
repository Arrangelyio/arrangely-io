import { Step } from 'react-joyride';
import React from 'react';

export const getGeneralTourSteps = (): Step[] => [
  {
    target: 'body',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h2', { className: 'text-2xl font-bold' }, 'Welcome to Live Performance! 🎵'),
      React.createElement('p', { className: 'text-base' }, 
        "Let's take a quick tour of the features that will help you deliver an amazing performance. This tour will show you how to control your session, navigate songs, and perform hands-free."
      )
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="transpose"]',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '🎹 Transpose'),
      React.createElement('p', { className: 'text-sm' }, 
        'Change the key of your song instantly! Perfect for matching vocal ranges or accommodating different instruments.'
      ),
      React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
        React.createElement('li', null, 'Transpose up or down'),
        React.createElement('li', null, 'Choose between sharps and flats'),
        React.createElement('li', null, 'All chords update automatically')
      )
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="share-session"]',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '🔗 Share Session'),
      React.createElement('p', { className: 'text-sm' }, 
        'Share your live performance session with band members! Everyone can follow along in real-time.'
      ),
      React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
        React.createElement('li', null, 'Generate a shareable link'),
        React.createElement('li', null, 'Band members sync automatically'),
        React.createElement('li', null, 'Perfect for remote rehearsals')
      )
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="all-sections"]',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '📖 All Sections'),
      React.createElement('p', { className: 'text-sm' }, 
        'Toggle to view all song sections at once or focus on one section at a time. Great for getting the full picture of your arrangement.'
      )
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="sections"]',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '📋 Song Sections'),
      React.createElement('p', { className: 'text-sm' }, 
        'Navigate through your song structure. Click any section to jump directly to it, or use gestures for hands-free control.'
      ),
      React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
        React.createElement('li', null, 'Active section is highlighted'),
        React.createElement('li', null, 'Shows repeat counts'),
        React.createElement('li', null, 'Quick navigation between parts')
      )
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="gesture-control"]',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '👁️ Gesture Control'),
      React.createElement('p', { className: 'text-sm' }, 
        'Control your performance hands-free using hand gestures!'
      ),
      React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
        React.createElement('li', null, React.createElement('strong', null, 'Point right:'), ' Next section'),
        React.createElement('li', null, React.createElement('strong', null, 'Point left:'), ' Previous section')
      ),
      React.createElement('p', { className: 'text-sm text-primary font-semibold mt-2' }, 
        'Tip: Ensure good lighting and be clearly visible to the camera!'
      )
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="tempo"]',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '⏱️ Tempo Control'),
      React.createElement('p', { className: 'text-sm' }, 
        'Adjust the speed of your performance from 60 to 200 BPM. Use the buttons or gestures to change tempo in real-time.'
      ),
      React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
        React.createElement('li', null, 'Quick +5/-5 BPM adjustments'),
        React.createElement('li', null, 'Perfect for practice sessions'),
        React.createElement('li', null, 'Syncs with all band members')
      )
    ),
    placement: 'left',
  },
  {
    target: '[data-tour="metronome"]',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '🎵 Metronome'),
      React.createElement('p', { className: 'text-sm' }, 
        'Keep perfect time with the built-in metronome. Adjusts automatically to your tempo settings.'
      ),
      React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
        React.createElement('li', null, 'Visual and audio clicks'),
        React.createElement('li', null, 'Matches time signature'),
        React.createElement('li', null, 'Essential for practice and recording')
      )
    ),
    placement: 'left',
  },
  {
    target: 'body',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h2', { className: 'text-2xl font-bold' }, '🎸 You\'re All Set!'),
      React.createElement('div', { className: 'space-y-2 text-sm' },
        React.createElement('p', null, 
          React.createElement('strong', null, 'Pro Tips:')
        ),
        React.createElement('ul', { className: 'space-y-1 ml-4 list-disc' },
          React.createElement('li', null, 'Use gesture mode for hands-free performance'),
          React.createElement('li', null, 'Share sessions with your band for real-time sync'),
          React.createElement('li', null, 'Toggle "All Sections" to get the big picture'),
          React.createElement('li', null, 'Adjust tempo during practice to perfect timing')
        ),
        React.createElement('p', { className: 'text-primary font-semibold mt-3' }, 
          'Ready to rock! You can restart this tour anytime from your profile settings.'
        )
      )
    ),
    placement: 'center',
  },
];

export const getRoleSpecificSteps = (role: string): Step[] => {
  const roleSteps: Record<string, Step[]> = {
    vocalist: [
      {
        target: 'body',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('h3', { className: 'text-xl font-bold' }, '🎤 Vocalist Mode'),
          React.createElement('p', { className: 'text-sm' }, 'Special features for vocalists:'),
          React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
            React.createElement('li', null, React.createElement('strong', null, 'Clean lyrics view:'), ' Focus on what you need to sing'),
            React.createElement('li', null, React.createElement('strong', null, 'Large display:'), ' Easy to read from a distance'),
            React.createElement('li', null, React.createElement('strong', null, 'Section highlighting:'), ' Always know where you are'),
            React.createElement('li', null, React.createElement('strong', null, 'Gesture control:'), ' Navigate hands-free while holding the mic')
          ),
          React.createElement('p', { className: 'text-sm text-primary font-semibold mt-2' }, 
            'Use transpose to find your perfect key!'
          )
        ),
        placement: 'center',
      },
    ],
    guitarist: [
      {
        target: 'body',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('h3', { className: 'text-xl font-bold' }, '🎸 Guitarist Mode'),
          React.createElement('p', { className: 'text-sm' }, 'Optimized for guitarists:'),
          React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
            React.createElement('li', null, React.createElement('strong', null, 'Chord progressions:'), ' Clear view of all chords'),
            React.createElement('li', null, React.createElement('strong', null, 'Quick transpose:'), ' Change keys instantly'),
            React.createElement('li', null, React.createElement('strong', null, 'Section jumps:'), ' Perfect for rehearsing specific parts'),
            React.createElement('li', null, React.createElement('strong', null, 'Gesture control:'), ' Change sections without stopping')
          ),
          React.createElement('p', { className: 'text-sm text-primary font-semibold mt-2' }, 
            'Use the metronome to lock in your timing!'
          )
        ),
        placement: 'center',
      },
    ],
    keyboardist: [
      {
        target: 'body',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('h3', { className: 'text-xl font-bold' }, '🎹 Keyboardist Mode'),
          React.createElement('p', { className: 'text-sm' }, 'Features for piano/keyboard players:'),
          React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
            React.createElement('li', null, React.createElement('strong', null, 'Chord voicings:'), ' Plan your inversions'),
            React.createElement('li', null, React.createElement('strong', null, 'Key signature:'), ' Always visible at the top'),
            React.createElement('li', null, React.createElement('strong', null, 'Section navigation:'), ' Jump to practice specific parts'),
            React.createElement('li', null, React.createElement('strong', null, 'Gesture control:'), ' Perfect for hands-free page turning')
          ),
          React.createElement('p', { className: 'text-sm text-primary font-semibold mt-2' }, 
            'Use transpose to match different vocalists!'
          )
        ),
        placement: 'center',
      },
    ],
    bassist: [
      {
        target: 'body',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('h3', { className: 'text-xl font-bold' }, '🎸 Bassist Mode'),
          React.createElement('p', { className: 'text-sm' }, 'Tailored for bass players:'),
          React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
            React.createElement('li', null, React.createElement('strong', null, 'Root notes:'), ' Chord display shows what to anchor on'),
            React.createElement('li', null, React.createElement('strong', null, 'Tempo tracking:'), ' Lock in with the BPM display'),
            React.createElement('li', null, React.createElement('strong', null, 'Section structure:'), ' Know when changes are coming'),
            React.createElement('li', null, React.createElement('strong', null, 'Metronome:'), ' Keep perfect time with the rhythm')
          ),
          React.createElement('p', { className: 'text-sm text-primary font-semibold mt-2' }, 
            'Use tempo control to find the perfect groove!'
          )
        ),
        placement: 'center',
      },
    ],
    drummer: [
      {
        target: 'body',
        content: React.createElement('div', { className: 'space-y-3' },
          React.createElement('h3', { className: 'text-xl font-bold' }, '🥁 Drummer Mode'),
          React.createElement('p', { className: 'text-sm' }, 'Designed for drummers:'),
          React.createElement('ul', { className: 'text-sm space-y-1 ml-4 list-disc' },
            React.createElement('li', null, React.createElement('strong', null, 'BPM display:'), ' Stay locked to the tempo'),
            React.createElement('li', null, React.createElement('strong', null, 'Metronome:'), ' Visual and audio clicks for perfect timing'),
            React.createElement('li', null, React.createElement('strong', null, 'Section changes:'), ' Know when to change your beat'),
            React.createElement('li', null, React.createElement('strong', null, 'Gesture control:'), ' Navigate without dropping your sticks')
          ),
          React.createElement('p', { className: 'text-sm text-primary font-semibold mt-2' }, 
            'The metronome widget is specially enhanced for you!'
          )
        ),
        placement: 'center',
      },
    ],
  };

  return roleSteps[role] || [];
};
