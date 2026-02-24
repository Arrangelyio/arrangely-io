import { useState, useEffect, useRef } from 'react';
import { Mic, Circle, Square, Disc, Music, Keyboard } from 'lucide-react';
import { MIDIEngine, type MIDIRecording } from '../lib/MIDIEngine';
import { InstrumentEngine, type InstrumentType } from '../lib/InstrumentEngine';
import { AudioRecorder } from '../lib/AudioRecorder';

interface MIDIRecorderProps {
  onRecordingComplete: (recording: MIDIRecording, audioBlob?: Blob) => void;
  sequencerId: string;
}

export default function MIDIRecorder({ onRecordingComplete, sequencerId }: MIDIRecorderProps) {
  const [midiConnected, setMidiConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('synth');
  const [recordingMode, setRecordingMode] = useState<'midi' | 'audio' | 'both'>('both');
  
  const midiEngineRef = useRef<MIDIEngine | null>(null);
  const instrumentEngineRef = useRef<InstrumentEngine | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    initializeEngines();
    return () => {
      midiEngineRef.current?.dispose();
      instrumentEngineRef.current?.dispose();
      audioRecorderRef.current?.dispose();
    };
  }, []);

  const initializeEngines = async () => {
    // Initialize MIDI Engine
    const midiEngine = new MIDIEngine();
    const midiSuccess = await midiEngine.initialize();
    midiEngineRef.current = midiEngine;
    setMidiConnected(midiSuccess);
    
    if (midiSuccess) {
      const connectedDevices = midiEngine.getConnectedDevices();
      setDevices(connectedDevices);
    }

    // Initialize Instrument Engine
    const instrumentEngine = new InstrumentEngine();
    await instrumentEngine.initialize();
    instrumentEngineRef.current = instrumentEngine;

    // Create default instrument
    const instrumentId = 'live-instrument';
    instrumentEngine.createInstrument(instrumentId, {
      type: selectedInstrument,
      volume: 0.8,
      pan: 0,
      effects: {
        reverb: 0.3
      }
    });

    // Setup MIDI -> Instrument playback
    midiEngine.onNote((event) => {
      if (event.isNoteOn) {
        instrumentEngine.startNote(instrumentId, event.note, event.velocity);
      } else {
        instrumentEngine.stopNote(instrumentId, event.note);
      }
    });

    // Initialize Audio Recorder
    const audioRecorder = new AudioRecorder();
    await audioRecorder.initialize();
    audioRecorderRef.current = audioRecorder;
  };

  const startRecording = async () => {
    if (!midiEngineRef.current) return;

    setRecording(true);
    
    // Start MIDI recording
    if (recordingMode === 'midi' || recordingMode === 'both') {
      midiEngineRef.current.startRecording();
    }

    // Start audio recording
    if (recordingMode === 'audio' || recordingMode === 'both') {
      audioRecorderRef.current?.startRecording();
      setRecordingAudio(true);
    }
  };

  const stopRecording = async () => {
    setRecording(false);

    let midiRecording: MIDIRecording | undefined;
    let audioBlob: Blob | undefined;

    try {
      // Stop MIDI recording
      if (recordingMode === 'midi' || recordingMode === 'both') {
        if (midiEngineRef.current) {
          midiRecording = midiEngineRef.current.stopRecording();
          
        }
      }

      // Stop audio recording
      if (recordingMode === 'audio' || recordingMode === 'both') {
        if (audioRecorderRef.current) {
          
          const result = await audioRecorderRef.current.stopRecording();
          
          // Convert to WAV
          audioBlob = await audioRecorderRef.current.convertToWav(result.blob);
          
          setRecordingAudio(false);
        } else {
          console.error('Audio recorder not initialized');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert('Failed to stop recording: ' + (error as Error).message);
    }

    // Call callback with recording data
    if (midiRecording || audioBlob) {
      onRecordingComplete(midiRecording!, audioBlob);
    }
  };

  const changeInstrument = (instrumentType: InstrumentType) => {
    setSelectedInstrument(instrumentType);
    
    if (instrumentEngineRef.current) {
      instrumentEngineRef.current.removeInstrument('live-instrument');
      instrumentEngineRef.current.createInstrument('live-instrument', {
        type: instrumentType,
        volume: 0.8,
        pan: 0,
        effects: {
          reverb: 0.3
        }
      });
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">MIDI Recording</h3>
        </div>
        <div className={`flex items-center gap-2 ${midiConnected ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${midiConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
          <span className="text-sm">{midiConnected ? 'MIDI Connected' : 'No MIDI Device'}</span>
        </div>
      </div>

      {/* Connected Devices */}
      {devices.length > 0 && (
        <div className="bg-gray-800 rounded p-3">
          <p className="text-sm text-gray-400 mb-2">Connected Devices:</p>
          <div className="space-y-1">
            {devices.map((device, index) => (
              <div key={index} className="text-sm text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-blue-400" />
                {device}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recording Mode */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400">Recording Mode:</p>
        <div className="flex gap-2">
          <button
            onClick={() => setRecordingMode('midi')}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
              recordingMode === 'midi'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            MIDI Only
          </button>
          <button
            onClick={() => setRecordingMode('audio')}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
              recordingMode === 'audio'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Audio Only
          </button>
          <button
            onClick={() => setRecordingMode('both')}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium transition ${
              recordingMode === 'both'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {/* Instrument Selection */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400">Instrument:</p>
        <div className="grid grid-cols-5 gap-2">
          {(['synth', 'piano', 'bass', 'pad', 'drums'] as InstrumentType[]).map((type) => (
            <button
              key={type}
              onClick={() => changeInstrument(type)}
              disabled={recording}
              className={`px-3 py-2 rounded text-sm font-medium capitalize transition ${
                selectedInstrument === type
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex gap-2">
        {!recording ? (
          <button
            onClick={startRecording}
            disabled={!midiConnected}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition"
          >
            <Circle className="w-5 h-5 fill-current" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition"
          >
            <Square className="w-5 h-5 fill-current" />
            Stop Recording
          </button>
        )}
      </div>

      {/* Recording Indicator */}
      {recording && (
        <div className="bg-red-900/20 border border-red-500 rounded p-3 flex items-center gap-3">
          <Disc className="w-5 h-5 text-red-400 animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Recording in progress...</p>
            <p className="text-xs text-gray-400 mt-1">
              Mode: {recordingMode === 'both' ? 'MIDI + Audio' : recordingMode.toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!midiConnected && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded p-3">
          <p className="text-sm text-yellow-400">
            Connect a MIDI controller to start recording. Make sure your MIDI device is properly connected and recognized by your system.
          </p>
        </div>
      )}
    </div>
  );
}
