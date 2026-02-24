export interface MIDINoteEvent {
  note: number;
  velocity: number;
  timestamp: number;
  duration?: number;
  isNoteOn: boolean;
}

export interface MIDIRecording {
  notes: MIDINoteEvent[];
  startTime: number;
  endTime: number;
  tempo: number;
}

export class MIDIEngine {
  private midiAccess: MIDIAccess | null = null;
  private activeInputs: Map<string, MIDIInput> = new Map();
  private recording: boolean = false;
  private recordedNotes: MIDINoteEvent[] = [];
  private recordingStartTime: number = 0;
  private onNoteCallback: ((event: MIDINoteEvent) => void) | null = null;
  private activeNotes: Map<number, number> = new Map(); // note -> timestamp

  async initialize(): Promise<boolean> {
    try {
      if (navigator.requestMIDIAccess) {
        this.midiAccess = await navigator.requestMIDIAccess();
        
        this.setupMIDIInputs();
        return true;
      } else {
        console.error('Web MIDI API not supported');
        return false;
      }
    } catch (error) {
      console.error('Failed to get MIDI access:', error);
      return false;
    }
  }

  private setupMIDIInputs() {
    if (!this.midiAccess) return;

    this.midiAccess.inputs.forEach((input) => {
      
      this.activeInputs.set(input.id, input);
      input.onmidimessage = this.handleMIDIMessage.bind(this);
    });

    // Listen for device changes
    this.midiAccess.onstatechange = (event) => {
      const port = event.port as MIDIInput;
      if (port.type === 'input') {
        if (port.state === 'connected') {
          
          this.activeInputs.set(port.id, port);
          port.onmidimessage = this.handleMIDIMessage.bind(this);
        } else if (port.state === 'disconnected') {
          
          this.activeInputs.delete(port.id);
        }
      }
    };
  }

  private handleMIDIMessage(event: MIDIMessageEvent) {
    const [status, note, velocity] = event.data;
    const command = status >> 4;
    const channel = status & 0xf;
    const timestamp = performance.now();

    // Note On (command 9) and Note Off (command 8)
    if (command === 9 || command === 8) {
      const isNoteOn = command === 9 && velocity > 0;
      
      const noteEvent: MIDINoteEvent = {
        note,
        velocity,
        timestamp,
        isNoteOn
      };

      // Calculate note duration for note off events
      if (!isNoteOn && this.activeNotes.has(note)) {
        const noteOnTime = this.activeNotes.get(note)!;
        noteEvent.duration = timestamp - noteOnTime;
        this.activeNotes.delete(note);
      } else if (isNoteOn) {
        this.activeNotes.set(note, timestamp);
      }

      // Callback for real-time playback
      if (this.onNoteCallback) {
        this.onNoteCallback(noteEvent);
      }

      // Record if recording is active
      if (this.recording) {
        this.recordedNotes.push(noteEvent);
      }
    }

    // Control Change (command 11)
    if (command === 11) {
      
      // Handle control changes (sustain pedal, mod wheel, etc.)
    }
  }

  startRecording(tempo: number = 120) {
    this.recording = true;
    this.recordedNotes = [];
    this.recordingStartTime = performance.now();
    this.activeNotes.clear();
    
  }

  stopRecording(): MIDIRecording {
    this.recording = false;
    const endTime = performance.now();
    
    const notes = this.recordedNotes.sort((a, b) => a.timestamp - b.timestamp);
    
    
    
    return {
      notes,
      startTime: this.recordingStartTime,
      endTime,
      tempo: 120
    };
  }

  isRecording(): boolean {
    return this.recording;
  }

  onNote(callback: (event: MIDINoteEvent) => void) {
    this.onNoteCallback = callback;
  }

  getConnectedDevices(): string[] {
    return Array.from(this.activeInputs.values()).map(input => input.name || 'Unknown Device');
  }

  dispose() {
    this.activeInputs.forEach(input => {
      input.onmidimessage = null;
    });
    this.activeInputs.clear();
    this.midiAccess = null;
  }

  // Convert MIDI note number to frequency
  static noteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // Convert MIDI note number to note name
  static noteToName(note: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(note / 12) - 1;
    const noteName = noteNames[note % 12];
    return `${noteName}${octave}`;
  }
}
