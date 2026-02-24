import React, { memo } from "react";

export type NoteType =
  | "whole"
  | "half"
  | "quarter"
  | "eighth"
  | "sixteenth"
  | "whole_rest"
  | "half_rest"
  | "quarter_rest"
  | "eighth_rest";

interface NoteSymbolProps {
  type: NoteType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// 1. Pindahkan data statis ke luar agar tidak dibuat ulang terus menerus
const dimensions = {
  sm: { w: 14, h: 20 },
  md: { w: 18, h: 26 },
  lg: { w: 24, h: 36 },
};

export const BeamDisplay = memo(
  ({ type, className = "" }: { type: NoteType; className?: string }) => {
    if (type !== "eighth" && type !== "sixteenth") return null;

    return (
      <div
        className={`absolute -top-1 left-0 w-full flex flex-col items-center pointer-events-none ${className}`}
      >
        {/* Garis Pertama (Eighth) */}
        <div className="w-[95%] h-[3px] bg-black dark:bg-cyan-400 rounded-full mb-[2px]" />

        {/* Garis Kedua (Sixteenth) */}
        {type === "sixteenth" && (
          <div className="w-[95%] h-[3px] bg-black dark:bg-cyan-400 rounded-full" />
        )}
      </div>
    );
  },
);

// 2. Gunakan React.memo agar icon tidak render ulang jika tidak ada perubahan data
export const NoteSymbol = memo(
  ({ type, size = "md", className = "" }: NoteSymbolProps) => {
    const { w, h } = dimensions[size];

    const renderPath = () => {
      switch (type) {
        case "whole":
          return (
            <ellipse
              cx="15"
              cy="30"
              rx="12"
              ry="7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          );
        case "half":
          return (
            <g fill="none" stroke="currentColor" strokeWidth="2.5">
              <ellipse cx="12" cy="30" rx="9" ry="6" />
              <path d="M21 30 V5" strokeLinecap="round" />
            </g>
          );
        case "quarter":
          return (
            <g fill="currentColor">
              <ellipse cx="12" cy="30" rx="9" ry="6" />
              <path
                d="M21 30 V5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          );
        case "eighth":
          return (
            <g fill="currentColor">
              <ellipse cx="12" cy="30" rx="9" ry="6" />
              <path d="M21 30 V5" stroke="currentColor" strokeWidth="2.5" />
              <path
                d="M21 5 Q 32 10 32 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          );
        case "sixteenth":
          return (
            <g fill="currentColor">
              <ellipse cx="12" cy="30" rx="9" ry="6" />
              <path d="M21 30 V5" stroke="currentColor" strokeWidth="2.5" />
              <path
                d="M21 5 Q 32 10 32 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M21 12 Q 32 17 32 25"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          );
        // Tambahkan case untuk Rest agar tidak error null
        case "whole_rest":
          return (
            <rect x="5" y="15" width="20" height="6" fill="currentColor" />
          );
        case "half_rest":
          return (
            <rect x="5" y="22" width="20" height="6" fill="currentColor" />
          );
        default:
          return null;
      }
    };

    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 35 45"
        className={className}
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        {renderPath()}
      </svg>
    );
  },
);

// 3. Tambahkan NotationDisplay di file yang sama agar import di ChordGridGenerator tidak error
interface NotationDisplayProps {
  notes: Array<{
    type: NoteType;
    tied?: boolean;
    dotted?: boolean;
  }>;
  className?: string;
}

export const NotationDisplay = memo(
  ({ notes, className = "" }: NotationDisplayProps) => {
    if (!notes || notes.length === 0) return null;

    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        {notes.map((note, idx) => (
          <div key={idx} className="flex items-center relative">
            <NoteSymbol type={note.type} size="sm" />
            {note.dotted && (
              <span className="text-[10px] font-bold mt-2">.</span>
            )}
            {note.tied && (
              <div className="absolute -top-4 left-1/2 w-[180%] h-5 pointer-events-none z-20 -translate-x-1/4">
                <svg
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                  className="w-full h-full text-black dark:text-white"
                >
                  <path
                    /* Kurva Bezier landai untuk menghubungkan not */
                    d="M 10,18 C 30,5 70,5 90,18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
);
