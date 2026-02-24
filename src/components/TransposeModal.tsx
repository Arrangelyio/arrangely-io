import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
// IMPORT SKALA BARU DAN HELPER DARI lib/transpose
import {
    SHARP_SCALE,
    FLAT_SCALE,
    getSemitoneInterval,
    CHORD_MAP,
} from "@/lib/transpose";

interface TransposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentKey: string;
    onTranspose: (newKey: string, preferSharps: boolean) => void;
}

const TransposeModal = ({
    isOpen,
    onClose,
    currentKey,
    onTranspose,
}: TransposeModalProps) => {
    const [selectedKey, setSelectedKey] = useState(currentKey);
    const isFlatKey = ["Db", "Eb", "Gb", "Ab", "Bb"].includes(currentKey);
    const [preferSharps, setPreferSharps] = useState(!isFlatKey);

    // LOGIKA BARU: Tentukan skala mana yang akan ditampilkan di dropdown
    const keys = preferSharps ? SHARP_SCALE : FLAT_SCALE;

    // EFEK BARU: Secara otomatis mengubah kunci yang dipilih saat preferensi berubah
    useEffect(() => {
        const currentIndex = CHORD_MAP[currentKey];
        if (currentIndex !== undefined) {
            const initialKeyName = !isFlatKey
                ? SHARP_SCALE[currentIndex]
                : FLAT_SCALE[currentIndex];
            setSelectedKey(initialKeyName);
        }
    }, []); // Efek ini berjalan setiap kali `preferSharps` berubah

    const getTransposeInfo = (fromKey: string, toKey: string) => {
        const semitones = getSemitoneInterval(fromKey, toKey);
        const capoText =
            semitones === 0 ? "No capo needed" : `Capo fret ${semitones}`;
        const intervalName =
            semitones === 0
                ? "Same key"
                : semitones === 1
                ? "1 semitone up"
                : semitones === 11
                ? "1 semitone down"
                : semitones <= 6
                ? `${semitones} semitones up`
                : `${12 - semitones} semitones down`;

        return { capoText, intervalName, semitones };
    };

    const handleTranspose = () => {
        
        onTranspose(selectedKey, preferSharps);
        onClose();
    };

    const transposeInfo = getTransposeInfo(currentKey, selectedKey);

    // Helper untuk mendapatkan nama kunci saat ini yang sesuai dengan preferensi
    const displayCurrentKey = () => {
        const currentIndex = CHORD_MAP[currentKey];
        if (currentIndex === undefined) return currentKey;
        return preferSharps
            ? SHARP_SCALE[currentIndex]
            : FLAT_SCALE[currentIndex];
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-primary">
                        🎵 Transpose Song
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                Current Key:
                            </span>
                            <Badge variant="outline" className="font-bold">
                                {displayCurrentKey()}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                New Key:
                            </span>
                            <Badge variant="default" className="font-bold">
                                {selectedKey}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Transpose to:
                        </label>
                        <Select
                            value={selectedKey}
                            onValueChange={setSelectedKey}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {keys.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {key}{" "}
                                        {CHORD_MAP[key] ===
                                            CHORD_MAP[currentKey] &&
                                            "(Current)"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quick transpose buttons */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Quick transpose:
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const currentIndex =
                                        keys.indexOf(selectedKey);
                                    const newIndex =
                                        (currentIndex - 1 + 12) % 12;
                                    setSelectedKey(keys[newIndex]);
                                }}
                            >
                                -1 ♭
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const currentIndex =
                                        keys.indexOf(selectedKey);
                                    const newIndex = (currentIndex + 1) % 12;
                                    setSelectedKey(keys[newIndex]);
                                }}
                            >
                                +1 ♯
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const currentIndex = CHORD_MAP[currentKey];
                                    if (currentIndex !== undefined) {
                                        setSelectedKey(keys[currentIndex]);
                                    }
                                }}
                            >
                                Reset
                            </Button>
                        </div>
                    </div>

                    {/* Notation preference */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Notation preference:
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant={preferSharps ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPreferSharps(true)}
                            >
                                ♯ Sharps (C#, F#, G#)
                            </Button>
                            <Button
                                variant={!preferSharps ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPreferSharps(false)}
                            >
                                ♭ Flats (Db, Gb, Ab)
                            </Button>
                        </div>
                    </div>

                    {CHORD_MAP[selectedKey] !== CHORD_MAP[currentKey] && (
                        <Card>
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                        Interval:
                                    </span>
                                    <Badge variant="secondary">
                                        {transposeInfo.intervalName}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                        Guitar capo:
                                    </span>
                                    <Badge variant="secondary">
                                        {transposeInfo.capoText}
                                    </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    💡 All chords in your arrangement will be
                                    automatically transposed
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTranspose}
                            className="bg-gradient-worship hover:opacity-90"
                            disabled={
                                CHORD_MAP[selectedKey] === CHORD_MAP[currentKey]
                            }
                        >
                            Apply Transposes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TransposeModal;
