// import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
interface StepProgressProps {
    currentStep: number;
    totalSteps: number;
    getStepTitle: () => string;
}

const StepProgress = ({
    currentStep,
    totalSteps,
    getStepTitle,
}: StepProgressProps) => {
    const { t } = useLanguage();

    return (
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 mb-2 sm:mb-6 pb-2 sm:pb-4 border-b sm:border-none">
            {/* Title - Mobile Optimized */}
            <h1 className="text-base sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-3 text-center sm:text-left px-2 sm:px-1">
                {/* Arrangement Editor */}
                {t("arrEditor.title")}
            </h1>

            {/* Progress Steps - Mobile Optimized */}
            <div className="flex flex-col gap-1 sm:gap-3">
                {/* Step Indicators */}
                <div className="flex items-center justify-center sm:justify-start gap-1 overflow-x-auto px-2 sm:px-0">
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                        (step) => (
                            <div
                                key={step}
                                className="flex items-center flex-shrink-0"
                            >
                                <div
                                    className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-200 ${
                                        step === currentStep
                                            ? "bg-primary text-primary-foreground shadow-md scale-105"
                                            : step < currentStep
                                            ? "bg-primary/20 text-primary"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {step}
                                </div>
                                {step < totalSteps && (
                                    <div
                                        className={`w-3 sm:w-6 h-px mx-1 transition-colors duration-200 ${
                                            step < currentStep
                                                ? "bg-primary/40"
                                                : "bg-border"
                                        }`}
                                    />
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* Step Description - Mobile Optimized */}
                <div className="text-center sm:text-left px-2 sm:px-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                        <span className="font-medium">
                            {/* Step */}
                            {t("arrEditor.step")}
                            {currentStep}
                            {/* of */}
                            {t("arrEditor.of")}
                            {totalSteps}
                        </span>
                    </div>
                    <div className="text-xs sm:text-base md:text-lg font-semibold text-primary mt-0.5 sm:mt-1">
                        {getStepTitle()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepProgress;
