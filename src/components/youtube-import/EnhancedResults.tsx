import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle,
    Music,
    Clock,
    Key,
    Zap,
    Brain,
    TrendingUp,
    Volume2,
    Activity,
    Sparkles,
    Edit,
    Upload,
    Play,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AudioInsights {
    energy: number;
    danceability: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
}

interface EnhancedResultsProps {
    songData: {
        title: string;
        artist: string;
        key: string;
        tempo: number;
        duration: string;
        confidence: number;
        structure: any[];
        notes: string[];
    };
    audioInsights?: AudioInsights;
    onEditArrangement: () => void;
    onSaveToLibrary: () => void;
    onPreview: () => void;
}

const EnhancedResults = ({
    songData,
    audioInsights,
    onEditArrangement,
    onSaveToLibrary,
    onPreview,
}: EnhancedResultsProps) => {
    const { t } = useLanguage();
    const getEnergyLevel = (energy: number) => {
        if (energy > 0.7)
            return {
                label: "High Energy",
                color: "text-red-600",
                bg: "bg-red-100",
            };
        if (energy > 0.4)
            return {
                label: "Medium Energy",
                color: "text-yellow-600",
                bg: "bg-yellow-100",
            };
        return {
            label: "Low Energy",
            color: "text-blue-600",
            bg: "bg-blue-100",
        };
    };

    const getMoodLevel = (valence: number) => {
        if (valence > 0.7)
            return {
                label: "Very Positive",
                color: "text-green-600",
                bg: "bg-green-100",
            };
        if (valence > 0.5)
            return {
                label: "Positive",
                color: "text-emerald-600",
                bg: "bg-emerald-100",
            };
        if (valence > 0.3)
            return {
                label: "Neutral",
                color: "text-gray-600",
                bg: "bg-gray-100",
            };
        return {
            label: "Melancholic",
            color: "text-purple-600",
            bg: "bg-purple-100",
        };
    };

    const energyData = audioInsights
        ? getEnergyLevel(audioInsights.energy)
        : null;
    const moodData = audioInsights ? getMoodLevel(audioInsights.valence) : null;

    return (
        <div className="space-y-6">
            {/* Enhanced Analysis Header */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Enhanced AI Analysis Complete
                        <Badge
                            variant="secondary"
                            className="bg-gradient-worship text-white"
                        >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Professional Grade
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Song Information */}
                        {t("arrEditor.subtitle")}
                        <div>
                            <h3 className="text-xl font-bold mb-1">
                                {songData.title}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                by {songData.artist}
                            </p>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-blue-500" />
                                    <span>
                                        <strong>Key:</strong> {songData.key}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-green-500" />
                                    <span>
                                        <strong>Tempo:</strong> {songData.tempo}{" "}
                                        BPM
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Music className="h-4 w-4 text-purple-500" />
                                    <span>
                                        <strong>Duration:</strong>{" "}
                                        {songData.duration}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Brain className="h-4 w-4 text-orange-500" />
                                    <span>
                                        <strong>Sections:</strong>{" "}
                                        {songData.structure?.length || 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Confidence & Audio Insights */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-800 text-sm"
                                >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {songData.confidence}% AI Confidence
                                </Badge>
                                <Badge variant="outline" className="text-sm">
                                    {songData.structure?.length || 0} Sections
                                    Detected
                                </Badge>
                            </div>

                            {/* Enhanced Audio Insights */}
                            {audioInsights && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm">
                                        Audio Intelligence:
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {energyData && (
                                            <div
                                                className={`p-2 rounded-lg ${energyData.bg} border`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <Zap
                                                        className={`h-3 w-3 ${energyData.color}`}
                                                    />
                                                    <span
                                                        className={`text-xs font-medium ${energyData.color}`}
                                                    >
                                                        {energyData.label}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {Math.round(
                                                        audioInsights.energy *
                                                            100
                                                    )}
                                                    % Energy
                                                </div>
                                            </div>
                                        )}

                                        {moodData && (
                                            <div
                                                className={`p-2 rounded-lg ${moodData.bg} border`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp
                                                        className={`h-3 w-3 ${moodData.color}`}
                                                    />
                                                    <span
                                                        className={`text-xs font-medium ${moodData.color}`}
                                                    >
                                                        {moodData.label}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {Math.round(
                                                        audioInsights.valence *
                                                            100
                                                    )}
                                                    % Positive
                                                </div>
                                            </div>
                                        )}

                                        {audioInsights.danceability > 0.6 && (
                                            <div className="p-2 rounded-lg bg-pink-100 border border-pink-200">
                                                <div className="flex items-center gap-1">
                                                    <Activity className="h-3 w-3 text-pink-600" />
                                                    <span className="text-xs font-medium text-pink-600">
                                                        High Danceability
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {Math.round(
                                                        audioInsights.danceability *
                                                            100
                                                    )}
                                                    % Danceable
                                                </div>
                                            </div>
                                        )}

                                        {audioInsights.acousticness > 0.5 && (
                                            <div className="p-2 rounded-lg bg-amber-100 border border-amber-200">
                                                <div className="flex items-center gap-1">
                                                    <Volume2 className="h-3 w-3 text-amber-600" />
                                                    <span className="text-xs font-medium text-amber-600">
                                                        Acoustic Style
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {Math.round(
                                                        audioInsights.acousticness *
                                                            100
                                                    )}
                                                    % Acoustic
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={onEditArrangement}
                            className="bg-gradient-worship hover:opacity-90"
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Arrangement
                        </Button>
                        <Button variant="outline" onClick={onSaveToLibrary}>
                            <Upload className="h-4 w-4 mr-2" />
                            Save to Library
                        </Button>
                        <Button variant="outline" onClick={onPreview}>
                            <Play className="h-4 w-4 mr-2" />
                            Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Enhanced Analysis Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-500" />
                        AI Analysis Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-2">
                                Musical Analysis
                            </h4>
                            <ul className="space-y-1 text-sm text-blue-800">
                                <li>• Key detection with harmonic analysis</li>
                                <li>• Tempo consistency verification</li>
                                <li>• Chord progression intelligence</li>
                                <li>• Song structure identification</li>
                            </ul>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-900 mb-2">
                                Enhanced Features
                            </h4>
                            <ul className="space-y-1 text-sm text-green-800">
                                <li>• Spotify Audio Features integration</li>
                                <li>• LyricsGenius API enhanced lyrics</li>
                                <li>• Multi-source data validation</li>
                                <li>• Professional-grade confidence scoring</li>
                            </ul>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-medium text-purple-900 mb-2">
                                Smart Insights
                            </h4>
                            <ul className="space-y-1 text-sm text-purple-800">
                                <li>• Energy and mood analysis</li>
                                <li>• Instrumentation detection</li>
                                <li>• Arrangement recommendations</li>
                                <li>• Performance suggestions</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default EnhancedResults;
