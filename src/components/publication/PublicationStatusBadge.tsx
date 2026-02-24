import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type PublicationStatus = 'pending_review' | 'approved' | 'rejected' | 'active' | 'archived' | null;

interface PublicationStatusBadgeProps {
  status: PublicationStatus;
  rejectedReason?: string | null;
  showTooltip?: boolean;
  size?: 'sm' | 'default';
}

const getStatusConfig = (status: PublicationStatus, language: 'en' | 'id' = 'en') => {
  const labels = {
    approved: { en: 'Approved', id: 'Disetujui' },
    rejected: { en: 'Rejected', id: 'Ditolak' },
    pending_review: { en: 'Pending Review', id: 'Dalam Review' },
    archived: { en: 'Archived', id: 'Diarsipkan' },
  };

  switch (status) {
    case 'active':
    case 'approved':
      return {
        label: labels.approved[language],
        variant: 'default' as const,
        className: 'bg-green-500 hover:bg-green-600 text-white',
        icon: CheckCircle,
      };
    case 'rejected':
      return {
        label: labels.rejected[language],
        variant: 'destructive' as const,
        className: 'bg-red-500 hover:bg-red-600 text-white',
        icon: XCircle,
      };
    case 'pending_review':
      return {
        label: labels.pending_review[language],
        variant: 'secondary' as const,
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        icon: Clock,
      };
    case 'archived':
      return {
        label: labels.archived[language],
        variant: 'outline' as const,
        className: 'bg-muted text-muted-foreground',
        icon: AlertCircle,
      };
    default:
      return null;
  }
};

export const getReadableRejectionReason = (reason: string | null | undefined): { id: string; en: string } => {
  if (!reason) {
    return {
      id: 'Tidak ada alasan yang diberikan.',
      en: 'No reason provided.',
    };
  }

  const reasonMappings: Record<string, { id: string; en: string }> = {
    'invalid_youtube': {
      id: 'Link YouTube tidak valid atau tidak dapat diakses. Pastikan video berstatus publik dan dalam kategori "Music".',
      en: 'YouTube link is invalid or inaccessible. Make sure the video is public and in the "Music" category.',
    },
    'wrong_youtube_category': {
      id: 'Video YouTube harus dalam kategori "Music". Video Anda saat ini berada di kategori yang berbeda.',
      en: 'YouTube video must be in the "Music" category. Your video is currently in a different category.',
    },
    'incomplete_sections': {
      id: 'Aransemen Anda membutuhkan minimal 3 section (misalnya: Intro, Verse, Chorus). Silakan tambahkan lebih banyak section.',
      en: 'Your arrangement needs at least 3 sections (e.g., Intro, Verse, Chorus). Please add more sections.',
    },
    'invalid_chords': {
      id: 'Coverage chord dalam aransemen Anda kurang dari 50%. Pastikan sebagian besar section memiliki chord.',
      en: 'Chord coverage in your arrangement is below 50%. Make sure most sections have chords.',
    },
    'content_violation': {
      id: 'Konten terdeteksi mengandung materi yang tidak sesuai (SARA, kata-kata kasar, atau konten dewasa). Harap revisi konten Anda.',
      en: 'Content detected containing inappropriate material (hate speech, profanity, or adult content). Please revise your content.',
    },
    'duplicate_content': {
      id: 'Aransemen ini terdeteksi duplikat dengan konten yang sudah ada. Pastikan aransemen Anda original.',
      en: 'This arrangement is detected as duplicate of existing content. Make sure your arrangement is original.',
    },
    'low_quality': {
      id: 'Aransemen ini tidak memenuhi standar kualitas kami. Pastikan chord lengkap, section terstruktur dengan baik, dan informasi akurat.',
      en: 'This arrangement does not meet our quality standards. Ensure chords are complete, sections are well-structured, and information is accurate.',
    },
    'copyright_issue': {
      id: 'Aransemen ini berpotensi melanggar hak cipta. Pastikan Anda memiliki hak untuk menggunakan lagu ini.',
      en: 'This arrangement potentially infringes copyright. Make sure you have the rights to use this song.',
    },
  };

  // Check for exact match first
  if (reasonMappings[reason]) {
    return reasonMappings[reason];
  }

  // Check if reason contains a known key (format: "key: details")
  for (const [key, value] of Object.entries(reasonMappings)) {
    if (reason.startsWith(key + ':')) {
      const additionalDetails = reason.substring(key.length + 1).trim();
      return {
        id: `${value.id}\n\nDetail tambahan: ${additionalDetails}`,
        en: `${value.en}\n\nAdditional details: ${additionalDetails}`,
      };
    }
    if (reason.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Return the raw reason if no mapping found (for custom "other" reasons)
  return {
    id: reason,
    en: reason,
  };
};

export const PublicationStatusBadge = ({
  status,
  rejectedReason,
  showTooltip = true,
  size = 'default',
}: PublicationStatusBadgeProps) => {
  const { language } = useLanguage();
  const config = getStatusConfig(status, language);
  
  if (!config) return null;

  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs';

  const badge = (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${textSize} gap-1 cursor-default`}
    >
      <Icon className={iconSize} />
      {config.label}
    </Badge>
  );

  if (showTooltip && status === 'rejected' && rejectedReason) {
    const readableReason = getReadableRejectionReason(rejectedReason);
    const reasonText = language === 'id' ? readableReason.id : readableReason.en;
    const reasonLabel = language === 'id' ? 'Alasan Penolakan:' : 'Rejection Reason:';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm font-medium mb-1">{reasonLabel}</p>
            <p className="text-xs text-muted-foreground">{reasonText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

export default PublicationStatusBadge;
