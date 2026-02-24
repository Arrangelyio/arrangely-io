// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Lock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExportLimit } from "@/hooks/useExportLimit";
import { useSubscription } from "@/contexts/SubscriptionContext";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
// import { MuseJazzText } from "./path-to-your-font-file";

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: {
        id: string;
        title: string;
        artist: string | null;
        current_key: string;
        original_key: string;
        tempo: number | null;
        tags: string[] | null;
        is_public: boolean;
        created_at: string;
        updated_at: string;
        views_count: number;
        is_favorite: boolean;
        rating: number | null;
        folder_id: string | null;
        notes: string | null;
        time_signature: string;
        capo: number | null;
        last_viewed_at: string | null;
        theme?: string;
        sections?: Array<{
            id: string;
            section_type: string;
            lyrics: string | null;
            chords: string | null;
            name: string | null;
            bar_count?: number | null;
            section_time_signature?: string | null; // Added for time signature
        }>;
        arrangements?: Array<{
            id: string;
            position: number;
            repeat_count: number;
            notes: string | null;
            section?: {
                id: string;
                section_type: string;
                name: string | null;
            };
        }>;
    } | null;
}

const ExportModal = ({ isOpen, onClose, song }: ExportModalProps) => {
    const { toast } = useToast();
    const { exportUsage, loading, recordExport } = useExportLimit();
    const { subscriptionStatus } = useSubscription();
    const [creatorName, setCreatorName] = useState("");

    const handleExport = async () => {
        if (!song) return;

        if (!exportUsage?.canExport) {
            toast({
                title: "Export Limit Reached",
                description: `You've reached your monthly export limit of ${exportUsage?.limit} PDFs. Upgrade for unlimited exports.`,
                variant: "destructive",
            });
            return;
        }

        const recordSuccess = await recordExport(song.id, "song");
        if (!recordSuccess) {
            toast({
                title: "Export Failed",
                description: "Failed to record export. Please try again.",
                variant: "destructive",
            });
            return;
        }

        try {
            generateAndDownloadPDF();
            toast({
                title: "PDF Generated",
                description: `"${song.title}" has been exported as a PDF!`,
            });
            onClose();
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            toast({
                title: "PDF Generation Failed",
                description:
                    "An unexpected error occurred while creating the PDF.",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        const fetchCreatorName = async () => {
            if (isOpen && song?.user_id) {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("display_name")
                    .eq("user_id", song.original_creator_id)
                    .single();

                if (data?.display_name) {
                    setCreatorName(data.display_name);
                } else {
                    setCreatorName("Arrangely User");
                }
            }
        };
        fetchCreatorName();
    }, [isOpen, song?.user_id]);

    const generateAndDownloadPDF = () => {
        if (!song) return;

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - 2 * margin;
        const footerHeight = 15;
        const usableHeight = pageHeight - margin - footerHeight;

        let yPosition = margin;
        let currentPage = 1;

        const baseFontSize = 11;
        // --- THIS IS THE CHANGE ---
        // Increase the font size for the chord grid
        const chordFontSize = 18;

        const isChordLine = (line: string): boolean => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return false;
            if (trimmedLine.includes("|") && /[A-G]/.test(trimmedLine)) {
                return true;
            }
            const normalizedLine = trimmedLine.replace(/\bBes\b/g, "Bb");
            const chordRegex =
                /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|b|#|\d)*)(\/[A-G][#b]?)?\b/g;
            const words = normalizedLine.split(/\s+/);
            const validWords = words.filter((word) => word.length > 0);
            if (validWords.length === 0) return false;
            const chordWordCount = (normalizedLine.match(chordRegex) || [])
                .length;
            return chordWordCount / validWords.length > 0.5;
        };

        const addWatermark = (pageNumber: number) => {
            pdf.setPage(pageNumber);
            pdf.setFontSize(20);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(245, 245, 245);
            const watermarkText = "Arrangely";
            const xGap = 50;
            const yGap = 50;
            for (let x = 0; x < pageWidth; x += xGap) {
                for (let y = 0; y < pageHeight; y += yGap) {
                    pdf.text(watermarkText, x, y, { angle: -30 });
                }
            }
            pdf.setTextColor(0, 0, 0);
        };

        addWatermark(1);

        const sortedArrangements =
            song?.arrangements?.sort((a, b) => a.position - b.position) || [];

        const addPageFooter = () => {
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            const leftText = `${
                song?.title || "Untitled"
            } • Page ${currentPage}`;
            const rightText = "Exported via Arrangely.io";
            pdf.text(leftText, margin, pageHeight - 8);
            pdf.text(rightText, pageWidth - margin, pageHeight - 8, {
                align: "right",
            });
            pdf.setTextColor(0, 0, 0);
        };

        const checkNewPage = (requiredHeight: number) => {
            if (yPosition + requiredHeight > usableHeight) {
                addPageFooter();
                pdf.addPage();
                currentPage++;
                addWatermark(currentPage);
                yPosition = margin;
                return true;
            }
            return false;
        };

        const addText = (
            text: string,
            isBold = false,
            fontSize = baseFontSize,
        ) => {
            pdf.setFontSize(fontSize);
            pdf.setFont("helvetica", isBold ? "bold" : "normal");
            pdf.setTextColor(0, 0, 0);
            const lines = pdf.splitTextToSize(text, maxWidth);
            checkNewPage(lines.length * (fontSize * 0.4) + 5);
            lines.forEach((line: string) => {
                pdf.text(line, margin, yPosition);
                yPosition += fontSize * 0.4;
            });
            yPosition += 5;
        };

        const addSectionTitle = (section: any) => {
            const label = (
                section.name ||
                section.section_type ||
                "SEC"
            ).toUpperCase();

            checkNewPage(15);

            pdf.setLineWidth(0.3);
            pdf.setDrawColor(0);
            const textWidth = pdf.getTextWidth(label);
            const boxWidth = textWidth + 4;
            const boxHeight = 7;

            pdf.rect(margin, yPosition - 5, boxWidth, boxHeight);

            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0);
            pdf.text(label, margin + 2, yPosition);

            // LOGIKA SPACING DINAMIS:
            // Cek apakah section ini akan di-render sebagai Grid atau Lirik Biasa
            const isChordGrid =
                (song?.theme === "chord_grid" ||
                    section.lyrics?.trim().startsWith("{") ||
                    section.lyrics?.trim().startsWith("[")) &&
                section.lyrics;

            if (isChordGrid) {
                yPosition += 1; // Tetap mepet untuk Chord Grid agar tidak berubah
            } else {
                yPosition += 8; // Beri ruang 8mm untuk Lirik-Chord agar tidak tertutup kotak label
            }
        };

        const renderPdfChordGrid = (section: any) => {
            const barHeight = 15;
            const defaultChordFontSize = 18;
            const chordGap = 1.0;
            const pLeft = 2;

            pdf.setTextColor(0, 0, 0);

            const setJazzFont = (
                style = "bold",
                size = defaultChordFontSize,
            ) => {
                pdf.setFont("helvetica", style);
                pdf.setFontSize(size);
            };

            const parseChord = (chordStr: string) => {
                const regex =
                    /^([A-G][#b]?)(maj|min|dim|aug|add|m|M|sus|Δ|no)?(\d+)?(?:\/(.+))?$/;
                const match = chordStr.match(regex);
                if (!match)
                    return {
                        root: chordStr,
                        quality: "",
                        extension: "",
                        bass: "",
                    };
                return {
                    root: match[1] || "",
                    quality: match[2] || "",
                    extension: match[3] || "",
                    bass: match[4] || "",
                };
            };

            // --- HELPER 2: PENGUKUR LEBAR (DIPERBARUI AGAR AKURAT) ---
            const measureChordWidth = (chordStr: string, baseSize: number) => {
                const { root, quality, extension, bass } = parseChord(chordStr);
                setJazzFont("bold", baseSize);

                const upperSize = baseSize * 0.85;
                setJazzFont("bold", upperSize);
                let upperWidth = pdf.getTextWidth(root);
                if (quality) upperWidth += pdf.getTextWidth(quality) - 0.2;
                if (extension)
                    upperWidth += pdf.getTextWidth(extension) * 0.5 - 0.8;

                if (bass) {
                    setJazzFont("bold", baseSize * 0.72);
                    const bassWidth = pdf.getTextWidth(bass);
                    // Lebar total = lebar atas + ruang slash (3mm) + lebar bass
                    return upperWidth + 3 + bassWidth + 0.5;
                }

                setJazzFont("bold", baseSize);
                let w = pdf.getTextWidth(root);
                if (quality) w += pdf.getTextWidth(quality) * 0.55;
                if (extension) w += pdf.getTextWidth(extension) * 0.5;
                return w + 0.3;
            };

            // --- HELPER 3: DRAW CHORD (SLASH DINAMIS & NORMAL) ---
            const drawFormattedChord = (
                chordStr: string,
                x: number,
                y: number,
                baseSize: number,
            ) => {
                const { root, quality, extension, bass } = parseChord(chordStr);
                let curX = x;

                if (bass) {
                    const upperSize = baseSize * 0.85;
                    const lowerSize = baseSize * 0.72;

                    // 1. Gambar Chord Utama (Upper)
                    let chordPartX = curX;
                    const chordPartY = y - baseSize * 0.18;

                    setJazzFont("bold", upperSize);
                    pdf.text(root, chordPartX, chordPartY);
                    chordPartX += pdf.getTextWidth(root);

                    if (quality) {
                        setJazzFont("bold", upperSize * 0.6);
                        pdf.text(quality, chordPartX - 0.2, chordPartY);
                        chordPartX += pdf.getTextWidth(quality) - 0.2;
                    }
                    if (extension) {
                        setJazzFont("bold", upperSize * 0.5);
                        pdf.text(
                            extension,
                            chordPartX - 1.1,
                            chordPartY - upperSize * 0.22,
                        );
                        chordPartX += pdf.getTextWidth(extension) - 1.1;
                    }

                    // 2. Gambar Batang Slash (Posisi Dinamis tepat setelah chordPartX)
                    // Kita kasih gap kecil (0.5mm) setelah teks terakhir bagian atas
                    const slashStartX = chordPartX + 0.5;
                    const slashY = y;
                    const slashLen = baseSize * 0.45; // Panjang normal sesuai Gambar 2

                    pdf.setLineWidth(0.4);
                    pdf.line(
                        slashStartX - 0.5,
                        slashY + slashLen * 0.5, // Titik bawah-kiri
                        slashStartX + 1.5,
                        slashY - slashLen * 0.5, // Titik atas-kanan
                    );

                    // 3. Gambar Bass Note (Tepat setelah garis slash)
                    setJazzFont("bold", lowerSize);
                    const bassX = slashStartX + 1.8;
                    const bassY = y + baseSize * 0.28;
                    pdf.text(bass, bassX, bassY);
                } else {
                    // STYLE REGULAR (Gmaj7) - Tetap sama
                    setJazzFont("bold", baseSize);
                    pdf.text(root, curX, y);
                    curX += pdf.getTextWidth(root);
                    if (quality) {
                        setJazzFont("bold", baseSize * 0.6);
                        pdf.text(quality, curX - 0.2, y);
                        curX += pdf.getTextWidth(quality) - 0.2;
                    }
                    if (extension) {
                        setJazzFont("bold", baseSize * 0.55);
                        pdf.text(extension, curX - 1.2, y - baseSize * 0.25);
                    }
                }
            };

            // --- HELPER 4: DRAW BARLINE (Compact & Shorter) ---
            const drawBarlineSymbol = (symbol, x, y, height) => {
                pdf.setDrawColor(0);
                const thickWidth = 1.2;
                const thinWidth = 0.3;
                const spacing = 1.5;
                const dotR = 0.5;
                const startY = y + height - 10.5;
                const endY = startY + 7.5;
                const centerY = startY + 3.75;

                if (symbol === "||:") {
                    // Garis Tebal (Kiri)
                    pdf.setLineWidth(thickWidth);
                    pdf.line(x, startY, x, endY);
                    // Garis Tipis (Kanan)
                    pdf.setLineWidth(thinWidth);
                    pdf.line(x + spacing, startY, x + spacing, endY);
                    // Titik
                    pdf.circle(x + spacing + 1.5, centerY - 1.5, dotR, "F");
                    pdf.circle(x + spacing + 1.5, centerY + 1.5, dotR, "F");
                } else if (symbol === ":||") {
                    // Garis Tebal (Kanan Luar)
                    pdf.setLineWidth(thickWidth);
                    pdf.line(x, startY, x, endY);
                    // Garis Tipis (Kiri Dalam)
                    pdf.setLineWidth(thinWidth);
                    pdf.line(x - spacing, startY, x - spacing, endY);
                    // Titik (Paling Kiri)
                    pdf.circle(x - spacing - 1.5, centerY - 1.5, dotR, "F");
                    pdf.circle(x - spacing - 1.5, centerY + 1.5, dotR, "F");
                } else {
                    pdf.setLineWidth(thinWidth);
                    pdf.line(x, startY, x, endY);
                }
            };
            const drawSymbol = {
                segno: (x: number, y: number) => {
                    pdf.setLineWidth(0.3);
                    pdf.line(x - 1.5, y + 2, x + 1.5, y - 2);
                    pdf.setFont("times", "italic");
                    pdf.setFontSize(11);
                    pdf.text("S", x - 1, y + 1.5);
                    pdf.circle(x - 1.5, y - 1, 0.25, "F");
                    pdf.circle(x + 1.5, y + 1, 0.25, "F");
                },
                coda: (x: number, y: number) => {
                    pdf.setLineWidth(0.3);
                    pdf.circle(x, y, 2, "S");
                    pdf.line(x - 3, y, x + 3, y);
                    pdf.line(x, y - 3, x, y + 3);
                },
            };

            const drawEndingBracket = (
                x: number,
                y: number,
                width: number,
                label: string,
                isStart: boolean,
                isEnd: boolean,
            ) => {
                pdf.setLineWidth(0.3);
                pdf.setDrawColor(80, 80, 80);
                pdf.line(x, y, x + width, y);
                if (isStart) pdf.line(x, y, x, y + 4);
                if (isEnd) pdf.line(x + width, y, x + width, y + 4);
                if (label) {
                    pdf.setFontSize(7);
                    pdf.setFont("helvetica", "bold");
                    pdf.text(label, x + 2, y + 3);
                }
            };

            try {
                const chordData = JSON.parse(section.lyrics || '{"bars": []}');
                const bars = chordData.bars || chordData;
                if (!bars || bars.length === 0) return;

                const barsPerLine = 4;
                const barWidth = maxWidth / barsPerLine;

                for (let i = 0; i < bars.length; i += barsPerLine) {
                    const lineBars = bars.slice(i, i + barsPerLine);
                    const mutableLineBars = JSON.parse(
                        JSON.stringify(lineBars),
                    );

                    const barLineSymbols = new Array(
                        mutableLineBars.length + 1,
                    ).fill("|");
                    mutableLineBars.forEach((bar: any, idx: number) => {
                        const cs = bar.chord || "";
                        if (cs.startsWith("||:") || cs.startsWith("|:"))
                            barLineSymbols[idx] = cs.startsWith("||:")
                                ? "||:"
                                : "|:";
                        if (cs.endsWith(":||") || cs.endsWith("://"))
                            barLineSymbols[idx + 1] = ":||";
                        bar.chord = cs
                            .replace(/(\|\|:|:\|\||\|:|:\/\/)/g, "")
                            .trim();
                    });

                    const hasSigns = mutableLineBars.some(
                        (b: any) =>
                            b.musicalSigns &&
                            Object.keys(b.musicalSigns).length > 0,
                    );
                    const hasEndings = mutableLineBars.some(
                        (b: any) => b.ending,
                    );
                    const topSpace = (hasSigns ? 5 : 0) + (hasEndings ? 5 : 0);

                    checkNewPage(barHeight + topSpace + 2);
                    let currentY = yPosition;

                    if (hasSigns) {
                        mutableLineBars.forEach((bar: any, idx: number) => {
                            const startX = margin + idx * barWidth;
                            if (bar.musicalSigns?.segno)
                                drawSymbol.segno(startX + 4, currentY + 2);
                            if (bar.musicalSigns?.coda)
                                drawSymbol.coda(
                                    startX + barWidth - 4,
                                    currentY + 2,
                                );
                        });
                        currentY += 5;
                    }

                    // --- FIX: LOGIKA ENDING PRESISI (MATCH DENGAN WEB & SHEET MUSIC CONVENTION) ---
                    if (hasEndings) {
                        // 1. Cari index bar terakhir di SELURUH section yang memiliki properti ending
                        // Ini digunakan untuk mendeteksi apakah sebuah ending adalah "Ending Terakhir" di seksi tersebut
                        const lastEndingIdxInSection = bars.reduce(
                            (last, b, idx) => (b.ending ? idx : last),
                            -1,
                        );

                        const getOrdinal = (n: any) => {
                            const num = parseInt(n);
                            if (isNaN(num)) return "";
                            return ["th", "st", "nd", "rd"][
                                num % 10 > 3 ||
                                Math.floor((num % 100) / 10) === 1
                                    ? 0
                                    : num % 10
                            ];
                        };

                        let j = 0;
                        while (j < mutableLineBars.length) {
                            const bar = mutableLineBars[j];
                            const absoluteIdx = i + j; // Index bar relatif terhadap seluruh seksi

                            if (bar.ending) {
                                const startIdx = j;
                                let endIdx = j;
                                const currentType = String(bar.ending.type);

                                // 2. Grouping: Cari bar selanjutnya di baris yang sama yang tipenya sama
                                while (
                                    endIdx + 1 < mutableLineBars.length &&
                                    mutableLineBars[endIdx + 1].ending &&
                                    String(
                                        mutableLineBars[endIdx + 1].ending.type,
                                    ) === currentType
                                ) {
                                    endIdx++;
                                    // Berhenti grouping jika bar tersebut sudah ditandai sebagai isEnd
                                    if (
                                        mutableLineBars[endIdx - 1].ending
                                            ?.isEnd
                                    )
                                        break;
                                }

                                // 3. Smart Extension (Kunci Perbaikan):
                                // Kita hanya panjangkan bracket sampai akhir baris JIKA:
                                // - Ini adalah ending TERAKHIR di seksi tersebut (isFinal)
                                // - DAN tipe ending-nya BUKAN "1" (1st ending harus selalu pendek/tertutup)
                                const isFinalEndingOfSection =
                                    i + endIdx === lastEndingIdxInSection;
                                const isTypeOne = currentType === "1";

                                if (isFinalEndingOfSection && !isTypeOne) {
                                    endIdx = mutableLineBars.length - 1; // Paksa tarik sampai akhir baris PDF
                                }

                                const spanCount = endIdx - startIdx + 1;
                                const startX = margin + startIdx * barWidth;
                                const label = bar.ending.isStart
                                    ? `${currentType}${getOrdinal(
                                          currentType,
                                      )} ending`
                                    : "";

                                // Tentukan apakah perlu garis vertikal penutup di kanan
                                // Muncul jika: Data asli adalah isEnd OR sudah mencapai akhir baris PDF
                                const shouldDrawRightLine =
                                    mutableLineBars[endIdx]?.ending?.isEnd ||
                                    endIdx === mutableLineBars.length - 1;

                                drawEndingBracket(
                                    startX,
                                    currentY,
                                    barWidth * spanCount,
                                    label,
                                    bar.ending.isStart,
                                    shouldDrawRightLine,
                                );

                                j = endIdx + 1;
                            } else {
                                j++;
                            }
                        }
                        currentY += 5;
                    }

                    mutableLineBars.forEach((bar: any, idx: number) => {
                        const currentX = margin + idx * barWidth;
                        drawBarlineSymbol(
                            barLineSymbols[idx],
                            currentX,
                            currentY,
                            barHeight,
                        );

                        const chordBeats = (bar.chord || "")
                            .split(" ")
                            .filter(Boolean);
                        if (chordBeats.length === 0) return;

                        const individualWidths = chordBeats.map((beat) =>
                            measureChordWidth(beat, defaultChordFontSize),
                        );
                        const totalWidth =
                            individualWidths.reduce((a, b) => a + b, 0) +
                            chordGap * (chordBeats.length - 1);
                        const availableWidth = barWidth - (pLeft + 3);
                        let barScale =
                            totalWidth > availableWidth
                                ? availableWidth / totalWidth
                                : 1;

                        let nextChordX =
                            currentX +
                            pLeft +
                            (barLineSymbols[idx].length > 1 ? 2.5 : 0);
                        chordBeats.forEach((beat, bIdx) => {
                            const scaledFontSize =
                                defaultChordFontSize * barScale;
                            const currentW = individualWidths[bIdx] * barScale;

                            // --- LOGIKA BARU: WHOLE REST SYMBOL (Hanging Block - Gambar 11 & 13) ---
                            if (beat === "WR") {
                                const shelfW = 6 * barScale; // Lebar garis horizontal atas
                                const blockW = 4 * barScale; // Lebar balok hitam
                                const blockH = 1.5 * barScale; // Tinggi balok
                                const centerX = nextChordX + currentW / 2;

                                pdf.setDrawColor(0);
                                pdf.setLineWidth(0.3 * barScale);
                                // Gambar "Garis Rak" (Shelf)
                                pdf.line(
                                    centerX - shelfW / 2,
                                    currentY + barHeight / 2,
                                    centerX + shelfW / 2,
                                    currentY + barHeight / 2,
                                );

                                pdf.setFillColor(0, 0, 0);
                                // Gambar Balok hitam menggantung di bawah garis rak
                                pdf.rect(
                                    centerX - blockW / 2,
                                    currentY + barHeight / 2,
                                    blockW,
                                    blockH,
                                    "F",
                                );
                            } else if (beat === "%") {
                                pdf.setFontSize(14 * barScale);
                                pdf.text(
                                    "%",
                                    currentX + barWidth / 2,
                                    currentY + barHeight / 2 + 2,
                                    { align: "center" },
                                );
                            } else {
                                drawFormattedChord(
                                    beat,
                                    nextChordX,
                                    currentY + barHeight - 5.5,
                                    scaledFontSize,
                                );
                            }
                            nextChordX += currentW + chordGap * barScale;
                        });
                    });

                    drawBarlineSymbol(
                        barLineSymbols[mutableLineBars.length],
                        margin + mutableLineBars.length * barWidth,
                        currentY,
                        barHeight,
                    );
                    yPosition = currentY + barHeight + 2;
                }
            } catch (e) {
                console.error("PDF Render Error:", e);
            }
        };
        const renderRegularSection = (section: any) => {
            const chordColor = [0, 102, 204];
            const lyricColor = [50, 50, 50];
            const content = section.chords || section.lyrics || "";
            const lines = content.split("\n");

            lines.forEach((line) => {
                checkNewPage(5);
                const isLineOfChords = isChordLine(line);
                pdf.setFontSize(baseFontSize);
                pdf.setFont("courier", isLineOfChords ? "bold" : "normal");
                const color = isLineOfChords ? chordColor : lyricColor;
                pdf.setTextColor(color[0], color[1], color[2]);
                pdf.text(line, margin, yPosition);
                yPosition += 5;
            });
        };

        // --- HEADER STYLE BARU (Compact) ---
        const drawHeader = () => {
            const title = (song.title || "UNTITLED").toUpperCase();
            const artist = song.artist ? song.artist.toUpperCase() : "";
            const creatorText = `ARRANGED BY ${creatorName.toUpperCase()}`;

            // 1. Judul Lagu (Bold & Besar - 18pt)
            pdf.setFontSize(18);
            pdf.setFont("helvetica", "bold");
            const wrappedTitle = pdf.splitTextToSize(title, maxWidth);
            wrappedTitle.forEach((line) => {
                pdf.text(line, margin, yPosition);
                yPosition += 8;
            });

            // 2. Info Artist (Kiri) & Creator (Kanan)
            yPosition += 1; // Spasi tipis setelah judul
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80); // Warna abu-abu gelap

            if (artist) pdf.text(artist, margin, yPosition);
            pdf.text(creatorText, pageWidth - margin, yPosition, {
                align: "right",
            });

            // 3. Garis Pembatas
            yPosition += 3;
            pdf.setLineWidth(0.5);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);

            // 4. Metadata (Key, Tempo, Signature)
            yPosition += 6;
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0); // Kembali ke hitam
            const meta = `Key: ${song.current_key}  |  Tempo: ${
                song.tempo || "-"
            } BPM  |  Time: ${song.time_signature}`;
            pdf.text(meta, margin, yPosition);
            yPosition += 10;
        };

        drawHeader();

        // if (sortedArrangements.length > 0) {
        //     addText("Song Structure:", true, baseFontSize + 1);
        //     sortedArrangements.forEach((arr) => {
        //         const section = song.sections?.find(
        //             (s) => s.id === arr.section?.id
        //         );
        //         const sectionName =
        //             section?.name || arr.section?.section_type || "Unknown";
        //         let structureLine = `${arr.position}. ${
        //             sectionName.charAt(0).toUpperCase() +
        //             sectionName.slice(1).toLowerCase()
        //         }`;
        //         if (arr.repeat_count > 1) {
        //             structureLine += ` (x${arr.repeat_count})`;
        //         }
        //         addText(structureLine);
        //     });
        //     yPosition += 5;
        // }

        const sectionsToRender =
            sortedArrangements.length > 0
                ? sortedArrangements
                      .map((arr) => {
                          const section = song.sections?.find(
                              (s) => s.id === arr.section?.id,
                          );
                          return section ? { ...section, ...arr } : null;
                      })
                      .filter(Boolean)
                : song.sections;

        if (sectionsToRender && sectionsToRender.length > 0) {
            sectionsToRender.forEach((section, index) => {
                if (!section) return;

                const position = section.position || index + 1;

                addSectionTitle({ ...section, position });

                if (
                    (song?.theme === "chord_grid" ||
                        section.lyrics?.trim().startsWith("{") ||
                        section.lyrics?.trim().startsWith("[")) &&
                    section.lyrics
                ) {
                    renderPdfChordGrid(section);
                } else {
                    renderRegularSection(section);
                }
                yPosition += 5;
            });
        }

        // if (song?.notes) {
        //     yPosition += 10;
        //     addText("Notes:", true, baseFontSize + 1);
        //     addText(song.notes);
        // }

        addPageFooter();

        pdf.save(`${song?.title || "arrangement"}.pdf`);
    };

    if (!song) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Export as PDF
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Export "{song?.title}" as a PDF file for printing or
                        sharing.
                    </div>
                    {!loading && exportUsage && (
                        <div className="p-3 bg-muted rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Monthly Usage:
                                </span>
                                <span className="font-medium">
                                    {exportUsage.isUnlimited
                                        ? "Unlimited"
                                        : `${exportUsage.currentMonthCount}/${exportUsage.limit}`}
                                </span>
                            </div>
                            {!subscriptionStatus?.hasActiveSubscription &&
                                !exportUsage.canExport && (
                                    <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                                        <Lock className="h-4 w-4" />
                                        <span>
                                            Export limit reached. Upgrade for
                                            unlimited exports.
                                        </span>
                                    </div>
                                )}
                            {!subscriptionStatus?.hasActiveSubscription &&
                                exportUsage.canExport && (
                                    <div className="flex items-center gap-2 p-2 bg-orange-100 text-orange-700 rounded text-sm">
                                        <Zap className="h-4 w-4" />
                                        <span>
                                            {exportUsage.limit -
                                                exportUsage.currentMonthCount}{" "}
                                            exports remaining this month
                                        </span>
                                    </div>
                                )}
                        </div>
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExport}
                            className="flex items-center gap-2"
                            disabled={loading || !exportUsage?.canExport}
                        >
                            <Download className="h-4 w-4" />
                            {loading ? "Loading..." : "Export PDF"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExportModal;
