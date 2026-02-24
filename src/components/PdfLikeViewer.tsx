import { useRef, useLayoutEffect, useState, ReactNode } from "react";

interface PdfLikeViewerProps {
    children: ReactNode;
}

const FIXED_WIDTH = 800; // The fixed width of your content, like an A4 page. Adjust as needed.

const PdfLikeViewer = ({ children }: PdfLikeViewerProps) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | string>("auto");

    useLayoutEffect(() => {
        const handleResize = () => {
        if (outerRef.current && innerRef.current) {
        const containerWidth = outerRef.current.offsetWidth;
        if (containerWidth === 0) return;

        // Kalkulasi skala sekarang hanya untuk fit-to-width
        const scale = containerWidth / FIXED_WIDTH;

        // Terapkan skala yang sudah dihitung
        innerRef.current.style.transform = `scale(${scale})`;

        // Sesuaikan tinggi container luar agar pas dengan konten yang di-skala
        const contentHeight = innerRef.current.scrollHeight;
        setHeight(contentHeight * scale);
        }
    };

        // Buat ResizeObserver untuk memantau perubahan ukuran container luar
        // Ini lebih handal daripada window resize
        const observer = new ResizeObserver(() => {
            handleResize();
        });

        if (outerRef.current) {
            observer.observe(outerRef.current);
        }

        // Jalankan sekali saat mount
        handleResize();

        // Cleanup observer on component unmount
        return () => {
            if (outerRef.current) {
                observer.unobserve(outerRef.current);
            }
        };
    }, [children]); // <-- HAPUS `children` DARI DEPENDENCY ARRAY INI

    return (
        <div ref={outerRef} style={{ height, overflow: "hidden" }}>
            <div
                ref={innerRef}
                style={{
                    width: `${FIXED_WIDTH}px`,
                    transformOrigin: "top left",
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PdfLikeViewer;
