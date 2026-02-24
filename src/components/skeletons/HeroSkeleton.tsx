const HeroSkeleton = () => {
    return (
        <div className="max-w-4xl mx-auto animate-pulse">
            {/* Skeleton untuk Judul dan Subjudul */}
            <div className="space-y-4 max-w-2xl mx-auto mb-8">
                <div className="h-10 bg-muted rounded-md w-3/4 mx-auto"></div>
                <div className="h-12 bg-muted rounded-md w-1/2 mx-auto"></div>
            </div>

            {/* Skeleton untuk Deskripsi */}
            <div className="space-y-3 max-w-3xl mx-auto mb-10">
                <div className="h-4 bg-muted rounded-md w-full"></div>
                <div className="h-4 bg-muted rounded-md w-5/6 mx-auto"></div>
            </div>

            {/* Skeleton untuk Tombol Utama */}
            <div className="flex justify-center mb-12">
                <div className="h-14 w-48 bg-muted rounded-lg"></div>
            </div>

            {/* Skeleton untuk Highlight Community Library */}
            <div className="bg-muted/50 rounded-2xl p-6 mb-12 border border-border/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="w-full md:w-2/3 space-y-3 text-left">
                        <div className="h-6 w-1/2 bg-muted rounded-md"></div>
                        <div className="h-4 w-full bg-muted rounded-md"></div>
                    </div>
                    <div className="h-12 w-full md:w-1/3 bg-muted rounded-lg"></div>
                </div>
            </div>

            {/* Skeleton untuk Fitur di Bagian Bawah */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-8">
                <div className="h-4 w-40 bg-muted rounded-md"></div>
                <div className="h-4 w-40 bg-muted rounded-md"></div>
            </div>
        </div>
    );
};

export default HeroSkeleton;
