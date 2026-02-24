import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit, 
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { getReadableRejectionReason, type PublicationStatus } from "./PublicationStatusBadge";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface ValidationFeedbackItem {
  text: string;
  isSubItem?: boolean;
  isHint?: boolean;
}

interface CategorizedValidation {
  passed: ValidationFeedbackItem[];
  failed: ValidationFeedbackItem[];
}
interface PublicationStatusCardProps {
  songId: string;
  status: PublicationStatus;
  rejectedReason?: string | null;
  validationResults?: Record<string, unknown> | null;
  isOwner: boolean;
  theme?: string | null;
}

const getNextStepsForRejection = (reason: string | null | undefined): { id: string[]; en: string[] } => {
  if (!reason) {
    return {
      id: ['Hubungi tim support untuk informasi lebih lanjut.'],
      en: ['Contact support team for more information.'],
    };
  }

  const stepsMapping: Record<string, { id: string[]; en: string[] }> = {
    'invalid_youtube': {
      id: [
        'Pastikan video YouTube berstatus publik (bukan private atau unlisted)',
        'Periksa apakah video masih tersedia dan tidak dihapus',
        'Pastikan video ada dalam kategori "Music" di YouTube',
        'Klik "Edit Arrangement" untuk memperbarui link YouTube',
      ],
      en: [
        'Make sure YouTube video is public (not private or unlisted)',
        'Check if the video is still available and not deleted',
        'Ensure the video is in the "Music" category on YouTube',
        'Click "Edit Arrangement" to update the YouTube link',
      ],
    },
    'wrong_youtube_category': {
      id: [
        'Video YouTube harus dalam kategori "Music"',
        'Anda dapat mengubah kategori video di YouTube Studio',
        'Atau gunakan video musik lain yang sudah dalam kategori yang benar',
        'Setelah diperbaiki, klik "Edit Arrangement" dan simpan ulang',
      ],
      en: [
        'YouTube video must be in the "Music" category',
        'You can change the video category in YouTube Studio',
        'Or use another music video that is already in the correct category',
        'After fixing, click "Edit Arrangement" and save again',
      ],
    },
    'incomplete_sections': {
      id: [
        'Pastikan semua section memiliki nama yang jelas',
        'Contoh section: Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro',
        'Klik "Edit Arrangement" untuk memperbaiki section',
      ],
      en: [
        'Make sure all sections have clear names',
        'Example sections: Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro',
        'Click "Edit Arrangement" to fix sections',
      ],
    },
    'duplicate_sections': {
      id: [
        'Beberapa section memiliki lirik dan chord yang sama persis',
        'Edit section yang duplikat dan buat konten yang berbeda',
        'Jika section memang harus sama, biarkan satu saja dan gunakan repeat',
        'Klik "Edit Arrangement" untuk memperbaiki',
      ],
      en: [
        'Some sections have identical lyrics and chords',
        'Edit duplicate sections to create different content',
        'If sections should be the same, keep only one and use repeat',
        'Click "Edit Arrangement" to fix',
      ],
    },
    'insufficient_arrangement': {
      id: [
        'Arrangement harus memiliki minimal 4 section',
        'Tambahkan lebih banyak section ke arrangement di Step 3',
        'Contoh: Intro → Verse 1 → Chorus → Verse 2 → Chorus → Outro',
        'Klik "Edit Arrangement" untuk menambah section',
      ],
      en: [
        'Arrangement must have at least 4 sections',
        'Add more sections to your arrangement in Step 3',
        'Example: Intro → Verse 1 → Chorus → Verse 2 → Chorus → Outro',
        'Click "Edit Arrangement" to add sections',
      ],
    },
    'invalid_chords': {
      id: [
        'Pastikan minimal 50% section memiliki chord',
        'Tambahkan chord ke section yang masih kosong',
        'Periksa apakah chord yang dimasukkan valid',
        'Klik "Edit Arrangement" untuk menambah chord',
      ],
      en: [
        'Make sure at least 50% of sections have chords',
        'Add chords to sections that are still empty',
        'Check if the entered chords are valid',
        'Click "Edit Arrangement" to add chords',
      ],
    },
    'content_violation': {
      id: [
        'Periksa judul dan lirik untuk konten yang tidak pantas',
        'Hapus kata-kata kasar, SARA, atau konten dewasa',
        'Pastikan konten sesuai dengan pedoman komunitas',
        'Setelah diperbaiki, submit ulang untuk review',
      ],
      en: [
        'Check title and lyrics for inappropriate content',
        'Remove profanity, hate speech, or adult content',
        'Ensure content complies with community guidelines',
        'After fixing, resubmit for review',
      ],
    },
    'duplicate_content': {
      id: [
        'Aransemen Anda mungkin terlalu mirip dengan yang sudah ada',
        'Tambahkan variasi atau interpretasi unik Anda',
        'Pastikan ini adalah karya original Anda',
        'Hubungi support jika Anda yakin ini bukan duplikat',
      ],
      en: [
        'Your arrangement may be too similar to an existing one',
        'Add your unique variations or interpretations',
        'Make sure this is your original work',
        'Contact support if you believe this is not a duplicate',
      ],
    },
    'low_quality': {
      id: [
        'Periksa kelengkapan chord di setiap section',
        'Pastikan struktur section sudah benar dan jelas',
        'Periksa keakuratan informasi lagu (judul, artis)',
        'Tambahkan detail yang lebih lengkap jika diperlukan',
      ],
      en: [
        'Check chord completeness in each section',
        'Ensure section structure is correct and clear',
        'Verify song information accuracy (title, artist)',
        'Add more complete details if needed',
      ],
    },
    'copyright_issue': {
      id: [
        'Pastikan Anda memiliki hak untuk membuat aransemen ini',
        'Gunakan lagu yang tidak memiliki batasan hak cipta ketat',
        'Hubungi tim support untuk klarifikasi lebih lanjut',
        'Pertimbangkan untuk menggunakan lagu domain publik atau worship',
      ],
      en: [
        'Make sure you have the rights to create this arrangement',
        'Use songs without strict copyright restrictions',
        'Contact support team for further clarification',
        'Consider using public domain or worship songs',
      ],
    },
    'insufficient_lyric_sections': {
      id: [
        'Saat ini section lirik yang valid masih kurang (Verse/Chorus/Bridge/Pre-Chorus)',
        'Buka "Edit Aransemen" → lengkapi lirik (≥30 karakter, ≥3 kata) pada minimal 3 section lirik',
        'Jika belum ada, tambahkan section Verse/Chorus/Bridge baru di Step 2/3',
        'Setelah itu, submit ulang untuk validasi (cek bagian “Masalah yang Ditemukan” untuk preview yang terdeteksi)',
      ],
      en: [
        'You still have fewer than 3 valid lyric sections (Verse/Chorus/Bridge/Pre-Chorus)',
        'Open "Edit Arrangement" → add lyrics (≥30 chars, ≥3 words) for at least 3 lyric sections',
        'If missing, add new Verse/Chorus/Bridge sections in Step 2/3',
        'Then resubmit and review the detected previews in “Issues Found”',
      ],
    },
  };

  // Check for exact match first
  if (stepsMapping[reason]) {
    return stepsMapping[reason];
  }

  // Check if reason starts with a known key (format: "key: details")
  for (const [key, value] of Object.entries(stepsMapping)) {
    if (reason.startsWith(key + ':') || reason.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Default steps
  return {
    id: [
      'Periksa kembali aransemen Anda',
      'Pastikan semua informasi sudah lengkap dan benar',
      'Klik "Edit Arrangement" untuk memperbaiki',
      'Hubungi support jika butuh bantuan',
    ],
    en: [
      'Review your arrangement again',
      'Make sure all information is complete and correct',
      'Click "Edit Arrangement" to fix issues',
      'Contact support if you need help',
    ],
  };
};

// Extract validation issues from automated validation results - now categorized
const getCategorizedValidation = (validationResults: Record<string, unknown> | null | undefined, language: 'id' | 'en'): CategorizedValidation => {
  const passed: ValidationFeedbackItem[] = [];
  const failed: ValidationFeedbackItem[] = [];
  
  if (!validationResults) return { passed, failed };
  
  // YouTube validation
  const youtube = validationResults.youtube as Record<string, unknown> | undefined;
  if (youtube) {
    if (youtube.passed) {
      passed.push({ 
        text: language === 'id' 
          ? 'YouTube: Video valid dan dalam kategori Music'
          : 'YouTube: Video is valid and in Music category'
      });
    } else {
      const error = youtube.error as string || '';
      if (error.includes('category')) {
        failed.push({ 
          text: language === 'id' 
            ? `YouTube: Video harus dalam kategori "Music". ${youtube.categoryId ? `Kategori saat ini: ${youtube.categoryId}` : ''}`
            : `YouTube: Video must be in "Music" category. ${youtube.categoryId ? `Current category: ${youtube.categoryId}` : ''}`
        });
      } else if (error.includes('not accessible')) {
        failed.push({ 
          text: language === 'id' 
            ? 'YouTube: Video tidak dapat diakses (mungkin private atau dihapus)'
            : 'YouTube: Video not accessible (may be private or deleted)'
        });
      } else if (error.includes('Invalid YouTube URL')) {
        failed.push({ 
          text: language === 'id' 
            ? 'YouTube: Format URL tidak valid'
            : 'YouTube: Invalid URL format'
        });
      } else {
        failed.push({ 
          text: language === 'id' 
            ? `YouTube: ${error || 'Link tidak valid'}`
            : `YouTube: ${error || 'Invalid link'}`
        });
      }
    }
  }
  
  // Sections validation
  const sections = validationResults.sections as Record<string, unknown> | undefined;
  if (sections) {
    if (sections.passed) {
      const sectionCount = sections.sectionCount as number || 0;
      passed.push({ 
        text: language === 'id' 
          ? `Sections: Semua ${sectionCount} section memiliki nama yang valid`
          : `Sections: All ${sectionCount} sections have valid names`
      });
    } else {
      const sectionCount = sections.sectionCount as number || 0;
      const invalidCount = sections.invalidCount as number || 0;
      const reason = sections.reason as string || '';
      const duplicateGroups = sections.duplicateGroups as string[] || [];
      
      if (reason === 'duplicate_sections') {
        failed.push({ 
          text: language === 'id' 
            ? `Sections: Terlalu banyak section duplikat (konten sama)`
            : `Sections: Too many duplicate sections (same content)`
        });
        failed.push({ 
          text: `Grup duplikat: ${duplicateGroups.join('; ')}`, 
          isSubItem: true 
        });
      } else if (sectionCount === 0) {
        failed.push({ 
          text: language === 'id' 
            ? 'Sections: Belum ada section yang dibuat'
            : 'Sections: No sections created yet'
        });
      } else if (invalidCount > 0) {
        failed.push({ 
          text: language === 'id' 
            ? `Sections: ${invalidCount} section tidak memiliki nama yang valid`
            : `Sections: ${invalidCount} sections don't have valid names`
        });
      }
    }
  }
  
  // Quality validation
  const quality = validationResults.quality as Record<string, unknown> | undefined;
  if (quality) {
    const details = quality.details as Record<string, unknown> | undefined;
    const problematicSections = details?.problematicSections as Array<{ name: string; preview: string; issue?: string; charCount?: number }> || [];
    const detectedLyricSections = details?.detectedLyricSections as Array<{ name: string; preview: string; charCount?: number }> || [];
    const hint = details?.hint as string || '';
    const validCount = details?.validCount as number || 0;
    const required = details?.required as number || 3;
    const totalLyricSections = details?.totalLyricSections as number || 0;
    
    // Add valid sections to passed
    if (detectedLyricSections.length > 0) {
      detectedLyricSections.forEach((section) => {
        passed.push({ 
          text: `${section.name} (${section.charCount || 0} ${language === 'id' ? 'karakter' : 'chars'}): "${section.preview}"`
        });
      });
    }
    
    if (!quality.passed) {
      // Main issue
      failed.push({ 
        text: language === 'id' 
          ? `Kualitas Lirik: Hanya ${validCount} dari ${required} section lirik yang valid (terdeteksi ${totalLyricSections} section lirik)`
          : `Lyric Quality: Only ${validCount} of ${required} lyric sections are valid (detected ${totalLyricSections} lyric sections)`
      });
      
      // Show problematic sections with specific issues
      if (problematicSections.length > 0) {
        problematicSections.slice(0, 5).forEach((section) => {
          const issueKey = section.issue as string | undefined;
          const issueLabel = language === 'id'
            ? (issueKey === 'gibberish' ? 'konten tidak valid/spam'
              : issueKey === 'too_short' ? `terlalu pendek (${section.charCount || 0} karakter, min 30)`
              : issueKey === 'empty' ? 'kosong'
              : issueKey === 'no_words' ? 'tidak ada kata bermakna'
              : 'perlu diperbaiki')
            : (issueKey === 'gibberish' ? 'invalid/spam content'
              : issueKey === 'too_short' ? `too short (${section.charCount || 0} chars, min 30)`
              : issueKey === 'empty' ? 'empty'
              : issueKey === 'no_words' ? 'no meaningful words'
              : 'needs fixing');

          failed.push({ 
            text: `${section.name}: ${issueLabel} → "${section.preview}"`,
            isSubItem: true 
          });
        });
      }
      
      // Show hint
      const hintText = hint || (language === 'id'
        ? 'Lengkapi lirik minimal 30 karakter dengan 3 kata pada section yang bermasalah, atau tambah section Verse/Chorus/Bridge baru'
        : 'Add at least 30 characters with 3 words to problematic sections, or add new Verse/Chorus/Bridge sections');
      failed.push({ text: hintText, isHint: true });
    }
  }
  
  // Arrangement validation
  const arrangement = validationResults.arrangement as Record<string, unknown> | undefined;
  if (arrangement) {
    if (arrangement.passed) {
      const arrangementCount = arrangement.arrangementCount as number || 0;
      passed.push({ 
        text: language === 'id' 
          ? `Arrangement: ${arrangementCount} section dalam arrangement`
          : `Arrangement: ${arrangementCount} sections in arrangement`
      });
    } else {
      const arrangementCount = arrangement.arrangementCount as number || 0;
      const required = arrangement.required as number || 4;
      failed.push({ 
        text: language === 'id' 
          ? `Arrangement: Hanya ${arrangementCount} section di arrangement (minimal ${required} diperlukan)`
          : `Arrangement: Only ${arrangementCount} sections in arrangement (minimum ${required} required)`
      });
    }
  }
  
  // Chords validation
  const chords = validationResults.chords as Record<string, unknown> | undefined;
  if (chords) {
    const details = chords.details as Record<string, unknown> | undefined;
    const sectionsWithChords = details?.sectionsWithChords as number || 0;
    const required = details?.required as number || 3;
    const sectionsWithoutChords = details?.sectionsWithoutChords as Array<{ name: string; preview: string }> || [];
    const sectionsFound = details?.sectionsFound as string[] || [];
    const hint = details?.hint as string || '';
    
    if (chords.passed) {
      passed.push({ 
        text: language === 'id' 
          ? `Chords: ${sectionsWithChords} section memiliki chord (${sectionsFound.join(', ')})`
          : `Chords: ${sectionsWithChords} sections have chords (${sectionsFound.join(', ')})`
      });
    } else {
      failed.push({ 
        text: language === 'id' 
          ? `Chords: Hanya ${sectionsWithChords} dari ${required} section memiliki chord`
          : `Chords: Only ${sectionsWithChords} of ${required} sections have chords`
      });
      
      // Show sections missing chords
      if (sectionsWithoutChords.length > 0) {
        sectionsWithoutChords.slice(0, 5).forEach((section) => {
          failed.push({ 
            text: `${section.name}: "${section.preview}"`, 
            isSubItem: true 
          });
        });
        if (sectionsWithoutChords.length > 5) {
          failed.push({ 
            text: language === 'id' 
              ? `... dan ${sectionsWithoutChords.length - 5} section lainnya`
              : `... and ${sectionsWithoutChords.length - 5} more sections`,
            isSubItem: true 
          });
        }
      }
      
      // Show hint
      const hintText = hint || (language === 'id' 
        ? 'Tambahkan chord (misal: C, Am, G) di atas lirik pada section yang belum ada chord'
        : 'Add chords (e.g., C, Am, G) above lyrics in sections without chords');
      failed.push({ text: hintText, isHint: true });
    }
  }
  
  // Content validation
  const content = validationResults.content as Record<string, unknown> | undefined;
  if (content) {
    if (content.passed) {
      passed.push({ 
        text: language === 'id' 
          ? 'Konten: Tidak ada masalah konten yang terdeteksi'
          : 'Content: No content issues detected'
      });
    } else {
      const violations = content.violations as Array<{ category: string; severity: string; description: string }> || [];
      const summary = content.summary as string || '';
      
      if (violations.length > 0) {
        violations.forEach(v => {
          const categoryLabels: Record<string, { id: string; en: string }> = {
            'sara': { id: 'Konten SARA', en: 'SARA content' },
            'hate_speech': { id: 'Ujaran kebencian', en: 'Hate speech' },
            'sexual_content': { id: 'Konten seksual', en: 'Sexual content' },
            'profanity': { id: 'Kata-kata kasar', en: 'Profanity' },
            'violence': { id: 'Kekerasan', en: 'Violence' },
            'drugs': { id: 'Narkoba', en: 'Drugs' },
          };
          const label = categoryLabels[v.category] || { id: v.category, en: v.category };
          failed.push({ 
            text: language === 'id' 
              ? `Konten: ${label.id} terdeteksi (${v.severity})`
              : `Content: ${label.en} detected (${v.severity})`
          });
        });
      } else if (summary) {
        failed.push({ 
          text: language === 'id' 
            ? `Konten: ${summary}`
            : `Content: ${summary}`
        });
      } else {
        failed.push({ 
          text: language === 'id' 
            ? 'Konten: Terdeteksi kata-kata yang tidak pantas'
            : 'Content: Inappropriate words detected'
        });
      }
    }
  }
  
  return { passed, failed };
};

// Component for the Rejected Status with categorized feedback
interface RejectedStatusContentProps {
  texts: {
    rejectedTitle: string;
    rejectionReason: string;
    nextSteps: string;
    editArrangement: string;
    contactSupport: string;
    validationIssues: string;
  };
  passed: ValidationFeedbackItem[];
  failed: ValidationFeedbackItem[];
  passedLabel: string;
  failedLabel: string;
  showDetailsLabel: string;
  hideDetailsLabel: string;
  reasonText: string;
  stepsArray: string[];
  handleEditArrangement: () => void;
}

const RejectedStatusContent = ({
  texts,
  passed,
  failed,
  passedLabel,
  failedLabel,
  showDetailsLabel,
  hideDetailsLabel,
  reasonText,
  stepsArray,
  handleEditArrangement,
}: RejectedStatusContentProps) => {
  const [isPassedOpen, setIsPassedOpen] = useState(false);

  return (
    <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          {texts.rejectedTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* ===== PASSED SECTION (Green, Collapsible) ===== */}
        {passed.length > 0 && (
          <Collapsible open={isPassedOpen} onOpenChange={setIsPassedOpen}>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full p-3 flex items-center justify-between hover:bg-green-200/50 dark:hover:bg-green-800/30 transition-colors">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {passedLabel} ({passed.length})
                  </h4>
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-sm">
                    {isPassedOpen ? hideDetailsLabel : showDetailsLabel}
                    {isPassedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="space-y-1.5 px-3 pb-3">
                  {passed.map((item, index) => (
                    <li 
                      key={index} 
                      className="text-sm text-green-600 dark:text-green-300 flex items-start gap-2"
                    >
                      <CheckCircle className="h-3 w-3 mt-1 flex-shrink-0" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* ===== FAILED SECTION (Red, Always Visible) ===== */}
        {failed.length > 0 && (
          <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 space-y-2">
            <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {failedLabel}
            </h4>
            <ul className="space-y-2">
              {failed.map((item, index) => (
                <li 
                  key={index} 
                  className={`text-sm flex items-start gap-2 ${
                    item.isHint 
                      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded mt-1' 
                      : item.isSubItem 
                        ? 'text-red-500 dark:text-red-400 pl-5'
                        : 'text-red-600 dark:text-red-300'
                  }`}
                >
                  {item.isHint ? (
                    <>
                      <span className="flex-shrink-0">💡</span>
                      {item.text}
                    </>
                  ) : item.isSubItem ? (
                    <>
                      <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                      {item.text}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {item.text}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rejection Reason (from admin or auto) */}
        <div className="space-y-2">
          <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {texts.rejectionReason}
          </h4>
          <p className="text-sm text-red-600 dark:text-red-300 pl-6">
            {reasonText}
          </p>
        </div>

        {/* Next Steps */}
        <div className="space-y-3 pt-2">
          <h4 className="font-semibold text-red-700 dark:text-red-400">
            {texts.nextSteps}
          </h4>
          <ul className="space-y-1.5 pl-6">
            {stepsArray.map((step, index) => (
              <li key={index} className="text-sm text-red-600 dark:text-red-300 flex items-start gap-2">
                <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-3">
          <Button 
            onClick={handleEditArrangement}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Edit className="h-4 w-4 mr-2" />
            {texts.editArrangement}
          </Button>
          <Button 
            variant="outline" 
            className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
            onClick={() => window.open('mailto:support@arrangely.io?subject=Publication%20Rejection%20Help', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {texts.contactSupport}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PublicationStatusCard = ({
  songId,
  status,
  rejectedReason,
  validationResults,
  isOwner,
  theme,
}: PublicationStatusCardProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  if (!status || !isOwner) return null;

  const handleEditArrangement = () => {
    if (theme === "chord_grid") {
      navigate(`/chord-grid-generator?currentChordGridId=${songId}`);
    } else {
      navigate(`/editor?edit=${songId}`);
    }
  };

  const texts = {
    publishedTitle: language === 'id' ? '🎉 Berhasil Dipublikasikan!' : '🎉 Published Successfully!',
    publishedDesc: language === 'id' 
      ? 'Selamat! Aransemen Anda telah disetujui dan sekarang tersedia di Community Library.'
      : 'Congratulations! Your arrangement has been approved and is now available in the Community Library.',
    reviewTitle: language === 'id' ? '⏳ Dalam Review' : '⏳ Under Review',
    reviewDesc: language === 'id'
      ? 'Aransemen Anda sedang dalam proses review. Biasanya membutuhkan beberapa menit.'
      : 'Your arrangement is currently being reviewed. This usually takes a few hours.',
    rejectedTitle: language === 'id' ? 'Publikasi Ditolak' : 'Publication Rejected',
    rejectionReason: language === 'id' ? 'Alasan Penolakan:' : 'Rejection Reason:',
    validationIssues: language === 'id' ? 'Masalah yang Ditemukan:' : 'Issues Found:',
    nextSteps: language === 'id' ? 'Langkah Selanjutnya:' : 'Next Steps:',
    editArrangement: language === 'id' ? 'Edit Aransemen' : 'Edit Arrangement',
    contactSupport: language === 'id' ? 'Hubungi Support' : 'Contact Support',
  };

  if (status === 'active' || status === 'approved') {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">
          {texts.publishedTitle}
        </AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-300">
          <p>{texts.publishedDesc}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'pending_review') {
    return (
      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <Clock className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-yellow-700 dark:text-yellow-400">
          {texts.reviewTitle}
        </AlertTitle>
        <AlertDescription className="text-yellow-600 dark:text-yellow-300">
          <p>{texts.reviewDesc}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'rejected') {
    const readableReason = getReadableRejectionReason(rejectedReason);
    const nextSteps = getNextStepsForRejection(rejectedReason);
    const reasonText = language === 'id' ? readableReason.id : readableReason.en;
    const stepsArray = language === 'id' ? nextSteps.id : nextSteps.en;
    
    // Get categorized validation feedback
    const { passed, failed } = getCategorizedValidation(validationResults, language);

    const passedLabel = language === 'id' ? 'Yang Sudah Baik' : "What's Working";
    const failedLabel = language === 'id' ? 'Yang Perlu Diperbaiki' : 'What Needs Fixing';
    const showDetailsLabel = language === 'id' ? 'Lihat Detail' : 'Show Details';
    const hideDetailsLabel = language === 'id' ? 'Sembunyikan' : 'Hide';

    return (
      <RejectedStatusContent
        texts={texts}
        passed={passed}
        failed={failed}
        passedLabel={passedLabel}
        failedLabel={failedLabel}
        showDetailsLabel={showDetailsLabel}
        hideDetailsLabel={hideDetailsLabel}
        reasonText={reasonText}
        stepsArray={stepsArray}
        handleEditArrangement={handleEditArrangement}
      />
    );
  }

  return null;
};

export default PublicationStatusCard;
