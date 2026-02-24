import { Step } from 'react-joyride';
import React from 'react';
import livePreviewFull from '@/assets/tour/live-preview-full.png';

export const getPreviewTourSteps = (): Step[] => [
  {
    target: '#preview-tour-image',
    content: React.createElement('div', { className: 'space-y-3' },
      React.createElement('h2', { className: 'text-2xl font-bold mb-2' }, 'Live Preview Tour 🎵'),
      React.createElement('p', { className: 'text-base' }, 
        "Let's explore what Live Preview offers! We'll walk through each feature on this interface."
      )
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '#preview-tour-transpose',
    content: React.createElement('div', { className: 'space-y-2' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '🎹 Transpose'),
      React.createElement('p', { className: 'text-sm' }, 
        'Change the key of your song instantly to match any vocal range or instrument tuning.'
      )
    ),
    placement: 'bottom',
  },
  {
    target: '#preview-tour-share',
    content: React.createElement('div', { className: 'space-y-2' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '🔗 Share Session'),
      React.createElement('p', { className: 'text-sm' }, 
        'Generate a link to share with band members. Everyone stays in sync in real-time!'
      )
    ),
    placement: 'bottom',
  },
  {
    target: '#preview-tour-gesture',
    content: React.createElement('div', { className: 'space-y-2' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '👁️ Gesture Control'),
      React.createElement('p', { className: 'text-sm' }, 
        'Navigate hands-free using hand gestures - perfect when playing instruments!'
      ),
      React.createElement('ul', { className: 'text-xs space-y-1 ml-4 list-disc' },
        React.createElement('li', null, 'Point right → Next section'),
        React.createElement('li', null, 'Point left → Previous section')
      )
    ),
    placement: 'right',
  },
  {
    target: '#preview-tour-tempo',
    content: React.createElement('div', { className: 'space-y-2' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '⏱️ Tempo Control'),
      React.createElement('p', { className: 'text-sm' }, 
        'Adjust performance speed from 60-200 BPM with quick +5/-5 buttons or custom values.'
      )
    ),
    placement: 'right',
  },
  {
    target: '#preview-tour-metronome',
    content: React.createElement('div', { className: 'space-y-2' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '🎵 Metronome'),
      React.createElement('p', { className: 'text-sm' }, 
        'Built-in metronome with visual and audio clicks. Automatically matches your tempo and time signature.'
      )
    ),
    placement: 'right',
  },
  {
    target: '#preview-tour-sections',
    content: React.createElement('div', { className: 'space-y-2' },
      React.createElement('h3', { className: 'text-xl font-bold' }, '📋 All Sections'),
      React.createElement('p', { className: 'text-sm' }, 
        'View all song sections at once or navigate one by one - jump to any part instantly!'
      )
    ),
    placement: 'right',
  },
  {
    target: 'body',
    content: React.createElement('div', { className: 'space-y-4' },
      React.createElement('h2', { className: 'text-2xl font-bold' }, '🌟 Ready to Go Live?'),
      React.createElement('p', { className: 'text-base' }, 
        'Live Preview gives you professional performance tools:'
      ),
      React.createElement('ul', { className: 'text-sm space-y-2 ml-4 list-disc' },
        React.createElement('li', null, React.createElement('strong', null, '✋ Hands-free control'), ' with gesture recognition'),
        React.createElement('li', null, React.createElement('strong', null, '👥 Real-time collaboration'), ' with your band'),
        React.createElement('li', null, React.createElement('strong', null, '🎹 Instant transposition'), ' for any key'),
        React.createElement('li', null, React.createElement('strong', null, '⏱️ Precise tempo control'), ' and metronome'),
        React.createElement('li', null, React.createElement('strong', null, '📱 Works on all devices'), ' - phone, tablet, desktop')
      ),
      React.createElement('div', { className: 'mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700' },
        React.createElement('p', { className: 'text-sm font-semibold text-purple-900 dark:text-purple-100 text-center' }, 
          '🎸 Upgrade to unlock Live Preview and take your performances to the next level!'
        )
      )
    ),
    placement: 'center',
  },
];
